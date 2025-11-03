import React from 'react';
import { useAuth } from '../../stores/enhancedAppStore';
import useUniverseMapStore from '../../stores/universeMapStore';
import UniverseMap from './map-next/UniverseMapLoader';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getLevelFromViewParam, getViewParamFromLevel } from './map-next/query';
import type { MapViewLevel } from './map-next/types';

// Coordinate validation utilities removed - not currently used in PIXI map implementation

// Helper function to extract regions where user has bases
const getUserRegions = (empire: any) => {
  const regions: Array<{ region: number; type: 'base' | 'home'; count: number }> = [];
  
  if (!empire) return regions;
  
  // Extract home region from homeSystem coordinate
  if (empire.homeSystem) {
    console.log('[getUserRegions] Raw homeSystem coordinate:', empire.homeSystem);
    const parts = empire.homeSystem.split(':');
    console.log('[getUserRegions] Split parts:', parts);
    if (parts.length >= 3) {
      // Actual format: "A00:00:12:03" -> Server+Galaxy "A00", Region "00", System "12", Body "03"
      // Server and galaxy are concatenated in first part (e.g., "A00")
      const serverGalaxyStr = parts[0]; // "A00" (server letter + 2-digit galaxy)
      const regionStr = parts[1];       // "00" - this is the region!
      const systemStr = parts[2];       // "12"
      const bodyStr = parts[3];         // "03" (optional)
      console.log('[getUserRegions] Parsed components:', { 
        serverGalaxy: serverGalaxyStr, 
        region: regionStr, 
        system: systemStr, 
        body: bodyStr 
      });
      
      const homeRegion = parseInt(regionStr, 10);
      if (!isNaN(homeRegion)) {
        regions.push({ region: homeRegion, type: 'home', count: 1 });
        console.log('[getUserRegions] Parsed home region:', homeRegion, 'from coordinate:', empire.homeSystem);
      }
    }
  }
  
  // TODO: Add logic to extract base regions from empire.bases or similar
  // For now, we'll just use the home region
  
  return regions;
};

