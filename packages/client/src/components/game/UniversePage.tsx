import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../stores/enhancedAppStore';
import useUniverseMapStore from '../../stores/universeMapStore';
import UniverseMap from './map-next/UniverseMapLoader';
import type { MapViewLevel } from './map-next/types';
import { getLevelFromViewParam, getViewParamFromLevel } from './map-next/query';

const UniversePage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useAuth();
  const { navigateToGalaxy, navigateToUniverse } = useUniverseMapStore();

  React.useEffect(() => { 
    console.log('[UniversePage] Component mounted, calling navigateToUniverse');
    navigateToUniverse(); 
  }, [navigateToUniverse]);

  const [searchParams] = useSearchParams();
  const viewParam = searchParams.get('view');
  const initialLevel = getLevelFromViewParam(viewParam, 'universe' as MapViewLevel);

  // Breadcrumb context
  const serverLetter = React.useMemo(() => {
    const hs = (auth as any)?.empire?.homeSystem as string | undefined;
    if (hs && typeof hs === 'string' && hs.length >= 1) return hs[0].toUpperCase();
    return 'A';
  }, [auth]);

  const handleSelectLocation = React.useCallback((loc: any) => {
    if (loc.level === 'galaxy' && typeof loc.galaxy === 'number') {
      navigateToGalaxy(loc.galaxy);
      navigate('/galaxy?view=galaxy');
    }
  }, [navigate, navigateToGalaxy]);

  const handleViewChange = React.useCallback((level: MapViewLevel) => {
    const currentParams = new URLSearchParams(window.location.search);
    const current = currentParams.get('view');
    const nextParam = getViewParamFromLevel(level as MapViewLevel);
    if (current !== nextParam) {
      currentParams.set('view', nextParam);
      navigate({ search: `?${currentParams.toString()}` }, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-empire-gold">Universe — Server {serverLetter}</h2>
        <p className="text-gray-400 text-sm">Click a galaxy to explore its regions</p>
      </div>

      <div className="game-card p-0 h-[75vh] overflow-hidden">
        <React.Suspense fallback={<div className="p-4 text-center">Loading map…</div>}>
          <UniverseMap
            initialView={{ level: initialLevel }}
            onSelectLocation={handleSelectLocation}
            onViewChange={handleViewChange}
          />
        </React.Suspense>
      </div>
    </div>
  );
};

export default UniversePage;
