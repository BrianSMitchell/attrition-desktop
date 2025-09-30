import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { gameApi } from '../../stores/services/gameApi';
import { Link } from 'react-router-dom';

type Economy = {
  metalPerHour: number;
  energyPerHour: number;
  researchPerHour: number;
};

type BaseSummary = {
  baseId: string;
  name: string;
  location: string;
  economy: Economy;
  occupier: null | { empireId: string; name: string };
  construction: { queued: number; next?: { name: string; remaining: number; percent?: number } };
  production: { queued: number; next?: { name: string; remaining: number; percent?: number } };
  defenses?: { queued: number; next?: { name: string; remaining: number; percent?: number } };
  research: null | { name: string; remaining: number; percent?: number };
};

type BaseEcon = { owner: number; base: number };

interface BaseEventsTableProps {
  onRowClick?: (baseId: string) => void;
}

// Use shared API client with centralized base URL and token handling

/**
 * Formats a remaining duration in milliseconds into a compact H/M display:
 * - If minutes >= 60: "Hh MMm"
 * - Else: "Mm"
 * - Floors to minimum 1 minute when > 0 to avoid displaying 0m
 */
function formatRemainingMs(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  let minutes = Math.floor(totalSeconds / 60);
  if (totalSeconds > 0 && minutes === 0) minutes = 1; // minimum 1m when > 0
  const hours = Math.floor(minutes / 60);
  const remMins = minutes % 60;

  if (hours >= 1) {
    const mm = remMins.toString().padStart(2, '0');
    return `${hours}h ${mm}m`;
  }
  return `${minutes}m`;
}

