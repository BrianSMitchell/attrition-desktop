import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { ENV_VALUES } from '@shared/constants/configuration-keys';

/**
 * DEV-only Axios metrics instrumentation.
 * - Logs bursts of identical requests within a short window.
 * - Counts in-flight per URL.
 * - No-ops in production.
 */

type Counters = {
  inflight: number;
  recentTimestamps: number[]; // unix ms
};

const registry: Record<string, Counters> = {};
const WINDOW_MS = 2000; // burst window
const BURST_THRESHOLD = 5;

function getKey(config: AxiosRequestConfig): string {
  const method = (config.method || "get").toUpperCase();
  const url = config.baseURL ? `${config.baseURL}${config.url}` : config.url || "";
  return `${method} ${url}`;
}

function pruneOld(timestamps: number[], now: number) {
  while (timestamps.length > 0 && now - timestamps[0] > WINDOW_MS) {
    timestamps.shift();
  }
}

export function attachMetrics(api: AxiosInstance, name: string) {
  // Jest/Node-safe dev check (avoid import.meta which breaks CJS parsing)
  const isProd =
    (typeof process !== "undefined" && (process as any)?.env?.NODE_ENV === ENV_VALUES.PRODUCTION) || false;
  if (isProd) {
    // Only instrument in dev
    return;
  }

  // Attach once per instance
  const anyApi = api as any;
  if (anyApi.__metricsAttached) return;
  anyApi.__metricsAttached = true;

  api.interceptors.request.use((config) => {
    const key = getKey(config);
    const now = Date.now();

    if (!registry[key]) {
      registry[key] = { inflight: 0, recentTimestamps: [] };
    }
    const entry = registry[key];
    entry.inflight += 1;
    entry.recentTimestamps.push(now);
    pruneOld(entry.recentTimestamps, now);

    if (entry.recentTimestamps.length >= BURST_THRESHOLD) {
      // eslint-disable-next-line no-console
      console.warn(
        `[http-metrics:${name}] Burst detected: ${entry.recentTimestamps.length} requests in ${WINDOW_MS}ms for ${key}`
      );
    }

    // eslint-disable-next-line no-console
    console.debug(`[http-metrics:${name}] > start (${entry.inflight} inflight) ${key}`);
    return config;
  });

  api.interceptors.response.use(
    (response: AxiosResponse) => {
      const key = getKey(response.config);
      const entry = registry[key];
      if (entry) {
        entry.inflight = Math.max(0, entry.inflight - 1);
        // eslint-disable-next-line no-console
        console.debug(`[http-metrics:${name}] < ok (${entry.inflight} inflight) ${key} [${response.status}]`);
      }
      return response;
    },
    (error) => {
      try {
        const cfg: AxiosRequestConfig | undefined = error?.config;
        if (cfg) {
          const key = getKey(cfg);
          const entry = registry[key];
          if (entry) {
            entry.inflight = Math.max(0, entry.inflight - 1);
            const status = error?.response?.status ?? "ERR";
            // eslint-disable-next-line no-console
            console.debug(`[http-metrics:${name}] < err (${entry.inflight} inflight) ${key} [${status}]`);
          }
        }
      } catch {
        // ignore
      }
      return Promise.reject(error);
    }
  );
}
