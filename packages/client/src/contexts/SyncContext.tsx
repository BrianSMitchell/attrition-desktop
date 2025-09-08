import * as React from "react";
import { useNetwork } from "./NetworkContext";

export type SyncState = "idle" | "syncing" | "error";

export interface SyncStatus {
  state: SyncState;
  queuedCount: number;
  lastRunAt?: number;
  lastDurationMs?: number;
  lastError?: string;
}

interface SyncContextType {
  status: SyncStatus;
}

const SyncContext = React.createContext<SyncContextType | undefined>(undefined);

export const useSync = (): SyncContextType => {
  const ctx = React.useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return ctx;
};

interface SyncProviderProps {
  children: React.ReactNode;
  pollMs?: number;
}

function getIsDesktop(): boolean {
  return typeof window !== "undefined" && !!(window as any).desktop;
}

/**
 * Determine sync state from queued items, network state, and recent perf metrics.
 * Priority: error > syncing > idle
 */
function computeState(params: {
  queuedCount: number;
  isFullyConnected: boolean;
  recentError?: string | undefined;
}): SyncState {
  if (params.recentError) return "error";
  if (params.queuedCount > 0 && params.isFullyConnected) return "syncing";
  return "idle";
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children, pollMs = 5000 }) => {
  const { isFullyConnected } = useNetwork();

  const [status, setStatus] = React.useState<SyncStatus>({
    state: "idle",
    queuedCount: 0,
  });

  // Poll desktop IPC for queue count and recent perf errors when running in Electron
  React.useEffect(() => {
    let timer: number | undefined;

    const tick = async () => {
      try {
        const isDesktop = getIsDesktop();
        let queuedCount = 0;
        let recentError: string | undefined;
        let lastRunAt: number | undefined;
        let lastDurationMs: number | undefined;

        if (isDesktop) {
          // 1) Pending queue count
          try {
            const resp = await (window as any).desktop?.db?.events?.getPendingCount?.(null);
            if (resp && resp.success) {
              queuedCount = typeof resp.count === "number" ? resp.count : 0;
            }
          } catch {
            // ignore and keep queuedCount = 0
          }

          // 2) Recent performance metrics (lookback ~1 hour, then filter to last 2 minutes)
          try {
            const perf = await (window as any).desktop?.perf?.getMetrics?.(1);
            if (perf && perf.success && Array.isArray(perf.data)) {
              const metrics: Array<any> = perf.data;

              // Find the latest flush/boot completion metric
              const interesting = metrics
                .filter((m) =>
                  m &&
                  typeof m === "object" &&
                  (m.operation === "flush_cycle_complete" || m.operation === "bootstrap_complete")
                )
                .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));

              if (interesting.length > 0) {
                const latest = interesting[0];
                lastRunAt = typeof latest.timestamp === "number"
                  ? latest.timestamp
                  : (latest.timestamp ? new Date(latest.timestamp).getTime() : undefined);
                lastDurationMs = typeof latest.durationMs === "number" ? latest.durationMs : undefined;

                // Consider an error "recent" if within the last 2 minutes
                const now = Date.now();
                const windowMs = 2 * 60 * 1000;
                const withinWindow = lastRunAt ? (now - lastRunAt) <= windowMs : false;

                if (withinWindow && latest.success === false) {
                  recentError = latest.error || "sync_failed";
                }
              }
            }
          } catch {
            // ignore perf errors; we can still show queued count
          }
        }

        const nextState = computeState({ queuedCount, isFullyConnected, recentError });
        setStatus({
          state: nextState,
          queuedCount,
          lastRunAt,
          lastDurationMs,
          lastError: recentError,
        });
      } catch {
        // On any exception, keep previous status but don't crash provider
      } finally {
        timer = window.setTimeout(tick, pollMs);
      }
    };

    // Start polling
    tick();

    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [isFullyConnected, pollMs]);

  const value: SyncContextType = React.useMemo(() => ({ status }), [status]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};
