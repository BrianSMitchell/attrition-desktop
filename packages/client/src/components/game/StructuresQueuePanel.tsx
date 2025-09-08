import * as React from "react";
import { getBuildingSpec, type BuildingKey } from "@game/shared";
import structuresService from "../../services/structuresService";

interface StructureQueueItem {
  _id?: string;
  locationCoord: string;
  catalogKey?: BuildingKey | string;
  displayName?: string;
  constructionStarted?: string | Date | null;
  constructionCompleted?: string | Date | null;
  pendingUpgrade?: boolean;
  isActive?: boolean; // should be false for queued
}

interface StructuresQueuePanelProps {
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

const resolveName = (item: StructureQueueItem) => {
  const key = (item.catalogKey || "") as BuildingKey | string;
  if (key) {
    try {
      return getBuildingSpec(key as BuildingKey).name;
    } catch {
      // fall through
    }
  }
  return item.displayName || String(key || "Unknown Structure");
};

const StructuresQueuePanel: React.FC<StructuresQueuePanelProps> = ({ baseCoord, onChanged }) => {
  const [queue, setQueue] = React.useState<StructureQueueItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);
  const [cancelingId, setCancelingId] = React.useState<string | null>(null);

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await structuresService.getQueue(baseCoord);
      if (res.success) {
        setQueue(res.data?.queue || []);
      } else {
        setError((res as any).error || "Failed to load construction queue");
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "Network error while loading construction queue");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchQueue();
    const id = window.setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseCoord]);

  const underway = React.useMemo(
    () => queue.filter((q) => !!q.constructionCompleted),
    [queue, tick]
  );
  const waiting = React.useMemo(
    () => queue.filter((q) => !q.constructionCompleted),
    [queue, tick]
  );

  const handleCancel = async (id?: string) => {
    if (!id) return;
    const yes = window.confirm("Cancel this construction item?");
    if (!yes) return;

    try {
      setCancelingId(id);
      const res = await structuresService.cancelQueueItem(id);
      if (!res.success) {
        setError((res as any).error || res.message || "Failed to cancel queue item");
        return;
      }
      // Show refunded amount (if provided)
      const refunded = Number(res.data?.refundedCredits || 0);
      if (refunded > 0) {
        setSuccess(`Cancelled. Refunded ${refunded.toLocaleString()} credits.`);
        // auto-clear after a short delay
        window.setTimeout(() => setSuccess(null), 4000);
      } else {
        setSuccess("Construction queue item cancelled.");
        window.setTimeout(() => setSuccess(null), 3000);
      }
      // Refresh list
      await fetchQueue();
      // Notify parent to refresh budgets/status where needed
      if (onChanged) {
        await onChanged();
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "Network error while cancelling");
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="game-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-empire-gold">Construction Queue</h3>
        <button
          onClick={fetchQueue}
          className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 mb-3">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-900/40 border border-green-700 rounded-md text-green-200 mb-3">
          {success}
        </div>
      )}

      {queue.length === 0 && !loading ? (
        <div className="p-4 bg-gray-700 rounded-lg border border-gray-600 text-gray-300">
          No structures queued for construction.
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
              <div className="space-y-3">
                {underway.map((item) => {
                  const name = resolveName(item);
                  const started = item.constructionStarted ? new Date(item.constructionStarted).getTime() : Date.now();
                  const completes = new Date(item.constructionCompleted as any).getTime();
                  const now = Date.now();
                  const percent = percentBetween(started, completes, now);
                  const eta = formatEta(completes - now);
                  // If this item is scheduled to start later, surface the wait time explicitly.
                  const startsInMs =
                    Number.isFinite(started) && started > now ? Math.max(0, started - now) : 0;

                  return (
                    <div
                      key={item._id || `${item.catalogKey}-${item.locationCoord}-${item.constructionStarted}`}
                      className="p-4 bg-gray-700 rounded-lg border border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-white flex items-center gap-2">
                          {name}
                          {item.catalogKey && (
                            <span className="text-xs text-gray-400">({String(item.catalogKey)})</span>
                          )}
                          {item.pendingUpgrade ? (
                            <span className="text-xs text-yellow-300 ml-2">(Upgrade)</span>
                          ) : (
                            <span className="text-xs text-blue-300 ml-2">(New)</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-gray-800 text-blue-300">
                            {item.locationCoord}
                          </span>
                          <button
                            onClick={() => handleCancel(item._id)}
                            className="text-xs px-2 py-1 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
                            disabled={cancelingId === item._id}
                            title="Cancel this construction item"
                          >
                            {cancelingId === item._id ? "Cancelling..." : "Cancel"}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                          />
                        </div>

                        {startsInMs > 0 && (
                          <div className="text-xs text-gray-400">
                            Starts in: {formatEta(startsInMs)}
                          </div>
                        )}

                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{percent.toFixed(1)}% complete</span>
                          <span>ETA: {eta}</span>
                        </div>

                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            Started:{" "}
                            {item.constructionStarted
                              ? new Date(item.constructionStarted).toLocaleString()
                              : "—"}
                          </span>
                          <span>Completes: {new Date(item.constructionCompleted as any).toLocaleString()}</span>
                        </div>
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
                  const name = resolveName(item);
                  return (
                    <div
                      key={item._id || `${item.catalogKey}-${item.locationCoord}-${item.constructionStarted}-waiting`}
                      className="flex items-center justify-between p-3 bg-gray-800/60 border border-gray-700 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-5 text-right">{idx + 1}.</span>
                        <div className="text-white">
                          {name}{" "}
                          {item.catalogKey && (
                            <span className="text-xs text-gray-400">({String(item.catalogKey)})</span>
                          )}
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-gray-900 text-blue-300">
                          {item.locationCoord}
                        </span>
                        <span className="text-xs text-gray-400">(Queued)</span>
                        {item.pendingUpgrade ? (
                          <span className="text-xs text-yellow-300 ml-1">(Upgrade)</span>
                        ) : null}
                      </div>
                      <button
                        onClick={() => handleCancel(item._id)}
                        className="text-xs px-2 py-1 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
                        disabled={cancelingId === item._id}
                        title="Cancel this queued item"
                      >
                        {cancelingId === item._id ? "Cancelling..." : "Cancel"}
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

export default StructuresQueuePanel;