const GalaxyPage: React.FC = () => {
  const auth = useAuth();
  const { empire } = auth;
  
  // Memoize userRegions to prevent recreating on every render
  const userRegions = React.useMemo(() => getUserRegions(empire), [empire]);
  
  const {
    zoomLevel,
    selectedCoordinate,
    navigateToUniverse,
    navigateToGalaxy,
    navigateToRegion,
    navigateToSystem,
    getZoomLevelFromCoordinate
  } = useUniverseMapStore();
  
  // Debug current store state
  React.useEffect(() => {
    console.log('[GalaxyPage] ===== CURRENT STORE STATE =====');
    console.log('[GalaxyPage] Current zoom level:', zoomLevel);
    console.log('[GalaxyPage] Selected coordinate:', selectedCoordinate);
    if (selectedCoordinate) {
      const expectedZoomLevel = getZoomLevelFromCoordinate(selectedCoordinate);
      console.log('[GalaxyPage] Expected zoom level from coordinate:', expectedZoomLevel);
      console.log('[GalaxyPage] Zoom level matches:', zoomLevel === expectedZoomLevel);
    }
    console.log('[GalaxyPage] ===== END STORE STATE =====');
  }, [zoomLevel, selectedCoordinate, getZoomLevelFromCoordinate]);

  // Query param integration for Map-Next view level
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const viewParam = searchParams.get('view');
  const initialLevel = getLevelFromViewParam(viewParam, 'galaxy' as MapViewLevel);

  // Compute breadcrumb title pieces from store
  const serverLetter = selectedCoordinate?.server || empire?.homeSystem?.split(':')[0]?.charAt(0) || 'A';
  const galaxyNum = typeof selectedCoordinate?.galaxy === 'number' ? selectedCoordinate!.galaxy : Number(empire?.homeSystem?.split(':')[1] ?? 0);
  const regionNum = typeof selectedCoordinate?.region === 'number' ? selectedCoordinate!.region : undefined;
  const systemNum = typeof selectedCoordinate?.system === 'number' ? selectedCoordinate!.system : undefined;
  
  // Initialize store state when component mounts
  React.useEffect(() => { 
    console.log('[GalaxyPage] Component mounted');
    console.log('[GalaxyPage] Server letter:', serverLetter);
    console.log('[GalaxyPage] Galaxy number:', galaxyNum);
    console.log('[GalaxyPage] Calling navigateToGalaxy with galaxy:', galaxyNum);
    navigateToGalaxy(galaxyNum); 
  }, [navigateToGalaxy, galaxyNum, serverLetter]);

  // Memoize callbacks to prevent unnecessary re-initialization of UniverseMap
  const handleSelectLocation = React.useCallback((loc: any) => {
    console.log('[GalaxyPage] ===== LOCATION SELECTION EVENT =====');
    console.log('[GalaxyPage] Location selected:', loc);
    console.log('[GalaxyPage] Location type:', typeof loc);
    console.log('[GalaxyPage] Location level:', loc?.level);
    console.log('[GalaxyPage] Location details:', {
      galaxy: loc?.galaxy,
      region: loc?.region,
      system: loc?.system,
      body: loc?.body,
      x: loc?.x,
      y: loc?.y
    });
    console.log('[GalaxyPage] Store state before navigation:', {
      currentZoomLevel: zoomLevel,
      currentCoordinate: selectedCoordinate
    });
    
    if (loc.level === 'galaxy' && typeof loc.galaxy === 'number') {
      console.log('[GalaxyPage] Navigating to galaxy:', loc.galaxy);
      navigateToGalaxy(loc.galaxy);
    } else if (loc.level === 'region' && typeof loc.galaxy === 'number' && loc.region) {
      const regionNumber = parseInt(loc.region, 10);
      console.log('[GalaxyPage] Navigating to region:', { galaxy: loc.galaxy, region: regionNumber });
      navigateToRegion(loc.galaxy, regionNumber);
      console.log('[GalaxyPage] Navigation command sent to store');
    } else if (
      loc.level === 'system' && typeof loc.galaxy === 'number' && loc.region && loc.system && typeof loc.body === 'string'
    ) {
      // Planet/body selection — route to Planet page
      const regionNumber = parseInt(loc.region, 10);
      const systemNumber = parseInt(loc.system, 10);
      const bodyNumber = parseInt(loc.body, 10);
      const serverLetter = selectedCoordinate?.server || 'A';
      const coordStr = `${serverLetter}${String(loc.galaxy).padStart(2, '0')}:${String(regionNumber).padStart(2, '0')}:${String(systemNumber).padStart(2, '0')}:${String(bodyNumber).padStart(2, '0')}`;
      console.log('[GalaxyPage] Navigating to planet page with coord:', coordStr);
      navigate(`/planet/${encodeURIComponent(coordStr)}`);
    } else if (loc.level === 'system' && typeof loc.galaxy === 'number' && loc.region && loc.system) {
      const regionNumber = parseInt(loc.region, 10);
      const systemNumber = parseInt(loc.system, 10);
      console.log('[GalaxyPage] Navigating to system:', { galaxy: loc.galaxy, region: regionNumber, system: systemNumber });
      console.log('[GalaxyPage] Parsed values are valid:', {
        galaxyValid: typeof loc.galaxy === 'number' && !isNaN(loc.galaxy),
        regionValid: !isNaN(regionNumber),
        systemValid: !isNaN(systemNumber),
        hasNavigateFunc: !!navigateToSystem
      });
      navigateToSystem(loc.galaxy, regionNumber, systemNumber);
      console.log('[GalaxyPage] Navigation to system sent to store');
      // Force log store state immediately after
      setTimeout(() => {
        const { zoomLevel: newZoom, selectedCoordinate: newCoord } = useUniverseMapStore.getState();
        console.log('[GalaxyPage] Store state after navigation:', {
          newZoomLevel: newZoom,
          newCoordinate: newCoord
        });
      }, 100);
    } else {
      console.warn('[GalaxyPage] Unhandled location type:', loc);
    }
  }, [navigate, navigateToGalaxy, navigateToRegion, navigateToSystem, selectedCoordinate, zoomLevel]); // Added zoomLevel back to dependencies

  const handleZoomChange = React.useCallback((zoom: number) => {
    // Preserve center while updating zoom using latest store state (stable callback)
    const { viewport: vp, setViewport: setVp } = useUniverseMapStore.getState();
    setVp({ ...vp, zoom });
  }, []);

  const handleViewChange = React.useCallback((level: MapViewLevel) => {
    // Only sync URL param to the level reported by the map; do NOT override store state here
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

      {empire ? (
        <>
          {/* Galaxy/Region/System Breadcrumb */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-bold text-empire-gold flex items-center justify-center gap-2">
              {/* Universe crumb */}
              <button 
                className="text-empire-gold/80 hover:text-empire-gold underline-offset-4 hover:underline" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  navigateToUniverse(); 
                  navigate('/universe', { replace: true }); 
                }}
              >
                Universe
              </button>
              <span className="text-empire-gold/50">›</span>
              {/* Galaxy crumb */}
              <button 
                className="text-empire-gold hover:text-yellow-300 underline-offset-4 hover:underline" 
                onClick={(e) => { 
                  e.preventDefault(); 
                  e.stopPropagation(); 
                  navigateToGalaxy(galaxyNum); 
                  navigate({ search: '?view=galaxy' }, { replace: true }); 
                }}
              >
                Galaxy {serverLetter}{String(galaxyNum).padStart(2, '0')}
              </button>
              {zoomLevel !== 'galaxy' && (
                <>
                  <span className="text-empire-gold/50">›</span>
                  <button 
                    className="text-empire-gold hover:text-yellow-300 underline-offset-4 hover:underline" 
                    disabled={typeof regionNum !== 'number'} 
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      if (typeof regionNum === 'number') { 
                        navigateToRegion(galaxyNum, regionNum); 
                        navigate({ search: '?view=region' }, { replace: true }); 
                      } 
                    }}
                  >
                    Region {String(regionNum ?? 0).padStart(2, '0')}
                  </button>
                  {zoomLevel === 'system' && (
                    <>
                      <span className="text-empire-gold/50">›</span>
                      <span className="text-empire-gold">System {String(systemNum ?? 0).padStart(2, '0')}</span>
                    </>
                  )}
                </>
              )}
            </h2>
            <p className="text-gray-400 text-sm">
              {zoomLevel === 'region' ? 'Click a star to inspect its system (coming soon)' : 'Click a region to explore its systems'}
            </p>
          </div>
          
          <div className="game-card p-0 h-[75vh] overflow-hidden">
            <React.Suspense fallback={<div className="p-4 text-center">Loading map…</div>}>
              <UniverseMap
                initialView={{ 
                  level: initialLevel,
                  coord: empire.homeSystem // Pass home system coordinate for context
                }}
                userRegions={userRegions} // Pass user regions for highlighting
                onSelectLocation={handleSelectLocation}
                onZoomChange={handleZoomChange}
                onViewChange={handleViewChange}
              />
            </React.Suspense>
          </div>
        </>
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
