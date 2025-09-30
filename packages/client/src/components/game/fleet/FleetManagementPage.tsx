import React, { useState, useEffect } from 'react';
import { Empire } from '@game/shared';
import UniverseMap from '../map-next/UniverseMapLoader';
import FleetDispatchForm from './FleetDispatchForm';
import { FleetDispatchDTO, FleetListRow } from '../../../services/fleetsService';
import fleetsService from '../../../services/fleetsService';
import { useUIActions } from '../../../stores/enhancedAppStore';

interface FleetManagementPageProps {
  empire: Empire;
}

interface FleetSummary extends FleetListRow {
  status: 'stationed' | 'moving' | 'combat';
  units?: { unitKey: string; name: string; count: number }[];
  locationCoord?: string;
}

const FleetManagementPage: React.FC<FleetManagementPageProps> = ({ empire }) => {
  const [selectedFleet, setSelectedFleet] = useState<FleetSummary | null>(null);
  const [fleets, setFleets] = useState<FleetSummary[]>([]);
  const [fleetsLoading, setFleetsLoading] = useState(true);
  const [isDispatching, setIsDispatching] = useState(false);
  const { addToast } = useUIActions();

  // Load fleet data from API
  useEffect(() => {
    loadFleets();
  }, []);

  const loadFleets = async () => {
    setFleetsLoading(true);
    try {
      const response = await fleetsService.getFleets();
      if (response.success && response.data) {
        // Get detailed info for each fleet to determine status
        const fleetDetails = await Promise.all(
          response.data.fleets.map(async (fleet) => {
            try {
              const statusResponse = await fleetsService.getFleetStatus(fleet._id);
              const detailResponse = await fleetsService.getFleet(fleet._id);
              
              let status: 'stationed' | 'moving' | 'combat' = 'stationed';
              let locationCoord = '';
              let units: { unitKey: string; name: string; count: number }[] = [];
              
              if (statusResponse.success && statusResponse.data) {
                status = statusResponse.data.fleet.isMoving ? 'moving' : 'stationed';
                locationCoord = statusResponse.data.fleet.locationCoord;
              }
              
              if (detailResponse.success && detailResponse.data) {
                units = detailResponse.data.fleet.units;
                if (!locationCoord) {
                  locationCoord = detailResponse.data.fleet.locationCoord;
                }
              }
              
              return {
                ...fleet,
                status,
                units,
                locationCoord
              } as FleetSummary;
            } catch (error) {
              console.warn(`Failed to load details for fleet ${fleet._id}:`, error);
              return {
                ...fleet,
                status: 'stationed' as const,
                units: [],
                locationCoord: ''
              } as FleetSummary;
            }
          })
        );
        
        setFleets(fleetDetails);
      } else {
        addToast({
          type: 'error',
          message: response.error || 'Failed to load fleets'
        });
      }
    } catch (error) {
      console.error('Failed to load fleets:', error);
      addToast({
        type: 'error',
        message: 'Network error loading fleets'
      });
    } finally {
      setFleetsLoading(false);
    }
  };

  const handleFleetDispatch = async (destinationCoord: string): Promise<{ success: boolean; data?: FleetDispatchDTO; error?: string }> => {
    if (!selectedFleet) {
      return { success: false, error: 'No fleet selected' };
    }

    setIsDispatching(true);
    
    try {
      const response = await fleetsService.dispatchFleet(selectedFleet._id, destinationCoord);
      
      if (response.success && response.data) {
        // Refresh fleet data after successful dispatch to get updated statuses
        await loadFleets();

        return { 
          success: true, 
          data: {
            movement: response.data.movement
          } as FleetDispatchDTO
        };
      } else {
        return { 
          success: false, 
          error: response.error || 'Failed to dispatch fleet' 
        };
      }
    } catch (error) {
      console.error('Fleet dispatch error:', error);
      return { 
        success: false, 
        error: 'Network error during dispatch' 
      };
    } finally {
      setIsDispatching(false);
    }
  };

  const handleFleetSelect = (fleet: FleetSummary) => {
    if (fleet.status === 'moving') {
      addToast({
        type: 'warning',
        message: `Fleet "${fleet.name}" is currently moving and cannot be dispatched`
      });
      return;
    }
    
    setSelectedFleet(fleet);
  };

  return (
    <div className="h-screen flex bg-gray-900">
      {/* Fleet List Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-empire-gold">Fleet Management</h2>
          <p className="text-sm text-gray-400 mt-1">{empire.name}</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {fleetsLoading ? (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
              <p className="text-gray-400 text-sm">Loading fleets...</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {fleets.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  <p>No fleets available</p>
                  <p className="text-xs mt-1">Build ships and form fleets to get started</p>
                </div>
              ) : (
                fleets.map(fleet => (
                  <div
                    key={fleet._id}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      selectedFleet?._id === fleet._id
                        ? 'border-blue-500 bg-blue-900/30'
                        : 'border-gray-600 bg-gray-700/50 hover:bg-gray-700'
                    }`}
                    onClick={() => handleFleetSelect(fleet)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-white text-sm">{fleet.name}</h3>
                      <div className={`px-2 py-1 rounded text-xs font-medium ${
                        fleet.status === 'stationed' ? 'bg-green-900/50 text-green-300' :
                        fleet.status === 'moving' ? 'bg-yellow-900/50 text-yellow-300' :
                        'bg-red-900/50 text-red-300'
                      }`}>
                        {fleet.status}
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Location:</span>
                        <span className="text-white font-mono">{fleet.locationCoord || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Size:</span>
                        <span className="text-white">{fleet.sizeCredits.toLocaleString()} credits</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Units:</span>
                        <span className="text-white">{fleet.units?.length || 0} types</span>
                      </div>
                    </div>
                    
                    {fleet.status === 'stationed' && (
                      <button
                        className="mt-2 w-full px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFleetSelect(fleet);
                        }}
                      >
                        Dispatch Fleet
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Fleet Actions */}
        <div className="p-4 border-t border-gray-700 space-y-2">
          <button className="w-full px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm">
            Form New Fleet
          </button>
          <button className="w-full px-3 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 text-sm">
            Merge Fleets
          </button>
        </div>
      </div>

      {/* Main Map Area */}
      <div className="flex-1 relative">
        <React.Suspense fallback={<div className="p-4 text-center">Loading map…</div>}>
          <UniverseMap />
        </React.Suspense>
        
        {/* Fleet Dispatch Modal */}
        {selectedFleet && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <FleetDispatchForm
                fleet={{
                  _id: selectedFleet._id,
                  name: selectedFleet.name,
                  locationCoord: selectedFleet.locationCoord || '',
                  ownerName: selectedFleet.ownerName,
                  units: selectedFleet.units || [],
                  sizeCredits: selectedFleet.sizeCredits
                }}
                empire={empire}
                onDispatch={handleFleetDispatch}
                onCancel={() => setSelectedFleet(null)}
                isDispatching={isDispatching}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetManagementPage;
