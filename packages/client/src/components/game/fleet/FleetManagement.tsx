import React, { useState, useEffect } from 'react';
import { gameApi } from '../../../stores/services/gameApi';
import FleetDispatchForm from './FleetDispatchForm';
import FleetMovementStatus from './FleetMovementStatus';
import { useUIActions } from '../../../stores/enhancedAppStore';
import { Empire } from '@game/shared';

// Type definitions for fleet data
type FleetDetailDTO = { fleet: any };
type FleetStatusDTO = any;
type FleetDispatchDTO = any;
type FleetRecallDTO = any;

interface FleetManagementProps {
  fleetId: string;
  empire?: Empire;
  onFleetUpdate?: () => void;
}

type ViewMode = 'overview' | 'dispatch' | 'movement';

const FleetManagement: React.FC<FleetManagementProps> = ({
  fleetId,
  empire,
  onFleetUpdate
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fleet, setFleet] = useState<FleetDetailDTO['fleet'] | null>(null);
  const [fleetStatus, setFleetStatus] = useState<FleetStatusDTO | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('overview');
  const [isDispatching, setIsDispatching] = useState(false);
  const { addToast } = useUIActions();

  const loadFleetData = async () => {
    try {
      setError(null);
      setLoading(true);

      // Load basic fleet data
      const fleetResult = await gameApi.getFleet(fleetId);
      if (!fleetResult.success || !fleetResult.data) {
        setError(fleetResult.error || 'Failed to load fleet data');
        return;
      }

      setFleet(fleetResult.data.fleet);

      // Load fleet status (movement data)
      const statusResult = await gameApi.getFleetStatus(fleetId);
      if (statusResult.success && statusResult.data) {
        setFleetStatus(statusResult.data);
      }

    } catch (err) {
      setError('Network error while loading fleet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleetData();
  }, [fleetId]);

  const handleDispatch = async (destinationCoord: string): Promise<{ success: boolean; data?: FleetDispatchDTO; error?: string }> => {
    setIsDispatching(true);
    try {
      const result = await gameApi.dispatchFleet(fleetId, destinationCoord);
      
      if (result.success) {
        // Reload fleet data to get updated status
        await loadFleetData();
        setCurrentView('movement');
        
        if (onFleetUpdate) {
          onFleetUpdate();
        }
      }
      
      return result;
    } catch (err) {
      return {
        success: false,
        error: 'Network error while dispatching fleet'
      };
    } finally {
      setIsDispatching(false);
    }
  };

  const handleRecall = async (reason?: string): Promise<{ success: boolean; data?: FleetRecallDTO; error?: string }> => {
    try {
      const result = await gameApi.recallFleet(fleetId, reason);
      
      if (result.success) {
        // Reload fleet data to get updated status
        await loadFleetData();
        
        if (onFleetUpdate) {
          onFleetUpdate();
        }
      }
      
      return result;
    } catch (err) {
      return {
        success: false,
        error: 'Network error while recalling fleet'
      };
    }
  };

  const handleRefreshStatus = async () => {
    try {
      const statusResult = await gameApi.getFleetStatus(fleetId);
      if (statusResult.success && statusResult.data) {
        setFleetStatus(statusResult.data);
        addToast({
          type: 'info',
          message: 'Fleet status refreshed'
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Failed to refresh fleet status'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-gray-300">Loading fleet data...</span>
        </div>
      </div>
    );
  }

  if (error || !fleet) {
    return (
      <div className="p-4 bg-red-900/50 border border-red-700 rounded text-red-200">
        <div className="font-medium">Error Loading Fleet</div>
        <div className="text-sm mt-1">{error || 'Fleet not found'}</div>
        <button
          onClick={loadFleetData}
          className="mt-2 px-3 py-1 bg-red-700 text-white rounded hover:bg-red-600 text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const isMoving = fleetStatus?.fleet.isMoving || false;
  const movement = fleetStatus?.movement;

  return (
    <div className="space-y-4">
      {/* Navigation */}
      <div className="flex flex-wrap gap-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
        <button
          onClick={() => setCurrentView('overview')}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            currentView === 'overview'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Fleet Overview
        </button>
        
        <button
          onClick={() => setCurrentView('dispatch')}
          disabled={isMoving}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
            currentView === 'dispatch'
              ? 'bg-blue-600 text-white'
              : isMoving
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
          title={isMoving ? 'Fleet is currently moving' : 'Dispatch fleet to new location'}
        >
          {isMoving ? 'Fleet Moving' : 'Dispatch Fleet'}
        </button>
        
        {movement && (
          <button
            onClick={() => setCurrentView('movement')}
            className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
              currentView === 'movement'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Movement Status
            <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
              {movement.status}
            </span>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {currentView === 'overview' && (
          <div className="space-y-4">
            {/* Fleet Summary */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-lg font-semibold text-empire-gold mb-3">
                Fleet Summary: {fleet.name}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-400">Current Location</div>
                  <div className="text-white font-mono text-lg">{fleet.locationCoord}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Fleet Size</div>
                  <div className="text-white text-lg">{fleet.sizeCredits.toLocaleString()} credits</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Unit Types</div>
                  <div className="text-white text-lg">{fleet.units?.length || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Status</div>
                  <div className={`text-lg font-medium ${isMoving ? 'text-blue-400' : 'text-green-400'}`}>
                    {isMoving ? 'Moving' : 'Stationed'}
                  </div>
                </div>
              </div>

              {/* Movement Status Summary */}
              {isMoving && movement && (
                <div className="p-3 bg-blue-900/30 border border-blue-700 rounded">
                  <div className="text-sm text-blue-200">
                    <div className="font-medium">Currently Moving</div>
                    <div className="mt-1">
                      From <span className="font-mono">{movement.originCoord}</span> to{' '}
                      <span className="font-mono">{movement.destinationCoord}</span>
                    </div>
                    <div className="text-blue-300 mt-1">
                      Status: {movement.status} • ETA: {new Date(movement.estimatedArrivalTime).toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => setCurrentView('dispatch')}
                  disabled={isMoving}
                  className={`px-4 py-2 rounded font-medium ${
                    isMoving
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isMoving ? 'Fleet Moving' : 'Dispatch Fleet'}
                </button>
                
                {movement && (
                  <button
                    onClick={() => setCurrentView('movement')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    View Movement
                  </button>
                )}
                
                <button
                  onClick={handleRefreshStatus}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Refresh Status
                </button>
              </div>
            </div>

            {/* Fleet Composition */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <h4 className="text-md font-semibold text-empire-gold mb-3">Fleet Composition</h4>
              
              {fleet.units && fleet.units.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-gray-300">
                      <tr className="border-b border-gray-700">
                        <th className="text-left py-2 pr-4">Unit Type</th>
                        <th className="text-left py-2 pr-4">Key</th>
                        <th className="text-right py-2">Count</th>
                      </tr>
                    </thead>
                    <tbody className="text-white">
                      {fleet.units.map((unit: any, idx: number) => (
                        <tr key={`${unit.unitKey}-${idx}`} className="border-b border-gray-800/60">
                          <td className="py-2 pr-4 text-gray-200">{unit.name || unit.unitKey}</td>
                          <td className="py-2 pr-4 text-gray-400 font-mono">{unit.unitKey}</td>
                          <td className="py-2 text-right font-mono">{unit.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center text-gray-400 py-4">
                  No units in this fleet
                </div>
              )}
            </div>
          </div>
        )}

        {currentView === 'dispatch' && empire && (
          <FleetDispatchForm
            fleet={fleet}
            empire={empire}
            onDispatch={handleDispatch}
            onCancel={() => setCurrentView('overview')}
            isDispatching={isDispatching}
          />
        )}

        {currentView === 'dispatch' && !empire && (
          <div className="p-4 bg-red-900/50 border border-red-700 rounded text-red-200">
            <div className="font-medium">Empire Data Required</div>
            <div className="text-sm mt-1">Empire information is required for fleet dispatch</div>
          </div>
        )}

        {currentView === 'movement' && movement && (
          <FleetMovementStatus
            movement={movement}
            fleetName={fleet.name}
            onRecall={handleRecall}
            onRefresh={handleRefreshStatus}
            showRecallOption={true}
          />
        )}

        {currentView === 'movement' && !movement && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 text-center">
            <div className="text-gray-400 mb-2">No movement data available</div>
            <button
              onClick={() => setCurrentView('overview')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Back to Overview
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FleetManagement;
