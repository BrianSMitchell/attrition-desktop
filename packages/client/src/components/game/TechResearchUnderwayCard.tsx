import React, { useEffect, useMemo, useState } from 'react';
import type { Empire } from '@game/shared';
import { getTechSpec, type TechnologyKey } from '@game/shared';
import { useEnhancedAppStore } from '../../stores/enhancedAppStore';

interface TechQueueItemDTO {
  _id?: string;
  locationCoord: string;
  techKey: TechnologyKey;
  startedAt: string | Date;
  completesAt: string | Date;
  status: 'pending' | 'completed' | 'cancelled';
}

interface TechResearchUnderwayCardProps {
  empire: Empire;
  baseCoordFilter?: string; // optional, future use if we want per-base filtering
}

const formatEta = (msRemaining: number) => {
  if (msRemaining <= 0) return 'Completing now';
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

const TechResearchUnderwayCard: React.FC<TechResearchUnderwayCardProps> = ({ baseCoordFilter }) => {
  const [queue, setQueue] = useState<TechQueueItemDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0); // for updating countdowns
  
  // Enhanced store access for API calls
  const services = useEnhancedAppStore((state) => state.services);
  const gameApi = services?.gameApi;

  const fetchQueue = async () => {
    if (!gameApi.getResearchQueue) {
      setError('Research queue API not available');
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      const res = await gameApi.getResearchQueue(baseCoordFilter);
      if (res.success) {
        setQueue(res.data || []);
      } else {
        setError(res.error || 'Failed to load technology research queue');
      }
    } catch (err: any) {
      setError('Network error while loading tech research queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Update progress bars every 30 seconds
    const tickId = setInterval(() => setTick((t) => t + 1), 30000);
    // Fetch fresh data every 60 seconds for real-time updates
    const fetchId = setInterval(() => {
      fetchQueue();
    }, 60000);
    return () => {
      clearInterval(tickId);
      clearInterval(fetchId);
    };
  }, [baseCoordFilter]);

  const active = useMemo(
    () => queue.filter((q) => q.status === 'pending'),
    [queue, tick]
  );

  return (
    <div className="game-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">🧪 Technology Research Underway</h3>
        <button
          onClick={fetchQueue}
          className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200 mb-3">
          {error}
        </div>
      )}

      {loading && active.length === 0 ? (
        <div className="flex items-center justify-center h-20 text-gray-400">Loading...</div>
      ) : active.length === 0 ? (
        <div className="p-4 bg-gray-700 rounded-lg border border-gray-600 text-gray-300">
          No technology research underway.
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((item) => {
            const spec = getTechSpec(item.techKey);
            const started = new Date(item.startedAt).getTime();
            const completes = new Date(item.completesAt).getTime();
            const now = Date.now();
            const percent = percentBetween(started, completes, now);
            const eta = formatEta(completes - now);

            return (
              <div key={item._id || `${item.techKey}-${item.locationCoord}-${item.startedAt}`} className="p-4 bg-gray-700 rounded-lg border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white flex items-center gap-2">
                    {spec.name} <span className="text-xs text-gray-400">({item.techKey})</span>
                  </h4>
                  <span className="text-xs px-2 py-1 rounded bg-gray-800 text-purple-300">
                    {item.locationCoord}
                  </span>
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
                    <span>Completes: {new Date(item.completesAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TechResearchUnderwayCard;
