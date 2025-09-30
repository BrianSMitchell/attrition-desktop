import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGame } from '../../stores/enhancedAppStore';
import fleetsService from '../../services/fleetsService';

/**
 * Temporary debug component to diagnose fleet loading issues
 * Shows current coordinate, what's in the store, and direct API responses
 */
export const FleetDebug: React.FC = () => {
  const { coord } = useParams<{ coord: string }>();
  const gameState = useGame();
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testFleetAPI = async () => {
    if (!coord) return;
    setLoading(true);
    try {
      const response = await fleetsService.getFleetsOverview(coord);
      setApiResponse(response);
    } catch (error) {
      setApiResponse({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (coord) {
      testFleetAPI();
    }
  }, [coord]);

  const fleetsInStore = coord ? gameState?.fleets?.itemsByCoord?.[coord] : null;

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 border-2 border-yellow-500 p-4 rounded-lg text-xs font-mono text-white max-w-md shadow-2xl z-50">
      <div className="font-bold text-yellow-400 mb-2">🐛 FLEET DEBUG PANEL</div>
      
      <div className="space-y-2">
        <div>
          <span className="text-gray-400">URL Coord:</span>
          <span className="ml-2 text-green-400">{coord || 'NONE'}</span>
        </div>

        <div>
          <span className="text-gray-400">Fleets in Store:</span>
          <span className="ml-2 text-blue-400">
            {fleetsInStore ? `${fleetsInStore.length} fleets` : 'No data'}
          </span>
        </div>

        {fleetsInStore && fleetsInStore.length > 0 && (
          <div className="pl-4 text-green-300">
            {fleetsInStore.map((f: any, i: number) => (
              <div key={i}>• {f.name} ({f.sizeCredits} credits)</div>
            ))}
          </div>
        )}

        <div>
          <span className="text-gray-400">API Status:</span>
          <span className="ml-2">
            {loading ? '⏳ Loading...' : apiResponse ? '✅ Loaded' : '❌ Not loaded'}
          </span>
        </div>

        {apiResponse && (
          <div className="mt-2 p-2 bg-gray-800 rounded max-h-40 overflow-auto">
            <div className="text-gray-400 mb-1">API Response:</div>
            <pre className="text-xs">{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        )}

        <button
          onClick={testFleetAPI}
          className="mt-2 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-xs"
          disabled={loading || !coord}
        >
          {loading ? 'Testing...' : 'Test API Again'}
        </button>
      </div>
    </div>
  );
};