import React, { useState, useEffect } from 'react';
import { Empire, CoordinateComponents } from '@game/shared';
import useUniverseMapStore from '../../../stores/universeMapStore';
import { useEnhancedAppStore } from '../../../stores/enhancedAppStore';
import UniverseMap from '../map-next/UniverseMapLoader';

interface FleetDestinationSelectorProps {
  empire: Empire;
  currentLocation: string;
  onDestinationSelect: (coordinate: string) => void;
}

const FleetDestinationSelector: React.FC<FleetDestinationSelectorProps> = ({
  empire,
  currentLocation,
  onDestinationSelect
}) => {
  const [selectedCoordinate, setSelectedCoordinate] = useState<string>('');
  const [coordinateInput, setCoordinateInput] = useState('');
  const [validatingLocation, setValidatingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'input'>('map');
  const {
    selectedCoordinate: mapSelectedCoordinate,
    navigateToCoordinate,
    navigateToUniverse
  } = useUniverseMapStore();
  
  // Enhanced store access for API calls
  const services = useEnhancedAppStore((state) => state.services);
  const gameApi = services?.gameApi;

  // Convert coordinate string to components for map navigation
  const parseCoordinate = (coord: string): CoordinateComponents | null => {
    try {
      // Format: A00:12:34:56 -> server A, galaxy 0, region 12, system 34, body 56
      const match = coord.match(/^([A-Z])(\d{2}):(\d{2}):(\d{2}):(\d{2})$/);
      if (!match) return null;
      
      const [, server, galaxy, region, system, body] = match;
      return {
        server,
        galaxy: parseInt(galaxy),
        region: parseInt(region),
        system: parseInt(system),
        body: parseInt(body)
      };
    } catch {
      return null;
    }
  };

  // Convert map coordinate to string format
  const formatCoordinateFromMap = (coord: CoordinateComponents): string => {
    const galaxy = coord.galaxy.toString().padStart(2, '0');
    const region = coord.region.toString().padStart(2, '0');
    const system = coord.system.toString().padStart(2, '0');
    const body = coord.body.toString().padStart(2, '0');
    return `${coord.server}${galaxy}:${region}:${system}:${body}`;
  };

  // Validate coordinate format
  const isValidCoordinate = (coord: string): boolean => {
    return /^[A-Z]\d{2}:\d{2}:\d{2}:\d{2}$/.test(coord);
  };

  // Validate that destination exists and is reachable
  const validateDestination = async (coord: string) => {
    if (coord === currentLocation) {
      setLocationError('Cannot dispatch to current location');
      return false;
    }

    if (!isValidCoordinate(coord)) {
      setLocationError('Invalid coordinate format. Use format: A00:12:34:56');
      return false;
    }
    
    if (!gameApi?.getLocationByCoord) {
      setLocationError('Location validation API not available');
      return false;
    }

    setValidatingLocation(true);
    setLocationError(null);

    try {
      const response = await gameApi!.getLocationByCoord(coord);
      if (response.success && response.data) {
        // Check if location exists and is accessible
        if (response.data.type === 'planet' || response.data.type === 'asteroid') {
          setValidatingLocation(false);
          return true;
        } else {
          setLocationError('Invalid destination type. Can only travel to planets or asteroids.');
        }
      } else {
        setLocationError('Destination not found or inaccessible');
      }
    } catch (error) {
      setLocationError('Network error while validating destination');
    }
    
    setValidatingLocation(false);
    return false;
  };

  // Handle manual coordinate input
  const handleCoordinateInput = async () => {
    if (!coordinateInput.trim()) {
      setLocationError('Please enter a coordinate');
      return;
    }

    const isValid = await validateDestination(coordinateInput.trim());
    if (isValid) {
      setSelectedCoordinate(coordinateInput.trim());
      
      // Also navigate the map to this coordinate
      const coordComponents = parseCoordinate(coordinateInput.trim());
      if (coordComponents) {
        navigateToCoordinate(coordComponents);
      }
    }
  };

  // Handle map-based selection
  const handleMapSelection = async () => {
    if (!mapSelectedCoordinate) {
      setLocationError('Please select a location on the map');
      return;
    }

    const coordString = formatCoordinateFromMap(mapSelectedCoordinate);
    const isValid = await validateDestination(coordString);
    if (isValid) {
      setSelectedCoordinate(coordString);
      setCoordinateInput(coordString);
    }
  };

  // Handle destination confirmation
  const handleConfirmDestination = () => {
    if (selectedCoordinate) {
      onDestinationSelect(selectedCoordinate);
    }
  };

  // Initialize map to show current fleet location
  useEffect(() => {
    const currentCoordComponents = parseCoordinate(currentLocation);
    if (currentCoordComponents) {
      navigateToCoordinate(currentCoordComponents);
    }
  }, [currentLocation]);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-empire-gold mb-4">
          Select Fleet Destination
        </h3>

        {/* Current Location Display */}
        <div className="mb-4 p-3 bg-gray-700 rounded border border-gray-600">
          <div className="text-sm text-gray-400">Current Location</div>
          <div className="text-white font-mono text-lg">{currentLocation}</div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex mb-4 bg-gray-700 p-1 rounded">
          <button
            onClick={() => setViewMode('map')}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
          >
            🗺️ Map Selection
          </button>
          <button
            onClick={() => setViewMode('input')}
            className={`flex-1 py-2 px-4 rounded text-sm font-medium transition-colors ${
              viewMode === 'input'
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-600'
            }`}
          >
            ⌨️ Manual Input
          </button>
        </div>

        {/* Map View Mode */}
        {viewMode === 'map' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-900/30 border border-blue-700 rounded text-blue-200 text-sm">
              <div className="font-medium mb-1">📍 Map Navigation</div>
              <ul className="text-xs space-y-1 text-blue-300">
                <li>• Navigate through different zoom levels (Universe → Galaxy → Region → System)</li>
                <li>• Click on a location to select it as destination</li>
                <li>• Use zoom controls or click areas to navigate</li>
                <li>• Selected coordinate: {mapSelectedCoordinate ? formatCoordinateFromMap(mapSelectedCoordinate) : 'None'}</li>
              </ul>
            </div>

            {/* Map Container */}
            <div className="border border-gray-600 rounded-lg overflow-hidden bg-gray-900">
              <div className="h-96">
<React.Suspense fallback={<div className="p-4 text-center">Loading map…</div>}>
                  <UniverseMap />
                </React.Suspense>
              </div>
            </div>

            {/* Map Selection Controls */}
            <div className="flex gap-3">
              <button
                onClick={handleMapSelection}
                disabled={!mapSelectedCoordinate || validatingLocation}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validatingLocation ? 'Validating...' : 'Use Selected Location'}
              </button>
              <button
                onClick={navigateToUniverse}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Reset Map View
              </button>
            </div>
          </div>
        )}

        {/* Manual Input Mode */}
        {viewMode === 'input' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Destination Coordinate
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={coordinateInput}
                  onChange={(e) => {
                    setCoordinateInput(e.target.value.toUpperCase());
                    setLocationError(null);
                  }}
                  placeholder="A00:12:34:56"
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500 font-mono text-white"
                  maxLength={12}
                />
                <button
                  onClick={handleCoordinateInput}
                  disabled={validatingLocation || !coordinateInput.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {validatingLocation ? 'Validating...' : 'Validate'}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Format: ServerGalaxy:Region:System:Body (e.g., A00:12:34:56)
              </p>
            </div>

            {/* Quick Options */}
            <div className="space-y-2">
              <div className="text-sm text-gray-400">Quick Options:</div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCoordinateInput(empire.homeSystem || '')}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  disabled={!empire.homeSystem}
                >
                  🏠 Home System
                </button>
                <button
                  onClick={() => {
                    const coords = ['A01:15:25:10', 'A02:30:45:15', 'B00:10:20:05'];
                    const randomCoord = coords[Math.floor(Math.random() * coords.length)];
                    setCoordinateInput(randomCoord);
                  }}
                  className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                >
                  🎲 Random Location
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {locationError && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded text-red-200 text-sm">
            {locationError}
          </div>
        )}

        {/* Selected Destination Display */}
        {selectedCoordinate && !locationError && (
          <div className="p-3 bg-green-900/30 border border-green-700 rounded">
            <div className="text-sm text-green-200">
              <div className="font-medium mb-1">✅ Valid Destination Selected</div>
              <div className="font-mono text-green-100">{selectedCoordinate}</div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={handleConfirmDestination}
            disabled={!selectedCoordinate || !!locationError}
            className="flex-1 bg-green-600 text-white px-4 py-3 rounded font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🎯 Confirm Destination
          </button>
        </div>

        {/* Help Information */}
        <div className="mt-4 p-3 bg-gray-700/50 border border-gray-600 rounded">
          <div className="text-sm text-gray-300">
            <div className="font-medium mb-1">💡 Navigation Tips:</div>
            <ul className="text-xs space-y-1 text-gray-400">
              <li>• Use the map view for visual destination selection</li>
              <li>• Use manual input for precise coordinate entry</li>
              <li>• Fleet can only travel to accessible planets and asteroids</li>
              <li>• Coordinate format: Server + Galaxy(2) + Region(2) + System(2) + Body(2)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetDestinationSelector;