// Simple progress bar with color variants: green (construction), purple (research), red (production), blue (defenses)
const ProgressBar: React.FC<{ percent: number; color: 'green' | 'purple' | 'red' | 'blue' }> = ({ percent, color }) => {
  const barColor =
    color === 'green' ? 'bg-green-500' :
    color === 'purple' ? 'bg-purple-500' :
    color === 'blue' ? 'bg-blue-500' :
    'bg-red-500';
  const trackColor =
    color === 'green' ? 'bg-green-900/40' :
    color === 'purple' ? 'bg-purple-900/40' :
    color === 'blue' ? 'bg-blue-900/40' :
    'bg-red-900/40';

  const pct = Math.min(100, Math.max(0, Math.floor(percent)));

  return (
    <div className={`h-2 w-40 sm:w-48 rounded ${trackColor}`}>
      <div className={`h-2 rounded ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

const BaseEventsTable: React.FC<BaseEventsTableProps> = ({ onRowClick }) => {
  const [items, setItems] = useState<BaseSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [econMap, setEconMap] = useState<Record<string, BaseEcon>>({});

  const apiInstance = api;

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiInstance.get('/game/bases/summary');
      if (res.data?.success) {
        const bases: BaseSummary[] = res.data.data?.bases || [];
        setItems(bases);
        await fetchBaseEcon(bases);
      } else {
        setError(res.data?.error || 'Failed to load base summaries');
      }
    } catch (e: any) {
      console.error('Error fetching base summaries:', e);
      setError('Failed to load base summaries. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBaseEcon = async (bases: BaseSummary[]) => {
    try {
      const entries = await Promise.all(
        bases.map(async (b) => {
          try {
            const res = await gameApi.getBaseStats(b.location);
            if (res.success && res.data) {
              const ownerIncome = Math.round(res.data.ownerIncomeCredPerHour ?? 0);
              const baseEconomy = ownerIncome; // Phase A: same as owner income; will diverge when occupation affects owner income
              return [b.location, { owner: ownerIncome, base: baseEconomy }] as const;
            } else {
              return [b.location, { owner: 0, base: 0 }] as const;
            }
          } catch {
            return [b.location, { owner: 0, base: 0 }] as const;
          }
        })
      );
      const map: Record<string, BaseEcon> = {};
      entries.forEach(([loc, econ]) => {
        map[loc] = econ;
      });
      setEconMap(map);
    } catch {
      // swallow; UI will show 0/0
    }
  };

  if (loading) {
    return (
      <div className="game-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-empire-gold">Bases Events</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mx-auto mb-3"></div>
            <p className="text-gray-400">Loading base events...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="game-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-empire-gold">Bases Events</h3>
          <button onClick={fetchSummary} className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Refresh</button>
        </div>
        <div className="text-center">
          <div className="text-red-400 mb-4">⚠️ {error}</div>
          <button onClick={fetchSummary} className="game-button">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-empire-gold">Bases Events</h3>
        <button onClick={fetchSummary} className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Refresh</button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6 text-gray-400">No bases found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-gray-300 border-b border-gray-700">
                <th className="py-2 px-3 text-left">Base</th>
                <th className="py-2 px-3 text-left">Location</th>
                <th className="py-2 px-3 text-left">Economy</th>
                <th className="py-2 px-3 text-left">Occupier</th>
                <th className="py-2 px-3 text-left">Construction</th>
                <th className="py-2 px-3 text-left">Production</th>
                <th className="py-2 px-3 text-left">Research</th>
                <th className="py-2 px-3 text-left">Defenses</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => {
                const econData = econMap[b.location];
                const owner = Math.round(econData?.owner ?? 0);
                const base = Math.round(econData?.base ?? 0);
                const econ = `${owner} / ${base}`;
                const occupier = b.occupier ? (b.occupier.name || 'Occupied') : '—';
                // Construction text mirrors research: show name + ETA, or "waiting" if not scheduled yet
                const constructionWaiting = !!b.construction.next && (b.construction.next.remaining <= 0);
                const constructionText = b.construction.next
                  ? (constructionWaiting
                      ? `${b.construction.next.name} (waiting)`
                      : `${b.construction.next.name} (${formatRemainingMs(b.construction.next.remaining)})`)
                  : (b.construction.queued > 0 ? `(${b.construction.queued})` : '—');
                const production = (b.production.next && b.production.queued > 0)
                  ? `${b.production.next.name} (${formatRemainingMs(b.production.next.remaining)})`
                  : (b.production.queued > 0 ? `(${b.production.queued})` : '—');
                const researchWaiting = !!b.research && (b.research.remaining <= 0);
                const researchText = b.research
                  ? (researchWaiting
                      ? `${b.research.name} (waiting)`
                      : `${b.research.name} (${formatRemainingMs(b.research.remaining)})`)
                  : '—';
                const defensesWaiting = !!b.defenses?.next && ((b.defenses?.next.remaining || 0) <= 0);
                const defensesText = b.defenses?.next
                  ? (defensesWaiting
                      ? `${b.defenses.next.name} (waiting)`
                      : `${b.defenses.next.name} (${formatRemainingMs(b.defenses.next.remaining)})`)
                  : (b.defenses && b.defenses.queued > 0 ? `(${b.defenses.queued})` : '—');
                return (
                  <tr
                    key={b.baseId}
                    className="border-b border-gray-800 hover:bg-gray-800/60 cursor-pointer"
                    onClick={() => onRowClick?.(b.baseId)}
                  >
                    <td className="py-2 px-3 text-white">{b.name}</td>
                    <td className="py-2 px-3 font-mono text-gray-300">{b.location}</td>
                    <td className="py-2 px-3 text-gray-200">{econ}</td>
                    <td className="py-2 px-3">
                      <span className={b.occupier ? 'text-yellow-400' : 'text-gray-400'}>{occupier}</span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col gap-1">
                        <Link
                          to={`/base/${encodeURIComponent(b.location)}?tab=structures`}
                          onClick={(e) => e.stopPropagation()}
                          className={(b.construction.queued > 0 ? 'text-yellow-400' : 'text-gray-400') + ' hover:text-yellow-300'}
                          aria-label={`View structures for ${b.name}`}
                        >
                          {constructionText}
                        </Link>
                        {typeof b.construction.next?.percent === 'number' && !constructionWaiting ? (
                          <ProgressBar percent={b.construction.next!.percent!} color="green" />
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col gap-1">
                        <Link
                          to={`/base/${encodeURIComponent(b.location)}?tab=fleets`}
                          onClick={(e) => e.stopPropagation()}
                          className={(b.production.queued > 0 ? 'text-yellow-400' : 'text-gray-400') + ' hover:text-yellow-300'}
                          aria-label={`View fleets for ${b.name}`}
                        >
                          {production}
                        </Link>
                        {typeof b.production.next?.percent === 'number' && (b.production.next?.remaining || 0) > 0 ? (
                          <ProgressBar percent={b.production.next!.percent!} color="red" />
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-gray-200">
                      <div className="flex flex-col gap-1">
                        <Link
                          to={`/base/${encodeURIComponent(b.location)}?tab=research`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-yellow-300"
                          aria-label={`View research for ${b.name}`}
                        >
                          {researchText}
                        </Link>
                        {typeof b.research?.percent === 'number' && !researchWaiting ? (
                          <ProgressBar percent={b.research.percent!} color="purple" />
                        ) : null}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex flex-col gap-1">
                        <Link
                          to={`/base/${encodeURIComponent(b.location)}?tab=defenses`}
                          onClick={(e) => e.stopPropagation()}
                          className={(Number(b.defenses?.queued || 0) > 0 ? 'text-yellow-400' : 'text-gray-400') + ' hover:text-yellow-300'}
                          aria-label={`View defenses for ${b.name}`}
                        >
                          {defensesText}
                        </Link>
                        {typeof b.defenses?.next?.percent === 'number' && !defensesWaiting ? (
                          <ProgressBar percent={b.defenses!.next!.percent!} color="blue" />
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
};

export default BaseEventsTable;
