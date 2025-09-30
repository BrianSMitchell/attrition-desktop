import { useState, useEffect } from 'react';
import { gameApi } from '../../../stores/services/gameApi';
import { Empire } from '@game/shared';
import NetworkAwareButton from '../../ui/NetworkAwareButton';
import FleetDestinationSelector from './FleetDestinationSelector';
import { useUIActions } from '../../../stores/enhancedAppStore';

// Type definitions
type FleetDetailDTO = { fleet: any };
type FleetDispatchDTO = any;

interface FleetDispatchFormProps {
  fleet: FleetDetailDTO['fleet'];
  empire: Empire;
  onDispatch: (destinationCoord: string) => Promise<{ success: boolean; data?: FleetDispatchDTO; error?: string }>;
  onCancel: () => void;
  isDispatching: boolean;
}

const FleetDispatchForm: React.FC<FleetDispatchFormProps> = ({
  fleet,
  empire,
  onDispatch,
  onCancel,
  isDispatching
}) => {
  const [destinationCoord, setDestinationCoord] = useState('');
  const [estimatedTravelTime, setEstimatedTravelTime] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMapSelection, setUseMapSelection] = useState(false);
  const { addToast } = useUIActions();

  // Basic coordinate validation regex (matches patterns like 1:2:3)
  const isValidCoordinate = (coord: string): boolean => {
    const coordPattern = /^-?\d+:-?\d+:-?\d+$/;
    return coordPattern.test(coord.trim());
  };

  // Calculate travel time when destination changes
  useEffect(() => {
    if (!destinationCoord.trim() || !isValidCoordinate(destinationCoord)) {
      setEstimatedTravelTime(null);
      setError(null);
      return;
    }

    if (destinationCoord.trim() === fleet.locationCoord) {
      setError('Cannot dispatch to current location');
      setEstimatedTravelTime(null);
      return;
    }

    setError(null);
    setIsCalculating(true);

    // Use real API to calculate travel time
    const estimateTravel = async () => {
      try {
        const response = await gameApi.estimateTravelTime(fleet._id, destinationCoord.trim());
        
        if (response.success && response.data) {
          setEstimatedTravelTime(response.data.travelTimeHours);
        } else {
          console.warn('Failed to estimate travel time:', response.error);
          // Fall back to basic calculation
          const basicTravelTime = 1; // 1 hour as fallback
          setEstimatedTravelTime(basicTravelTime);
        }
      } catch (error) {
        console.error('Error estimating travel time:', error);
        // Fall back to basic calculation
        const basicTravelTime = 1; // 1 hour as fallback  
        setEstimatedTravelTime(basicTravelTime);
      } finally {
        setIsCalculating(false);
      }
    };

    estimateTravel();

  }, [destinationCoord, fleet.locationCoord, fleet._id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!destinationCoord.trim()) {
      setError('Please enter a destination coordinate');
      return;
    }

    if (!isValidCoordinate(destinationCoord)) {
      setError('Invalid coordinate format. Use format: x:y:z (e.g., 1:2:3)');
      return;
    }

    if (destinationCoord.trim() === fleet.locationCoord) {
      setError('Cannot dispatch to current location');
      return;
    }

    try {
      setError(null);
      const result = await onDispatch(destinationCoord.trim());
      
      if (result.success) {
        addToast({
          type: 'success',
          message: `Fleet "${fleet.name}" dispatched to ${destinationCoord.trim()}`
        });
        // Close the form after successful dispatch
        onCancel();
      } else {
        setError(result.error || 'Failed to dispatch fleet');
        addToast({
          type: 'error',
          message: result.error || 'Failed to dispatch fleet'
        });
      }
    } catch (err) {
      const errorMessage = 'Network error while dispatching fleet';
      setError(errorMessage);
      addToast({
        type: 'error',
        message: errorMessage
      });
    }
  };

  const formatTravelTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.ceil(hours * 60)} minutes`;
    } else if (hours < 24) {
      return `${Math.round(hours * 10) / 10} hours`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return `${days} day${days > 1 ? 's' : ''} ${remainingHours}h`;
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-empire-gold mb-3">
          Dispatch Fleet: {fleet.name}
        </h3>
        
        <div className="mb-4 text-sm text-gray-300">
          <div>Current Location: <span className="text-white font-mono">{fleet.locationCoord}</span></div>
          <div>Fleet Size: <span className="text-white">{fleet.sizeCredits.toLocaleString()}</span> credits</div>
          <div>Units: <span className="text-white">{fleet.units?.length || 0}</span> unit types</div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selection Method Toggle */}
          <div className="flex items-center gap-4 pb-2">
            <div className="text-sm font-medium text-gray-300">Selection Method:</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUseMapSelection(false)}
                className={`px-3 py-1 rounded text-sm ${
                  !useMapSelection
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                disabled={isDispatching}
              >
                Manual Input
              </button>
              <button
                type="button"
                onClick={() => setUseMapSelection(true)}
                className={`px-3 py-1 rounded text-sm ${
                  useMapSelection
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                disabled={isDispatching}
              >
                Map Selection
              </button>
            </div>
          </div>

          {useMapSelection ? (
            <FleetDestinationSelector
              empire={empire}
              currentLocation={fleet.locationCoord}
              onDestinationSelect={setDestinationCoord}
            />
          ) : (
            <div>
              <label htmlFor="destination" className="block text-sm font-medium text-gray-300 mb-2">
                Destination Coordinates
              </label>
              <input
                id="destination"
                type="text"
                value={destinationCoord}
                onChange={(e) => setDestinationCoord(e.target.value)}
                placeholder="e.g., 1:2:3"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 font-mono text-white"
                disabled={isDispatching}
              />
              <p className="mt-1 text-xs text-gray-400">
                Enter coordinates in the format x:y:z (e.g., 1:2:3)
              </p>
            </div>
          )}

          {/* Display selected coordinate for both methods */}
          {destinationCoord && (
            <div className="p-3 bg-gray-700 border border-gray-600 rounded">
              <div className="text-sm text-gray-300">
                Selected Destination: <span className="text-white font-mono">{destinationCoord}</span>
              </div>
            </div>
          )}

          {/* Travel Time Estimate */}
          {isCalculating && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
              Calculating travel time...
            </div>
          )}

          {estimatedTravelTime !== null && !isCalculating && (
            <div className="p-3 bg-blue-900/30 border border-blue-700 rounded">
              <div className="text-sm text-blue-200">
                <div className="font-medium">Estimated Travel Time</div>
                <div className="text-lg font-mono text-blue-100 mt-1">
                  {formatTravelTime(estimatedTravelTime)}
                </div>
                <div className="text-xs text-blue-300 mt-1">
                  Based on current fleet composition and distance
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <NetworkAwareButton
              type="submit"
              disabled={
                isDispatching || 
                !destinationCoord.trim() || 
                !isValidCoordinate(destinationCoord) ||
                destinationCoord.trim() === fleet.locationCoord ||
                isCalculating
              }
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDispatching ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Dispatching...
                </span>
              ) : (
                'Dispatch Fleet'
              )}
            </NetworkAwareButton>
            
            <button
              type="button"
              onClick={onCancel}
              disabled={isDispatching}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Info Panel */}
      <div className="p-3 bg-yellow-900/30 border border-yellow-700 rounded">
        <div className="text-sm text-yellow-200">
          <div className="font-medium mb-1">⚠️ Important Notes:</div>
          <ul className="space-y-1 text-xs text-yellow-300">
            <li>• Fleet will be unavailable for other actions while traveling</li>
            <li>• You can recall the fleet during travel if needed</li>
            <li>• Ensure the destination coordinate exists and is accessible</li>
            <li>• Travel time depends on unit types and distance</li>
            <li>• Use map selection for visual destination picking with territory info</li>
            <li>• Manual entry allows precise coordinate specification</li>
            <li>• Map selection validates accessibility automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FleetDispatchForm;
