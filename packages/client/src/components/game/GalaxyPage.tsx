import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import useUniverseMapStore from '../../stores/universeMapStore';
import NavigationBreadcrumb from './map/NavigationBreadcrumb';
import UniverseMap from './UniverseMap';

const GalaxyPage: React.FC = () => {
  const { empire } = useAuthStore();
  const { selectedCoordinate, zoomLevel, navigateToUniverse, navigateToGalaxy, navigateToRegion } = useUniverseMapStore();

  return (
    <div className="space-y-4">
      <div className="game-card">
        <NavigationBreadcrumb
          selectedCoordinate={selectedCoordinate}
          zoomLevel={zoomLevel}
          onUniverse={navigateToUniverse}
          onGalaxy={navigateToGalaxy}
          onRegion={navigateToRegion}
        />
      </div>

      {empire ? (
        <div className="game-card p-0 h-[75vh] overflow-hidden">
          <UniverseMap empire={empire} />
        </div>
      ) : (
        <div className="game-card border-2 border-yellow-500">
          <p className="text-yellow-300">
            You need to create an empire before using the universe map.
          </p>
        </div>
      )}
    </div>
  );
};

export default GalaxyPage;
