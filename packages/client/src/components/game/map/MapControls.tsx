import React, { useState } from 'react';
import { Empire, CoordinateComponents } from '@game/shared';
import useUniverseMapStore from '../../../stores/universeMapStore';

// Local validation function to avoid import issues
const isValidCoordinate = (coordStr: string): boolean => {
  const coordRegex = /^([A-Z])(\d{2}):(\d{2}):(\d{2}):(\d{2})$/;
  const match = coordStr.match(coordRegex);
  
  if (!match) return false;
  
  const galaxy = parseInt(match[2], 10);
  const region = parseInt(match[3], 10);
  const system = parseInt(match[4], 10);
  const body = parseInt(match[5], 10);
  
  return (
    galaxy >= 0 && galaxy <= 39 &&
    region >= 0 && region <= 99 &&
    system >= 0 && system <= 99 &&
    body >= 0 && body <= 19
  );
};

// Local parseCoord function to avoid import issues
const parseCoord = (coordStr: string): CoordinateComponents => {
  const coordRegex = /^([A-Z])(\d{2}):(\d{2}):(\d{2}):(\d{2})$/;
  const match = coordStr.match(coordRegex);
  
  if (!match) {
    throw new Error(`Invalid coordinate format: ${coordStr}`);
  }
  
  return {
    server: match[1],
    galaxy: parseInt(match[2], 10),
    region: parseInt(match[3], 10),
    system: parseInt(match[4], 10),
    body: parseInt(match[5], 10)
  };
};

interface MapControlsProps {
  empire: Empire;
  onNavigate: (coord: CoordinateComponents) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const MapControls: React.FC<MapControlsProps> = ({ empire, onNavigate }) => {
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  
  const {
    zoomLevel,
    selectedCoordinate,
    showGrid,
    showTerritories,
    showFleets,
    showResources,
    showOverhaulData,
    toggleGrid,
    toggleTerritories,
    toggleFleets,
    toggleResources,
    toggleOverhaulData
  } = useUniverseMapStore();

  const handleSearch = () => {
    if (!searchInput.trim()) {
      setSearchError('Please enter a coordinate');
      return;
    }

    try {
      if (!isValidCoordinate(searchInput.trim())) {
        setSearchError('Invalid coordinate format. Use A00:10:22:10');
        return;
      }

      const coord = parseCoord(searchInput.trim());
      onNavigate(coord);
      setSearchError(null);
      setSearchInput('');
    } catch (error) {
      setSearchError('Invalid coordinate format. Use A00:10:22:10');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const navigateToHome = () => {
    if (empire.homeSystem) {
      try {
        const coord = parseCoord(empire.homeSystem);
        onNavigate(coord);
      } catch (error) {
        console.error('Invalid home system coordinate:', empire.homeSystem);
      }
    }
  };

  const generateRandomCoordinate = () => {
    const servers = ['A'];
    const server = servers[Math.floor(Math.random() * servers.length)];
    const galaxy = Math.floor(Math.random() * 40).toString().padStart(2, '0');
    const region = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const system = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    const body = Math.floor(Math.random() * 20).toString().padStart(2, '0');
    
    const randomCoord = `${server}${galaxy}:${region}:${system}:${body}`;
    setSearchInput(randomCoord);
  };

  return (
    <div className="absolute top-4 left-4 right-4 z-10">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search Controls */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 flex-1">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value.toUpperCase());
                  setSearchError(null);
                }}
                onKeyPress={handleKeyPress}
                placeholder="Enter coordinate (A00:10:22:10)"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                maxLength={11}
              />
              {searchError && (
                <p className="text-red-400 text-xs mt-1">{searchError}</p>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleSearch}
                disabled={!searchInput.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm whitespace-nowrap"
              >
                🔍 Search
              </button>
              
              <button
                onClick={generateRandomCoordinate}
                className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                title="Random Location"
              >
                🎲
              </button>
              
              <button
                onClick={navigateToHome}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                title="Home System"
              >
                🏠
              </button>
            </div>
          </div>
        </div>

        {/* View Controls */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={toggleGrid}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                showGrid
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Toggle Grid"
            >
              📐 Grid
            </button>
            
            <button
              onClick={toggleTerritories}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                showTerritories
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Toggle Territories"
            >
              🏛️ Territories
            </button>
            
            <button
              onClick={toggleFleets}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                showFleets
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Toggle Fleets"
            >
              🚀 Fleets
            </button>
            
            <button
              onClick={toggleResources}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                showResources
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Toggle Resources"
            >
              💎 Resources
            </button>

            <button
              onClick={toggleOverhaulData}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                showOverhaulData
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              title="Toggle Overhaul Data"
            >
              🧪 Overhaul
            </button>
          </div>
        </div>

        {/* Navigation Info */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
          <div className="text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <span className="text-gray-400">View:</span>
              <span className="capitalize font-medium text-blue-400">{zoomLevel}</span>
            </div>
            {selectedCoordinate && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-gray-400">Location:</span>
                <span className="font-mono text-yellow-400 text-xs">
                  {selectedCoordinate.server}{selectedCoordinate.galaxy.toString().padStart(2, '0')}:
                  {selectedCoordinate.region.toString().padStart(2, '0')}:
                  {selectedCoordinate.system.toString().padStart(2, '0')}:
                  {selectedCoordinate.body.toString().padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapControls;
