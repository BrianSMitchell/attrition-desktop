import React, { useEffect, useMemo, useState } from 'react';
import universeService, { UniverseLocationData } from '../../services/universeService';

type PlanetVisualProps = {
  coord: string;
  className?: string;
};

const PlanetVisual: React.FC<PlanetVisualProps> = ({ coord, className }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UniverseLocationData | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    setData(null);

    universeService
      .getLocationByCoord(coord)
      .then((res) => {
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
  }, [coord]);

  const planetVisualStyle = useMemo<React.CSSProperties>(() => {
    const type = data?.type || 'planet';
    const themes: Record<string, string> = {
      terrestrial:
        'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.2) 20%, #487a3a 21%, #2b4f28 60%, #132515 100%)',
      gas_giant:
        'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), rgba(255,255,255,0.15) 18%, #7a62b7 20%, #4f3a8a 58%, #2a174f 100%)',
      ice:
        'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.4) 22%, #78a9d6 23%, #3c6d99 60%, #1c3550 100%)',
      desert:
        'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.2) 18%, #e0b34a 20%, #a97a2a 60%, #5e3b10 100%)',
      volcanic:
        'radial-gradient(circle at 30% 30%, rgba(255,200,200,0.7), rgba(255,200,200,0.2) 20%, #cc2b2b 22%, #7a1e1e 60%, #330d0d 100%)',
      planet:
        'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), rgba(255,255,255,0.2) 20%, rgba(40,80,140,1) 21%, rgba(20,40,80,1) 60%, rgba(10,20,40,1) 100%)',
      asteroid:
        'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.6), rgba(255,255,255,0.2) 18%, #7b6f62 20%, #4a423b 60%, #26221e 100%)',
      star:
        'radial-gradient(circle at 30% 30%, rgba(255,255,200,0.9), rgba(255,255,200,0.4) 22%, #ffd27a 24%, #e0a53a 60%, #8a5a0a 100%)',
    };
    const background = themes[type] || themes.planet;
    return {
      background,
      boxShadow: '0 0 40px rgba(100,150,255,0.3), inset 0 0 30px rgba(0,0,0,0.6)',
    };
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
    <div
      className={`rounded-full shadow-lg ${sizeClass}`}
      style={planetVisualStyle}
      aria-label="Planet preview"
    />
  );
};

export default PlanetVisual;
