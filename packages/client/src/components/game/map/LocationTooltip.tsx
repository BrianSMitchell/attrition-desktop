import React from 'react';
import useUniverseMapStore from '../../../stores/universeMapStore';

interface LocationTooltipProps {
  location: any;
  position: { x: number; y: number };
}

const LocationTooltip: React.FC<LocationTooltipProps> = ({ location, position }) => {
  if (!location) return null;
  const { showOverhaulData } = useUniverseMapStore();

  const getLocationIcon = (type: string) => {
    return type === 'planet' ? '🌍' : '☄️';
  };



  // Position tooltip to avoid going off screen
  const tooltipStyle = {
    left: position.x + 15,
    top: position.y - 10,
    transform: position.x > window.innerWidth - 300 ? 'translateX(-100%)' : 'none'
  };

  return (
    <div 
      className="absolute z-50 bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg pointer-events-none"
      style={tooltipStyle}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getLocationIcon(location.type)}</span>
        <div>
          <div className="text-white font-semibold">{location.coord}</div>
          <div className="text-xs text-gray-400 capitalize">{location.type}</div>
        </div>
      </div>

      {/* Owner */}
      <div className="mb-2">
        <span className="text-gray-400 text-sm">Owner: </span>
        <span className={location.owner ? 'text-red-400' : 'text-green-400'}>
          {location.owner ? location.owner.username : 'Unowned'}
        </span>
      </div>

      {/* Properties */}
      <div className="space-y-1">

      {/* Overhaul Data (optional) */}
      {showOverhaulData && (
        <div className="mt-2 pt-2 border-t border-gray-600 space-y-1">
          <div className="text-xs text-blue-300 font-semibold">Overhaul</div>

          {/* Body-level (planets/asteroids) */}
          {location.terrain && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Terrain:</span>
                <span className="text-sm text-gray-200">{location.terrain?.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Orbit Pos:</span>
                <span className="text-sm text-gray-200">{location.orbitPosition ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Solar Energy:</span>
                <span className="text-sm text-gray-200">{location.result?.solarEnergy ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Fertility:</span>
                <span className="text-sm text-gray-200">{location.result?.fertility ?? '—'}</span>
              </div>
              {location.result?.yields && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Yields (M/G/C):</span>
                  <span className="text-sm text-gray-200">
                    {location.result.yields.metal}/{location.result.yields.gas}/{location.result.yields.crystals}
                  </span>
                </div>
              )}
              {typeof location.result?.area === 'number' && (
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Area:</span>
                  <span className="text-sm text-gray-200">{location.result.area}</span>
                </div>
              )}
            </>
          )}

          {/* Star-level */}
          {location.starOverhaul?.kind && (
            <>
              <div className="flex justify-between">
                <span className="text-gray-400 text-sm">Star Kind:</span>
                <span className="text-sm text-yellow-300">{location.starOverhaul.kind}</span>
              </div>
            </>
          )}
        </div>
      )}

      </div>

      {/* Context Information */}
      {location.context && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400">
            Galaxy {location.context.galaxy} • Region {location.context.region} • System {location.context.system} • Body {location.context.body}
          </div>
        </div>
      )}

      {/* Additional Info */}
      {location.buildings && location.buildings.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400 mb-1">Buildings:</div>
          <div className="text-xs text-blue-400">
            {location.buildings.length} structure{location.buildings.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {location.fleets && location.fleets.length > 0 && (
        <div className="mt-2 pt-2 border-t border-gray-600">
          <div className="text-xs text-gray-400 mb-1">Fleets:</div>
          <div className="text-xs text-red-400">
            {location.fleets.length} fleet{location.fleets.length !== 1 ? 's' : ''} present
          </div>
        </div>
      )}

    </div>
  );
};

export default LocationTooltip;
