import * as React from "react";
import { getTechSpec, type TechnologyKey } from "@game/shared";
import techService from "../../services/techService";

interface TechQueueItem {
  _id?: string;
  locationCoord: string;
  techKey: TechnologyKey;
  startedAt: string | Date;
  completesAt?: string | Date | null;
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

  const fetchQueue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await techService.getQueue(baseCoord);
      if (res.success) {
        setQueue(res.data?.queue || []);
      } else {
        setError(res.error || "Failed to load research queue");
      }
    } catch (e: any) {
      setError(e?.response?.data?.error || "Network error while loading research queue");
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
    () => queue.filter((q) => q.status === "pending" && !!q.completesAt),
    [queue, tick]
  );
  const waiting = React.useMemo(
    () => queue.filter((q) => q.status === "pending" && !q.completesAt),
    [queue, tick]
  );

  const handleCancel = async (id?: string) => {
    if (!id) return;
    const yes = window.confirm("Cancel this research item?");
    if (!yes) return;

    try {
      setCancelingId(id);
      const res = await techService.cancelQueueItem(id);
      if (!res.success) {
        setError(res.error || res.message || "Failed to cancel queue item");
        return;
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
        <h3 className="text-lg font-semibold text-empire-gold">Research Queue</h3>
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
              <div className="space-y-3">
                {underway.map((item) => {
                  const spec = getTechSpec(item.techKey);
                  const started = new Date(item.startedAt).getTime();
                  const completes = new Date(item.completesAt as any).getTime();
                  const now = Date.now();
                  const percent = percentBetween(started, completes, now);
                  const eta = formatEta(completes - now);

                  return (
                    <div
                      key={item._id || `${item.techKey}-${item.locationCoord}-${item.startedAt}`}
                      className="p-4 bg-gray-700 rounded-lg border border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium text-white flex items-center gap-2">
                          {spec.name} <span className="text-xs text-gray-400">({item.techKey})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-1 rounded bg-gray-800 text-purple-300">
                            {item.locationCoord}
                          </span>
                          <button
                            onClick={() => handleCancel(item._id)}
                            className="text-xs px-2 py-1 bg-red-700 text-white rounded hover:bg-red-800 disabled:opacity-50"
                            disabled={cancelingId === item._id}
                            title="Cancel this research item"
                          >
                            {cancelingId === item._id ? "Cancelling..." : "Cancel"}
                          </button>
                        </div>
                      </div>

                      {spec.description && (
                        <p className="text-sm text-gray-400 mb-3">{spec.description}</p>
                      )}

                      <div className="space-y-2">
                        <div className="w-full bg-gray-600 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
                          />
                        </div>

                        <div className="flex justify-between text-xs text-gray-400">
                          <span>{percent.toFixed(1)}% complete</span>
                          <span>ETA: {eta}</span>
                        </div>

                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Started: {new Date(item.startedAt).toLocaleString()}</span>
                          <span>Completes: {new Date(item.completesAt as any).toLocaleString()}</span>
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
                  const spec = getTechSpec(item.techKey);
                  return (
                    <div
                      key={item._id || `${item.techKey}-${item.locationCoord}-${item.startedAt}-waiting`}
                      className="flex items-center justify-between p-3 bg-gray-800/60 border border-gray-700 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-5 text-right">{idx + 1}.</span>
                        <div className="text-white">
                          {spec.name} <span className="text-xs text-gray-400">({item.techKey})</span>
                        </div>
                        <span className="text-xs px-2 py-1 rounded bg-gray-900 text-purple-300">
                          {item.locationCoord}
                        </span>
                        <span className="text-xs text-gray-400">(Queued)</span>
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

export default ResearchQueuePanel;
