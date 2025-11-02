import * as React from 'react';
import { CARD_CLASSES, LAYOUT_CLASSES } from '../../constants/css-constants';

const HOURS_OPTIONS = [1, 6, 24, 168]; // 1h, 6h, 24h, 7d

function downloadString(data: string, filename: string, type: string) {
  try {
    const blob = new Blob([data], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Download failed:', err);
  }
}

const PerformancePage: React.FC = () => {
  const [hours, setHours] = React.useState<number>(24);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState<any | null>(null);
  const [thresholds, setThresholds] = React.useState<Array<{ op?: string; p95Ms?: number; failRatePct?: number }>>([]);
  const [breaches, setBreaches] = React.useState<Array<{ op?: string; metric: 'p95Ms' | 'failRatePct'; value: number; threshold: number; windowHours: number; ts: number }>>([]);

  const isDesktop = typeof window !== 'undefined' && !!window.desktop?.perf;

  const fetchStats = React.useCallback(async (h: number) => {
    if (!isDesktop) return;
    setLoading(true);
    setError(null);
    try {
      const res = await window.desktop!.perf.getStats(h);
      if (res.success) {
        setStats(res.stats || null);
      } else {
        setError(res.error || 'Failed to load stats');
        setStats(null);
      }
    } catch (e: any) {
      console.error('perf:getStats failed', e);
      setError(e?.message || 'Failed to load stats');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [isDesktop]);

  React.useEffect(() => {
    if (isDesktop) {
      fetchStats(hours);
    }
  }, [hours, isDesktop, fetchStats]);

  // Load thresholds
  const loadThresholds = React.useCallback(async () => {
    if (!isDesktop) return;
    try {
      const res = await window.desktop!.perf.getThresholds();
      if (res.success) {
        setThresholds(res.thresholds || []);
      }
    } catch (e) {
      // noop
    }
  }, [isDesktop]);

  const loadBreaches = React.useCallback(async (h: number) => {
    if (!isDesktop) return;
    try {
      const res = await window.desktop!.perf.getThresholdBreaches(h);
      if (res.success) {
        setBreaches(res.breaches || []);
      }
    } catch (e) {
      // noop
    }
  }, [isDesktop]);

  React.useEffect(() => {
    if (isDesktop) {
      loadThresholds();
      loadBreaches(hours);
    }
  }, [isDesktop, hours, loadThresholds, loadBreaches]);

  const handleExport = async (format: 'json' | 'csv') => {
    if (!isDesktop) return;
    try {
      const res = await window.desktop!.perf.export(format, hours);
      if (res.success && typeof res.data === 'string') {
        const fname = `sync_performance_${hours}h.${format === 'json' ? 'json' : 'csv'}`;
        downloadString(res.data, fname, format === 'json' ? 'application/json' : 'text/csv');
      } else {
        alert(`Export failed: ${res.error || 'unknown error'}`);
      }
    } catch (e: any) {
      alert(`Export failed: ${e?.message || 'exception'}`);
    }
  };

  const handleClear = async () => {
    if (!isDesktop) return;
    const doClear = window.confirm('Clear stored performance metrics now? This cannot be undone.');
    if (!doClear) return;
    try {
      const res = await window.desktop!.perf.clear();
      if (res.success) {
        // Reload stats after clear
        fetchStats(hours);
      } else {
        alert(`Clear failed: ${res.error || 'unknown error'}`);
      }
    } catch (e: any) {
      alert(`Clear failed: ${e?.message || 'exception'}`);
    }
  };

  if (!isDesktop) {
    return (
      <div className="p-6">
        <div className={CARD_CLASSES.BASIC}>
          <h2 className="text-xl font-semibold mb-2">Performance Monitoring</h2>
          <p className="text-gray-400">
            Desktop-only feature. Launch the Electron desktop app to view sync performance metrics.
          </p>
        </div>
      </div>
    );
  }

  const opsByType = stats?.operationsByType ? Object.entries(stats.operationsByType as Record<string, any>) : [];

  return (
    <div className="p-6 space-y-6">
      <div className={CARD_CLASSES.BASIC}>
        <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
          <h2 className="text-xl font-semibold">Performance Monitoring</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-300">Window:</label>
            <select
              className="bg-gray-700 text-white text-sm px-2 py-1 rounded"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
              disabled={loading}
            >
              {HOURS_OPTIONS.map((h) => (
                <option key={h} value={h}>{h}h</option>
              ))}
            </select>
            <button
              onClick={() => handleExport('json')}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={loading}
            >
              Export CSV
            </button>
            <button
              onClick={handleClear}
              className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>
        {loading && (
          <div className="text-gray-400 mt-3">Loading...</div>
        )}
        {error && (
          <div className="text-red-400 mt-3">Error: {error}</div>
        )}
      </div>

      {/* Stats overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={CARD_CLASSES.BASIC}>
            <div className="text-gray-400 text-sm">Success Rate</div>
            <div className="text-2xl font-bold">{(stats.successRate ?? 0).toFixed(1)}%</div>
          </div>
          <div className={CARD_CLASSES.BASIC}>
            <div className="text-gray-400 text-sm">Avg / Median</div>
            <div className="text-2xl font-bold">
              {Math.round(stats.averageDurationMs ?? 0)}ms
              <span className="text-gray-400 text-base ml-2">
                ({Math.round(stats.medianDurationMs ?? 0)}ms)
              </span>
            </div>
          </div>
          <div className={CARD_CLASSES.BASIC}>
            <div className="text-gray-400 text-sm">P95 / P99</div>
            <div className="text-2xl font-bold">
              {Math.round(stats.p95DurationMs ?? 0)}ms
              <span className="text-gray-400 text-base ml-2">
                ({Math.round(stats.p99DurationMs ?? 0)}ms)
              </span>
            </div>
          </div>
          <div className={CARD_CLASSES.BASIC}>
            <div className="text-gray-400 text-sm">Throughput</div>
            <div className="text-2xl font-bold">
              {(stats.throughput?.operationsPerMinute ?? 0).toFixed(1)} ops/min
            </div>
            <div className="text-gray-400 text-sm">
              {(stats.throughput?.bytesPerSecond ?? 0).toFixed(0)} B/s
            </div>
          </div>
          <div className={CARD_CLASSES.BASIC}>
            <div className="text-gray-400 text-sm">Total Operations</div>
            <div className="text-2xl font-bold">{stats.totalOperations ?? 0}</div>
          </div>
        </div>
      )}

      {/* Operation breakdown (minimal) */}
      {opsByType.length > 0 && (
        <div className={CARD_CLASSES.BASIC}>
          <h3 className="text-lg font-semibold mb-3">Operations Breakdown</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-300 border-b border-gray-700">
                  <th className="py-2 pr-4">Operation</th>
                  <th className="py-2 pr-4">Count</th>
                  <th className="py-2 pr-4">Success</th>
                  <th className="py-2 pr-4">Avg (ms)</th>
                  <th className="py-2 pr-4">p95 (ms)</th>
                  <th className="py-2 pr-4">p99 (ms)</th>
                </tr>
              </thead>
              <tbody>
                {opsByType.map(([op, s]: any) => (
                  <tr key={op} className="border-b border-gray-800 hover:bg-gray-750/50">
                    <td className="py-2 pr-4">{op}</td>
                    <td className="py-2 pr-4">{s.count ?? 0}</td>
                    <td className="py-2 pr-4">{(s.successRate ?? 0).toFixed(1)}%</td>
                    <td className="py-2 pr-4">{Math.round(s.avgDuration ?? 0)}</td>
                    <td className="py-2 pr-4">{Math.round(s.p95DurationMs ?? 0)}</td>
                    <td className="py-2 pr-4">{Math.round(s.p99DurationMs ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error distribution */}
      {stats?.errorDistribution && Object.keys(stats.errorDistribution).length > 0 && (
        <div className={CARD_CLASSES.BASIC}>
          <h3 className="text-lg font-semibold mb-3">Error Distribution</h3>
          <ul className="list-disc ml-6 text-sm text-gray-300">
            {Object.entries(stats.errorDistribution as Record<string, number>).map(([err, count]) => (
              <li key={err} className="mb-1">
                <span className="text-gray-400">{err}:</span> {count}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Thresholds editor and breach warnings */}
      <ThresholdsPanel
        hours={hours}
        thresholds={thresholds}
        breaches={breaches}
        onChange={setThresholds}
        onReload={() => { loadThresholds(); loadBreaches(hours); }}
      />
    </div>
  );
};

/**
 * Thresholds panel subcomponent
 */
const ThresholdsPanel: React.FC<{
  hours: number;
  thresholds: Array<{ op?: string; p95Ms?: number; failRatePct?: number }>;
  breaches: Array<{ op?: string; metric: 'p95Ms' | 'failRatePct'; value: number; threshold: number; windowHours: number; ts: number }>;
  onChange: (t: Array<{ op?: string; p95Ms?: number; failRatePct?: number }>) => void;
  onReload: () => void;
}> = ({ hours, thresholds, breaches, onChange, onReload }) => {
  const [saving, setSaving] = React.useState(false);

  const addRow = () => {
    onChange([...(thresholds || []), { op: '', p95Ms: undefined, failRatePct: undefined }]);
  };
  const removeRow = (idx: number) => {
    const next = [...thresholds];
    next.splice(idx, 1);
    onChange(next);
  };
  const updateRow = (idx: number, patch: Partial<{ op?: string; p95Ms?: number; failRatePct?: number }>) => {
    const next = [...thresholds];
    next[idx] = { ...(next[idx] || {}), ...patch };
    onChange(next);
  };

  const save = async () => {
    if (!window.desktop?.perf?.setThresholds) return;
    setSaving(true);
    try {
      const sanitized = (thresholds || []).map(t => ({
        op: (t.op || '')?.trim() || undefined,
        p95Ms: typeof t.p95Ms === 'number' && !Number.isNaN(t.p95Ms) ? t.p95Ms : undefined,
        failRatePct: typeof t.failRatePct === 'number' && !Number.isNaN(t.failRatePct) ? t.failRatePct : undefined,
      }));
      const res = await window.desktop.perf.setThresholds(sanitized);
      if (!res.success) {
        alert('Failed to save thresholds');
      } else {
        onReload();
      }
    } catch (e: any) {
      alert(`Save failed: ${e?.message || 'exception'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={CARD_CLASSES.BASIC}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Thresholds & Breaches</h3>
        <div className="text-sm text-gray-300">
          Window: <span className="font-mono">{hours}h</span>
        </div>
      </div>

      {/* Breaches */}
      {breaches.length > 0 ? (
        <div className="mb-4 p-3 rounded bg-yellow-900/40 border border-yellow-700 text-yellow-300">
          <div className="font-medium mb-1">Active Breaches ({breaches.length})</div>
          <ul className="list-disc ml-6">
            {breaches.map((b, i) => (
              <li key={`${b.metric}-${b.op ?? 'global'}-${i}`}>
                <span className="font-mono">{b.op ?? 'GLOBAL'}</span> {b.metric} = {Math.round(b.value)} {'>'} {Math.round(b.threshold)}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="mb-4 p-3 rounded bg-green-900/30 border border-green-700 text-green-300">
          No threshold breaches detected.
        </div>
      )}

      {/* Editor */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-300 border-b border-gray-700">
              <th className="py-2 pr-4">Operation (optional)</th>
              <th className="py-2 pr-4">p95 (ms)</th>
              <th className="py-2 pr-4">Fail Rate (%)</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {(thresholds || []).map((t, idx) => (
              <tr key={idx} className="border-b border-gray-800">
                <td className="py-2 pr-4">
                  <input
                    className="bg-gray-700 text-white text-sm px-2 py-1 rounded w-full"
                    placeholder="e.g., flush_structures (leave blank for GLOBAL)"
                    value={t.op ?? ''}
                    onChange={(e) => updateRow(idx, { op: e.target.value })}
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    className="bg-gray-700 text-white text-sm px-2 py-1 rounded w-28"
                    type="number"
                    min={0}
                    step={1}
                    value={t.p95Ms ?? ''}
                    onChange={(e) => updateRow(idx, { p95Ms: e.target.value === '' ? undefined : Number(e.target.value) })}
                  />
                </td>
                <td className="py-2 pr-4">
                  <input
                    className="bg-gray-700 text-white text-sm px-2 py-1 rounded w-28"
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={t.failRatePct ?? ''}
                    onChange={(e) => updateRow(idx, { failRatePct: e.target.value === '' ? undefined : Number(e.target.value) })}
                  />
                </td>
                <td className="py-2 pr-4">
                  <button
                    onClick={() => removeRow(idx)}
                    className="text-sm px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={addRow}
          className="text-sm px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Add Threshold
        </button>
        <button
          onClick={save}
          className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={saving}
        >
          {saving ? 'Savingâ€¦' : 'Save Thresholds'}
        </button>
        <button
          onClick={onReload}
          className="text-sm px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Reload
        </button>
      </div>
    </div>
  );
};

export default PerformancePage;

