import React from 'react';
import { CoordinateComponents } from '@game/shared';
import { MapZoomLevel } from '../../../stores/universeMapStore';

interface NavigationBreadcrumbProps {
  selectedCoordinate: CoordinateComponents | null;
  zoomLevel: MapZoomLevel;
  onUniverse: () => void;
  onGalaxy: (galaxy: number) => void;
  onRegion: (galaxy: number, region: number) => void;
}

const NavigationBreadcrumb: React.FC<NavigationBreadcrumbProps> = ({
  selectedCoordinate,
  zoomLevel,
  onUniverse,
  onGalaxy,
  onRegion
}) => {
  if (!selectedCoordinate) {
    return (
      <div className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-bold text-lg">Universe Overview</span>
          <span className="text-gray-400 text-sm">(Select a galaxy to explore)</span>
        </div>
      </div>
    );
  }


  const handleUniverseClick = () => {
    onUniverse();
  };

  const handleGalaxyClick = () => {
    onGalaxy(selectedCoordinate.galaxy);
  };

  const handleRegionClick = () => {
    onRegion(selectedCoordinate.galaxy, selectedCoordinate.region);
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-3">
      <div className="flex items-center gap-2 text-lg">
        {/* Universe Level */}
        <button
          onClick={handleUniverseClick}
          className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
        >
          Universe
        </button>

        {/* Galaxy Level */}
        {selectedCoordinate.galaxy >= 0 && (
          <>
            <span className="text-gray-400">{'>'}</span>
            <button
              onClick={handleGalaxyClick}
              className={`transition-colors font-medium ${
                zoomLevel === 'galaxy' || zoomLevel === 'universe'
                  ? 'text-yellow-400'
                  : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              Galaxy {selectedCoordinate.server}{selectedCoordinate.galaxy.toString().padStart(2, '0')}
            </button>
          </>
        )}

        {/* Region Level */}
        {selectedCoordinate.region >= 0 && zoomLevel !== 'universe' && zoomLevel !== 'galaxy' && (
          <>
            <span className="text-gray-400">{'>'}</span>
            <button
              onClick={handleRegionClick}
              className={`transition-colors font-medium ${
                zoomLevel === 'region'
                  ? 'text-yellow-400'
                  : 'text-blue-400 hover:text-blue-300'
              }`}
            >
              Region {selectedCoordinate.region.toString().padStart(2, '0')}
            </button>
          </>
        )}

        {/* System Level */}
        {selectedCoordinate.system >= 0 && zoomLevel === 'system' && (
          <>
            <span className="text-gray-400">{'>'}</span>
            <span className="text-yellow-400 font-medium">
              System {selectedCoordinate.system.toString().padStart(2, '0')}
            </span>
          </>
        )}

      </div>

    </div>
  );
};

export default NavigationBreadcrumb;
