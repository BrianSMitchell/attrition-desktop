import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import fleetsService, { FleetDetailDTO } from '../../services/fleetsService';

const FleetPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fleet, setFleet] = useState<FleetDetailDTO['fleet'] | null>(null);

  const loadFleet = async () => {
    if (!id) {
      setError('Missing fleet id');
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const res = await fleetsService.getFleet(id);
      if (res.success && res.data) {
        setFleet(res.data.fleet);
      } else {
        setError(res.error || 'Failed to load fleet');
      }
    } catch {
      setError('Network error while loading fleet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="game-card">
        <div className="py-10 text-center text-gray-300">Loading fleet…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="game-card">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-empire-gold">Fleet</h1>
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
            >
              ← Back
            </button>
          </div>
          <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!fleet) {
    return (
      <div className="game-card">
        <div className="py-10 text-center text-gray-300">Fleet not found.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="game-card">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-empire-gold">{fleet.name}</h1>
            <div className="text-gray-400 font-mono">
              {fleet.locationCoord}{' '}
              <span className="text-gray-500">•</span>{' '}
              Owner: <span className="text-gray-300">{fleet.ownerName || '—'}</span>
            </div>
            <div className="mt-1 text-gray-300">
              Size: <span className="font-mono">{fleet.sizeCredits.toLocaleString()}</span> credits
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Stub actions (disabled) */}
            <button
              disabled
              title="Coming soon"
              className="px-3 py-1 bg-gray-700 text-gray-400 rounded cursor-not-allowed"
            >
              Move
            </button>
            <button
              disabled
              title="Coming soon"
              className="px-3 py-1 bg-gray-700 text-gray-400 rounded cursor-not-allowed"
            >
              Attack
            </button>
            <button
              disabled
              title="Coming soon"
              className="px-3 py-1 bg-gray-700 text-gray-400 rounded cursor-not-allowed"
            >
              Build Base
            </button>
            <button
              disabled
              title="Coming soon"
              className="px-3 py-1 bg-gray-700 text-gray-400 rounded cursor-not-allowed"
            >
              Rename
            </button>
            <button
              disabled
              title="Coming soon"
              className="px-3 py-1 bg-gray-700 text-gray-400 rounded cursor-not-allowed"
            >
              Disband
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600"
            >
              ← Back
            </button>
          </div>
        </div>
        {/* Link to base page */}
        <div className="mt-2">
          <Link
            to={`/base/${encodeURIComponent(fleet.locationCoord)}`}
            className="text-blue-300 hover:text-blue-200"
          >
            View Base
          </Link>
        </div>
      </div>

      {/* Composition */}
      <div className="game-card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-empire-gold">Composition</h3>
          <button
            onClick={loadFleet}
            className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="text-gray-300">
              <tr className="border-b border-gray-700">
                <th className="text-left py-1 pr-4">Unit</th>
                <th className="text-left py-1 pr-4">Key</th>
                <th className="text-right py-1">Count</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {fleet.units && fleet.units.length > 0 ? (
                fleet.units.map((u, idx) => (
                  <tr key={`${u.unitKey}-${idx}`} className="border-b border-gray-800/60">
                    <td className="py-1 pr-4 text-gray-200">{u.name || u.unitKey}</td>
                    <td className="py-1 pr-4 text-gray-400 font-mono">{u.unitKey}</td>
                    <td className="py-1 text-right font-mono">{u.count.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="py-3 text-center text-gray-400">
                    No units in this fleet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FleetPage;
