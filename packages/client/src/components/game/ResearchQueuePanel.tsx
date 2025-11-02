import * as React from "react";
import { getTechSpec, type TechnologyKey } from "@game/shared";
import { useEnhancedAppStore } from "../../stores/enhancedAppStore";

import { TIMEOUTS } from '@game/shared';
interface TechQueueItem {
  _id?: string;
  id?: string; // API might return 'id' instead of '_id'
  locationCoord?: string;
  location_coord?: string; // API returns snake_case
  techKey?: TechnologyKey;
  tech_key?: TechnologyKey; // API returns snake_case
  startedAt?: string | Date;
  started_at?: string | Date; // API returns snake_case
  completesAt?: string | Date | null;
  completes_at?: string | Date | null; // API returns snake_case
  status: "pending" | "completed" | "cancelled";
}

interface ResearchQueuePanelProps {
  baseCoord?: string; // optional: filter by base; if omitted, show all pending for empire
  onChanged?: () => void | Promise<void>; // notify parent to refresh credits/status/etc
}

const formatEta = (msRemaining: number) => {
  if (msRemaining <= 0) return "Completing now";
  const totalSeconds = Math.ceil(msRemaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.ceil((totalSeconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
};

const percentBetween = (start: number, end: number, now: number) => {
  const total = end - start;
  if (total <= 0) return 100;
  const elapsed = now - start;
  return Math.max(0, Math.min(100, (elapsed / total) * 100));
};

const ResearchQueuePanel: React.FC<ResearchQueuePanelProps> = ({ baseCoord, onChanged }) => {
  const [queue, setQueue] = React.useState<TechQueueItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);
  const [cancelingId, setCancelingId] = React.useState<string | null>(null);

  // Enhanced store access for API calls
  const services = useEnhancedAppStore((state) => state.services);
  const gameApi = services?.gameApi;
  const [compact, setCompact] = React.useState<boolean>(() => {
    try {
      return localStorage.getItem('rq.compact') !== 'false';
    } catch {
      return true;
    }
  });

  const fetchQueue = async () => {
    if (!gameApi.getResearchQueue) {
      setError('Research queue API not available');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await gameApi.getResearchQueue(baseCoord);
      if (res.success) {
        setQueue(res.data || []);
      } else {
        setError(res.error || "Failed to load research queue");
      }
    } catch (e: any) {
      setError("Network error while loading research queue");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchQueue();
    // Update progress bars every 30 seconds
    const tickId = window.setInterval(() => setTick((t) => t + 1), TIMEOUTS.THIRTY_SECONDS);
    // Fetch fresh data every 60 seconds for real-time updates
    const fetchId = window.setInterval(() => {
      fetchQueue();
    }, TIMEOUTS.ONE_MINUTE);
    return () => {
      clearInterval(tickId);
      clearInterval(fetchId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCoord]);

  React.useEffect(() => {
    try {
      localStorage.setItem('rq.compact', compact ? 'true' : 'false');
    } catch {}
  }, [compact]);

  const underway = React.useMemo(
    () => queue.filter((q) => q.status === "pending" && !!(q.completesAt || q.completes_at)),
    [queue, tick]
  );
  const waiting = React.useMemo(
    () => queue.filter((q) => q.status === "pending" && !(q.completesAt || q.completes_at)),
    [queue, tick]
  );

  const handleCancel = async (id?: string) => {
    if (!id || !gameApi.cancelResearch) return;
    const yes = window.confirm("Cancel this research item?");
    if (!yes) return;

    try {
      setCancelingId(id);
      const res = await gameApi.cancelResearch(id);
      if (!res.success) {
        setError(res.error || "Failed to cancel queue item");
        return;
      }
      // Refresh list
      await fetchQueue();
      // Notify parent to refresh budgets/status where needed
      if (onChanged) {
        await onChanged();
      }
    } catch (e: any) {
      setError("Network error while cancelling");
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="game-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-empire-gold">Research Queue</h3>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-gray-300 select-none" title="Use a condensed layout to show more items at once">
            <input
              type="checkbox"
              className="accent-purple-500"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
            />
            Compact
          </label>
          <button
            onClick={fetchQueue}
            className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 mb-3">
          {error}
        </div>
      )}

      {queue.length === 0 && !loading ? (
        <div className="p-4 bg-gray-700 rounded-lg border border-gray-600 text-gray-300">
          No technology research queued.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Underway (scheduled) */}
          <div>
            <div className="text-sm text-gray-300 mb-2">Underway</div>
            {underway.length === 0 ? (
              <div className="p-3 bg-gray-800/60 border border-gray-700 rounded text-gray-400">
                None currently underway.
              </div>
            ) : (
              <div className={compact ? "space-y-1" : "space-y-3"}>
                {underway.map((item) => {
                  // Add null safety for tech spec - handle both camelCase and snake_case keys
                  const techKey = item.techKey || item.tech_key;
                  if (!techKey) {
                    console.error('[ResearchQueuePanel] Invalid queue item (no tech_key):', item);
                    return null;
                  }
                  const spec = getTechSpec(techKey);
                  if (!spec) {
                    console.error('[ResearchQueuePanel] Tech spec not found for:', techKey);
                    return null;
                  }
                  const startedAt = item.startedAt || item.started_at;
                  const completesAt = item.completesAt || item.completes_at;
                  const started = new Date(startedAt as any).getTime();
                  const completes = new Date(completesAt as any).getTime();
                  const now = Date.now();
                  const percent = percentBetween(started, completes, now);
                  const eta = formatEta(completes - now);

                  const itemId = item._id || item.id;
                  const locationCoord = item.locationCoord || item.location_coord;
                  
                  return (
                    <div
                      key={itemId || `${techKey}-${locationCoord}-${startedAt}`}
                      className={`${compact ? 'p-2' : 'p-4'} bg-gray-700 rounded-lg border border-gray-600`}
                    >
                      <div className={"flex items-center justify-between " + (compact ? "mb-1" : "mb-2")}>
                        <div className="font-medium text-white flex items-center gap-2">
                          {spec.name} <span className="text-xs text-gray-400">({techKey})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-gray-800 text-purple-300">
                            {locationCoord}
                          </span>
                          <button
                            onClick={() => handleCancel(itemId)}
                            className="text-xs px-2 py-1 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
                            disabled={cancelingId === itemId}
                            title="Cancel this research item"
                          >
                            {cancelingId === itemId ? "Cancelling..." : "Cancel"}
                          </button>
                        </div>
                      </div>

{!compact && spec.description && (
                        <p className="text-sm text-gray-400 mb-3">{spec.description}</p>
                      )}

                      <div className={compact ? "space-y-1" : "space-y-2"}>
<div className={`w-full bg-gray-600 rounded-full ${compact ? 'h-1' : 'h-2'}`}>
                          <div
className={`bg-purple-600 ${compact ? 'h-1' : 'h-2'} rounded-full transition-all duration-300`}
                            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{percent.toFixed(1)}% complete</span>
                          <span>ETA: {eta}</span>
                        </div>

{!compact && (
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Started: {new Date(startedAt as any).toLocaleString()}</span>
                            <span>Completes: {new Date(completesAt as any).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Waiting (unscheduled) */}
          <div>
            <div className="text-sm text-gray-300 mb-2">Waiting</div>
            {waiting.length === 0 ? (
              <div className="p-3 bg-gray-800/60 border border-gray-700 rounded text-gray-400">
                No queued items waiting for credits/capacity.
              </div>
            ) : (
              <div className="space-y-2">
                {waiting.map((item, idx) => {
                  // Add null safety for tech spec - handle both camelCase and snake_case keys
                  const techKey = item.techKey || item.tech_key;
                  if (!techKey) {
                    console.error('[ResearchQueuePanel] Invalid waiting item (no tech_key):', item);
                    return null;
                  }
                  const spec = getTechSpec(techKey);
                  if (!spec) {
                    console.error('[ResearchQueuePanel] Tech spec not found for waiting item:', techKey);
                    return null;
                  }
                  const itemId = item._id || item.id;
                  const locationCoord = item.locationCoord || item.location_coord;
                  return (
                    <div
                      key={itemId || `${techKey}-${locationCoord}-waiting-${idx}`}
className={`flex items-center justify-between ${compact ? 'p-2' : 'p-3'} bg-gray-800/60 border border-gray-700 rounded`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-5 text-right">{idx + 1}.</span>
                        <div className="text-white">
                          {spec.name} <span className="text-xs text-gray-400">({techKey})</span>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-gray-900 text-purple-300">
                          {locationCoord}
                        </span>
                        <span className="text-xs text-gray-400">(Queued)</span>
                      </div>
                      <button
                        onClick={() => handleCancel(itemId)}
                        className="text-xs px-2 py-1 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
                        disabled={cancelingId === itemId}
                        title="Cancel this queued item"
                      >
                        {cancelingId === itemId ? "Cancelling..." : "Cancel"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchQueuePanel;
