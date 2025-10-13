import { UniverseRegionSystemsData } from './universeService';

import { TIMEOUTS } from '@shared/constants/magic-numbers';
type Task = {
  server: string;
  galaxy: number;
  region: number;
  key: string; // `${server}${galaxy}:${region}`
  priority?: boolean;
};

type SetRegionDataFn = (key: string, data: { systemsWithStars: number[]; starColors?: Record<number, string> }) => void;

import { getCurrentApiConfig } from '../utils/apiConfig';
const getApiBaseUrl = () => getCurrentApiConfig().apiUrl;

function getAuthHeader(): Record<string, string> {
  try {
    const tokenStr = localStorage.getItem('auth-storage');
    if (!tokenStr) return {};
    const parsed = JSON.parse(tokenStr);
    const token = parsed?.state?.token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {
    // ignore
  }
  return {};
}

export class RegionSummaryQueue {
  private queue: Task[] = [];
  private inFlight = new Set<string>();
  private running = false;
  private pausedUntil = 0;
  private backoffMs = 0;
  private destroyed = false;

  constructor(private setRegionData: SetRegionDataFn) {}

  destroy() {
    this.destroyed = true;
    this.queue = [];
    this.inFlight.clear();
  }

  enqueue(task: Task) {
    if (this.destroyed) return;

    // Deduplicate: skip if already in-flight or queued
    if (this.inFlight.has(task.key)) return;
    if (this.queue.find((t) => t.key === task.key)) return;

    if (task.priority) {
      this.queue.unshift(task);
    } else {
      this.queue.push(task);
    }

    this.run();
  }

  private async run() {
    if (this.running || this.destroyed) return;
    this.running = true;

    try {
      while (!this.destroyed && this.queue.length > 0) {
        const now = Date.now();
        if (now < this.pausedUntil) {
          await this.sleep(this.pausedUntil - now);
          continue;
        }

        const task = this.queue.shift()!;
        if (this.inFlight.has(task.key)) {
          // Already being processed
          continue;
        }
        this.inFlight.add(task.key);

        try {
          const { systemsWithStars, starColors } = await this.fetchRegionSystems(task.server, task.galaxy, task.region);
          this.setRegionData(task.key, { systemsWithStars, starColors });
          // Success clears backoff
          this.backoffMs = 0;
          // Gentle pacing between requests
          await this.sleep(TIMEOUTS.ULTRA_SHORT + 50);
        } catch (e: any) {
          const isRateLimit = e?.__rateLimit === true;
          const retryMs = typeof e?.__retryMs === 'number' ? e.__retryMs : 0;

          if (isRateLimit) {
            // Exponential backoff if server didn't specify Retry-After
            this.backoffMs = this.backoffMs ? Math.min(this.backoffMs * 2, 8000) : 1000;
            const pause = Math.max(this.backoffMs, retryMs);
            this.pausedUntil = Date.now() + pause;

            // Requeue the task at the front to retry after pause
            this.queue.unshift(task);
            if (import.meta.env.DEV) {
              // eslint-disable-next-line no-console
              console.info(`[RegionSummaryQueue] 429 detected. Pausing for ${pause}ms. Queue len=${this.queue.length}`);
            }
          } else {
            // Non-429 failure: mark as empty to avoid tight loops, and continue
            this.setRegionData(task.key, { systemsWithStars: [] });
            // Gentle pacing even on errors
            await this.sleep(TIMEOUTS.ULTRA_SHORT + 50);
          }
        } finally {
          this.inFlight.delete(task.key);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async fetchRegionSystems(server: string, galaxy: number, region: number): Promise<{ systemsWithStars: number[]; starColors: Record<number, string> }> {
    const base = getApiBaseUrl();
    const url = `${base}/universe/region/${encodeURIComponent(server)}/${galaxy}/${region}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...getAuthHeader(),
    };

    const res = await fetch(url, { method: 'GET', headers });

    if (res.status === 429) {
      // Respect Retry-After if present
      const retryAfter = res.headers.get('Retry-After');
      const retrySec = retryAfter ? parseInt(retryAfter, 10) : NaN;
      const retryMs = Number.isFinite(retrySec) ? retrySec * 1000 : 0;

      const err: any = new Error('Rate limited');
      err.__rateLimit = true;
      err.__retryMs = retryMs;
      throw err;
    }

    if (!res.ok) {
      // Other HTTP error
      throw new Error(`HTTP ${res.status}`);
    }

    // Expect ApiResponse<UniverseRegionSystemsData>
    let json: any;
    try {
      json = (await res.json()) as { success: boolean; data?: UniverseRegionSystemsData; error?: string };
    } catch {
      // Malformed response
      throw new Error('Invalid JSON');
    }

    if (!json || json.success !== true || !json.data) {
      // Treat as transient failure; queue logic will set empty summary
      throw new Error(json?.error || 'Request failed');
    }

    const systems = Array.isArray(json.data.systems) ? json.data.systems : [];

    // Build list and color map
    const starColors: Record<number, string> = {};
    const systemsWithStars = systems
      .filter((s: any) => {
        if (!!s?.star?.color) {
          starColors[s.system] = s.star.color;
        }
        return !!s && s.star;
      })
      .map((s: any) => s.system);

    return { systemsWithStars, starColors };
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default RegionSummaryQueue;
