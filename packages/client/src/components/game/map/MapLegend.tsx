import React from 'react';
import { MapZoomLevel } from '../../../stores/universeMapStore';

interface MapLegendProps {
  zoomLevel: MapZoomLevel;
  showGrid: boolean;
  showTerritories: boolean;
  showFleets: boolean;
  showResources: boolean;
}

const MapLegend: React.FC<MapLegendProps> = ({
  zoomLevel,
  showGrid,
  showTerritories,
  showFleets,
  showResources
}) => {
  const getLegendItems = () => {
    const items = [];

    switch (zoomLevel) {
      case 'universe':
        items.push(
          { color: '#C8C8FF', label: 'Galaxy Spiral Arms', symbol: '〜' },
          { color: '#FFFF80', label: 'Galaxy Core', symbol: '●' }
        );
        if (showTerritories) {
          items.push({ color: '#00FF00', label: 'Empire Territory', symbol: '⬜' });
        }
        break;

      case 'galaxy':
        items.push(
          { color: '#404080', label: 'Region', symbol: '⬜' },
          { color: '#FFFF80', label: 'Star Systems', symbol: '·' }
        );
        if (showTerritories) {
          items.push({ color: '#00FF00', label: 'Controlled Region', symbol: '⬜' });
        }
        break;

      case 'region':
        items.push(
          { color: '#FFD700', label: 'Yellow Star', symbol: '●' },
          { color: '#FF4500', label: 'Red Star', symbol: '●' },
          { color: '#4169E1', label: 'Blue Star', symbol: '●' },
          { color: '#FFFFFF', label: 'White Star', symbol: '●' }
        );
        if (showTerritories) {
          items.push({ color: '#00FF00', label: 'Controlled System', symbol: '⬜' });
        }
        break;

      case 'system':
        items.push(
          { color: '#FFFF00', label: 'Central Star', symbol: '●' },
          { color: '#8B4513', label: 'Rocky Planet', symbol: '●' },
          { color: '#4682B4', label: 'Water World', symbol: '●' },
          { color: '#228B22', label: 'Garden World', symbol: '●' },
          { color: '#9370DB', label: 'Gas Giant', symbol: '●' },
          { color: '#8B7355', label: 'Asteroid', symbol: '·' }
        );
        if (showResources) {
          items.push(
            { color: '#C0C0C0', label: 'Metal (M)', symbol: 'M' },
            { color: '#4169E1', label: 'Energy (E)', symbol: 'E' },
            { color: '#9370DB', label: 'Research (R)', symbol: 'R' }
          );
        }
        break;
    }

    if (showFleets && zoomLevel !== 'universe') {
      items.push({ color: '#FF6B6B', label: 'Fleet', symbol: '🚀' });
    }

    return items;
  };

  const getNavigationHelp = () => {
    switch (zoomLevel) {
      case 'universe':
        return 'Click on a galaxy to zoom in';
      case 'galaxy':
        return 'Click on a region to zoom in';
      case 'region':
        return 'Click on a star system to zoom in';
      case 'system':
        return 'Click on planets/asteroids for details';
      default:
        return '';
    }
  };

  const legendItems = getLegendItems();
  const navigationHelp = getNavigationHelp();

  return (
    <div className="absolute top-20 right-4 bg-gray-800 border border-gray-600 rounded-lg p-4 max-w-xs">
      {/* Legend Title */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-white font-semibold">Map Legend</span>
        <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded capitalize">
          {zoomLevel}
        </span>
      </div>

      {/* Legend Items */}
      <div className="space-y-2 mb-4">
        {legendItems.map((item, index) => (
          <div key={index} className="flex items-center gap-3 text-sm">
            <div 
              className="w-3 h-3 rounded-sm flex items-center justify-center text-xs font-bold"
              style={{ backgroundColor: item.color, color: item.color === '#FFFFFF' ? '#000' : '#FFF' }}
            >
              {item.symbol === '●' || item.symbol === '·' ? '' : item.symbol}
            </div>
            <span className="text-gray-300">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Active Filters */}
      <div className="border-t border-gray-600 pt-3 mb-3">
        <div className="text-xs text-gray-400 mb-2">Active Filters:</div>
        <div className="flex flex-wrap gap-1">
          {showGrid && (
            <span className="text-xs px-2 py-1 bg-blue-600 text-white rounded">Grid</span>
          )}
          {showTerritories && (
            <span className="text-xs px-2 py-1 bg-green-600 text-white rounded">Territories</span>
          )}
          {showFleets && (
            <span className="text-xs px-2 py-1 bg-red-600 text-white rounded">Fleets</span>
          )}
          {showResources && (
            <span className="text-xs px-2 py-1 bg-purple-600 text-white rounded">Resources</span>
          )}
        </div>
      </div>

      {/* Navigation Help */}
      {navigationHelp && (
        <div className="border-t border-gray-600 pt-3">
          <div className="text-xs text-gray-400 mb-1">Navigation:</div>
          <div className="text-xs text-gray-300">{navigationHelp}</div>
        </div>
      )}

      {/* Controls Help */}
      <div className="border-t border-gray-600 pt-3 mt-3">
        <div className="text-xs text-gray-400 mb-1">Controls:</div>
        <div className="text-xs text-gray-300 space-y-1">
          <div>• Mouse wheel: Zoom</div>
          <div>• Click & drag: Pan</div>
          <div>• +/- buttons: Zoom levels</div>
        </div>
      </div>
    </div>
  );
};

export default MapLegend;
