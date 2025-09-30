import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useEnhancedAppStore } from '../../stores/enhancedAppStore';

// Enhanced store compatible types
interface UniverseLocationData {
  coord: string;
  type: 'planet' | 'asteroid' | 'star';
  terrain?: {
    type: string;
  };
}

type PlanetVisualProps = {
  coord: string;
  className?: string;
};

const PlanetVisual: React.FC<PlanetVisualProps> = ({ coord, className }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UniverseLocationData | null>(null);
  
  // Enhanced store access for API calls
  const services = useEnhancedAppStore((state) => state.services);
  const gameApi = services?.gameApi;

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setData(null);

    if (!gameApi?.getLocationByCoord) {
      if (mounted) setError('Location API not available');
      setLoading(false);
      return;
    }

    gameApi
      .getLocationByCoord(coord)
      .then((res: any) => {
        if (!mounted) return;
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error || 'Failed to load planet visual.');
        }
      })
      .catch(() => {
        if (mounted) setError('Network error while loading planet visual.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [coord, gameApi?.getLocationByCoord]);

  const planetImageUrl = useMemo(() => {
    const base = (import.meta as any)?.env?.BASE_URL || './';
    const build = (name: string) => `${base}planets/${name}`;

    const terrainType = data?.terrain?.type;
    if (!terrainType) {
      // Fallbacks when terrain is not available
      const generalType = (data?.type || 'planet').toLowerCase();
      if (generalType === 'asteroid') return build('asteroid.svg');
      // Use a safe generic planet image we know exists
      return build('rocky.svg');
    }

    // List of terrains with PNG assets (capitalized)
    const pngTerrains = [
      'Arid',
      'Craters',
      'Crystalline',
      'Earthly',
      'Gaia',
      'Glacial',
      'Magma',
      'Metallic',
      'Oceanic',
      'Rocky',
      'Toxic',
      'Volcanic',
      // Extendable: add future PNG terrains here when artwork is ready
    ];

    if (pngTerrains.includes(terrainType)) {
      return build(`${terrainType}.png`);
    }

    // Fallback to SVG for remaining terrains
    return build(`${terrainType.toLowerCase()}.svg`);
  }, [data]);

  const sizeClass =
    className && className.trim().length > 0 ? className : 'w-56 h-56 md:w-64 md:h-64';

  if (loading) {
    return (
      <div
        className={`rounded-full ${sizeClass} animate-pulse bg-gray-600/40`}
        aria-label="Loading planet preview"
      />
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-full ${sizeClass} bg-gray-700 flex items-center justify-center text-xs text-gray-300`}
        aria-label="Planet preview unavailable"
        title={error}
      >
        Preview unavailable
      </div>
    );
  }

  return (
    <div className={`rounded-full shadow-lg ${sizeClass} overflow-hidden bg-black flex items-center justify-center`}>
      <img
        src={planetImageUrl}
        alt={`Image of ${data?.terrain?.type || data?.type || 'planet'}`}
        className="w-full h-full object-cover"
        aria-label="Planet preview"
      />
    </div>
  );
};

export default PlanetVisual;
