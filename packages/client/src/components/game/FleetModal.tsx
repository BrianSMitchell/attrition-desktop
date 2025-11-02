import React, { useState, useEffect } from 'react';
import { FleetsListDTO } from '../../services/fleetsService';
import FleetManagement from './fleet/FleetManagement';
import { useUIActions, useGameApi } from '../../stores/enhancedAppStore';
import { LAYOUT_CLASSES } from '../../constants/css-constants';

interface FleetModalProps {
  onUpdate: () => void;
}

type ViewMode = 'list' | 'detail';

const FleetModal: React.FC<FleetModalProps> = ({ onUpdate }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedFleetId, setSelectedFleetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fleets, setFleets] = useState<FleetsListDTO['fleets']>([]);
  const { addToast } = useUIActions();
  const gameApi = useGameApi();

  const loadFleets = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await gameApi.getFleets();
      
      if (result.success && result.data) {
        setFleets(result.data.fleets);
      } else {
        setError(result.error || 'Failed to load fleets');
        addToast({
          type: 'error',
          message: result.error || 'Failed to load fleets'
        });
      }
    } catch (err) {
      setError('Network error while loading fleets');
      addToast({
        type: 'error',
        message: 'Network error while loading fleets'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleets();
  }, []);

  const handleFleetSelect = (fleetId: string) => {
    setSelectedFleetId(fleetId);
    setViewMode('detail');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedFleetId(null);
    loadFleets(); // Refresh the fleet list
  };

  const handleFleetUpdate = () => {
    onUpdate();
    loadFleets();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-gray-300">Loading fleets...</span>
        </div>
      </div>
    );
  }

  if (viewMode === 'detail' && selectedFleetId) {
    return (
      <div className="space-y-4">
        <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
          <button
            onClick={handleBackToList}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 transition-colors"
          >
            â† Back to Fleet List
          </button>
        </div>
        
        <FleetManagement
          fleetId={selectedFleetId}
          onFleetUpdate={handleFleetUpdate}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
        <h3 className="text-xl font-semibold text-empire-gold">Fleet Management</h3>
        <button
          onClick={loadFleets}
          className="text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
          {error}
        </div>
      )}

      {fleets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">ðŸš€</div>
          <h4 className="text-lg font-semibold text-white mb-2">No Fleets Available</h4>
          <p className="text-gray-400 mb-6">
            You currently have no fleets. Fleets are created automatically when you build ships at bases with spaceports.
          </p>
          
          <div className="p-4 bg-gray-700 rounded-lg border border-gray-600 text-left max-w-md mx-auto">
            <h5 className="font-medium text-white mb-3">How to get fleets:</h5>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <span className="text-blue-400">ðŸ—ï¸</span>
                Build a Spaceport at your base
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">âš—ï¸</span>
                Research ship technologies
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-400">ðŸ”§</span>
                Construct ships using the Units tab
              </li>
              <li className="flex items-center gap-2">
                <span className="text-purple-400">ðŸš€</span>
                Ships automatically form fleets
              </li>
            </ul>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-4 text-sm text-gray-400">
            {fleets.length} fleet{fleets.length !== 1 ? 's' : ''} available
          </div>
          
          <div className="space-y-3">
            {fleets.map((fleet) => (
              <div
                key={fleet._id}
                className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors cursor-pointer"
                onClick={() => handleFleetSelect(fleet._id)}
              >
                <div className={LAYOUT_CLASSES.FLEX_BETWEEN}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-white">{fleet.name}</h4>
                      {fleet.arrival && (
                        <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                          Moving
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-400">Owner</div>
                        <div className="text-gray-200">{fleet.ownerName}</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Size</div>
                        <div className="text-gray-200">{fleet.sizeCredits.toLocaleString()} credits</div>
                      </div>
                      <div>
                        <div className="text-gray-400">Status</div>
                        <div className={fleet.arrival ? 'text-blue-400' : 'text-green-400'}>
                          {fleet.arrival ? 'In Transit' : 'Stationed'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4">
                    <div className="text-right text-sm text-gray-400">
                      Click to manage
                    </div>
                    <div className="text-right text-2xl mt-1">â†’</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Future Features Info */}
      <div className="mt-8 p-4 bg-gray-700 rounded-lg border border-gray-600">
        <h4 className="font-medium text-white mb-3">ðŸš€ Fleet Movement System Active!</h4>
        <p className="text-sm text-gray-300 mb-3">
          Fleet movement and deployment features are now available! Select a fleet above to dispatch it to new locations.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
          <div>
            <h5 className="font-medium text-white mb-2">Available Now:</h5>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-green-400">âœ…</span>
                Fleet deployment and movement
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">âœ…</span>
                Travel time calculations
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">âœ…</span>
                Fleet recall capabilities
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-400">âœ…</span>
                Real-time status tracking
              </li>
            </ul>
          </div>
          
          <div>
            <h5 className="font-medium text-white mb-2">Coming Soon:</h5>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <span className="text-yellow-400">â³</span>
                Combat and warfare systems
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-400">â³</span>
                Map-based destination selection
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-400">â³</span>
                Fleet formations and tactics
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-400">â³</span>
                Exploration missions
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetModal;

