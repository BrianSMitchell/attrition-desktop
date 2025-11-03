import React from 'react';
import { useAuth } from '../../stores/enhancedAppStore';
import useUniverseMapStore from '../../stores/universeMapStore';
import UniverseMap from './map-next/UniverseMapLoader';
import type { MapLocation, MapViewLevel } from './map-next/types';

/**
 * Unified map page that handles all view levels (universe, galaxy, region, system)
 * without React Router page navigation. This creates smooth scene transitions
 * managed entirely by the Pixi ViewCoordinator.
 */
const MapPage: React.FC = () => {
  const auth = useAuth();
  const { empire } = auth;

  const {
    zoomLevel,
    selectedCoordinate,
    navigateToUniverse,
    navigateToGalaxy,
    navigateToRegion,
    navigateToSystem,
  } = useUniverseMapStore();

  // Extract user regions for highlighting
  const userRegions = React.useMemo(() => {
    const regions: Array<{ region: number; type: 'base' | 'home'; count: number }> = [];
    
    if (!empire) return regions;
    
    // Parse home region from homeSystem coordinate
    if (empire.homeSystem) {
      console.log('[MapPage] Raw homeSystem coordinate:', empire.homeSystem);
      const parts = empire.homeSystem.split(':');
      console.log('[MapPage] Split parts:', parts);
      if (parts.length >= 3) {
        // Actual format: "A00:00:12:03" -> Server+Galaxy "A00", Region "00", System "12", Body "03"
        const serverGalaxyStr = parts[0]; // "A00"
        const regionStr = parts[1];       // "00" - this is the region!
        const systemStr = parts[2];       // "12"
        const bodyStr = parts[3];         // "03" (optional)
        console.log('[MapPage] Parsed components:', { 
          serverGalaxy: serverGalaxyStr, 
          region: regionStr, 
          system: systemStr, 
          body: bodyStr 
        });
        
        const homeRegion = parseInt(regionStr, 10);
        if (!isNaN(homeRegion)) {
          regions.push({ region: homeRegion, type: 'home', count: 1 });
          console.log('[MapPage] Parsed home region:', homeRegion, 'from coordinate:', empire.homeSystem);
        }
      }
    }
    
    console.log('[MapPage] Computed userRegions:', regions);
    return regions;
  }, [empire]);

  // Handle map location selection - NO NAVIGATION, just update store
  const handleSelectLocation = React.useCallback((loc: MapLocation) => {
    console.log('[MapPage] Location selected:', loc);
    
    // Update store state based on selection - ViewCoordinator will handle visual transition
    if (loc.level === 'galaxy' && typeof loc.galaxy === 'number') {
      console.log('[MapPage] Navigating to galaxy:', loc.galaxy);
      navigateToGalaxy(loc.galaxy);
    } else if (loc.level === 'region' && typeof loc.galaxy === 'number' && loc.region) {
      const regionNumber = parseInt(loc.region, 10);
      console.log('[MapPage] Navigating to region:', { galaxy: loc.galaxy, region: regionNumber });
      navigateToRegion(loc.galaxy, regionNumber);
    } else if (loc.level === 'system' && typeof loc.galaxy === 'number' && loc.region && loc.system) {
      const regionNumber = parseInt(loc.region, 10);
      const systemNumber = parseInt(loc.system, 10);
      console.log('[MapPage] Navigating to system:', { galaxy: loc.galaxy, region: regionNumber, system: systemNumber });
      navigateToSystem(loc.galaxy, regionNumber, systemNumber);
    } else {
      console.warn('[MapPage] Unhandled location type:', loc);
    }
  }, [navigateToGalaxy, navigateToRegion, navigateToSystem]);

  // Handle zoom changes (viewport-level zoom, not scene switching)
  const handleZoomChange = React.useCallback((zoom: number) => {
    const { viewport, setViewport } = useUniverseMapStore.getState();
    setViewport({ ...viewport, zoom });
  }, []);

  // Compute breadcrumb components
  // homeSystem format: "A00:00:12:03" where first part is server+galaxy concatenated
  const serverGalaxyPart = empire?.homeSystem?.split(':')[0] || 'A00';
  const serverLetter = selectedCoordinate?.server || serverGalaxyPart.charAt(0) || 'A';
  const galaxyNum = typeof selectedCoordinate?.galaxy === 'number' 
    ? selectedCoordinate.galaxy 
    : Number(serverGalaxyPart.substring(1) || '0'); // Extract galaxy digits from "A00" -> "00"
  const regionNum = typeof selectedCoordinate?.region === 'number' ? selectedCoordinate.region : undefined;
  const systemNum = typeof selectedCoordinate?.system === 'number' ? selectedCoordinate.system : undefined;

  // Determine initial view level from store
  const initialLevel: MapViewLevel = React.useMemo(() => {
    // If no empire, start at universe
    if (!empire?.homeSystem) return 'universe';
    
    // Use current store zoom level as source of truth
    return zoomLevel;
  }, [empire, zoomLevel]);

  // Determine view instruction text based on current zoom level
  const viewInstructionText = React.useMemo(() => {
    switch (zoomLevel) {
      case 'universe':
        return 'Click a galaxy to explore its regions';
      case 'galaxy':
        return 'Click a region to view its star systems';
      case 'region':
        return 'Click a star to inspect its system';
      case 'system':
        return 'Viewing star system details';
      default:
        return '';
    }
  }, [zoomLevel]);

  // Build breadcrumb title
  const breadcrumbTitle = React.useMemo(() => {
    const parts: React.ReactNode[] = [];
    
    // Universe crumb
    parts.push(
      <button
        key="universe"
        className="text-empire-gold/80 hover:text-empire-gold underline-offset-4 hover:underline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          navigateToUniverse();
        }}
      >
        Universe
      </button>
    );
    
    // Only show deeper crumbs if we're zoomed in
    if (zoomLevel !== 'universe' && typeof galaxyNum === 'number') {
      parts.push(<span key="sep1" className="text-empire-gold/50">›</span>);
      parts.push(
        <button
          key="galaxy"
          className={zoomLevel === 'galaxy' ? 'text-empire-gold' : 'text-empire-gold/80 hover:text-empire-gold underline-offset-4 hover:underline'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigateToGalaxy(galaxyNum);
          }}
        >
          Galaxy {serverLetter}{String(galaxyNum).padStart(2, '0')}
        </button>
      );
    }
    
    if ((zoomLevel === 'region' || zoomLevel === 'system') && typeof regionNum === 'number') {
      parts.push(<span key="sep2" className="text-empire-gold/50">›</span>);
      parts.push(
        <button
          key="region"
          className={zoomLevel === 'region' ? 'text-empire-gold' : 'text-empire-gold/80 hover:text-empire-gold underline-offset-4 hover:underline'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            navigateToRegion(galaxyNum, regionNum);
          }}
        >
          Region {String(regionNum).padStart(2, '0')}
        </button>
      );
    }
    
    if (zoomLevel === 'system' && typeof systemNum === 'number') {
      parts.push(<span key="sep3" className="text-empire-gold/50">›</span>);
      parts.push(
        <span key="system" className="text-empire-gold">
          System {String(systemNum).padStart(2, '0')}
        </span>
      );
    }
    
    return parts;
  }, [zoomLevel, serverLetter, galaxyNum, regionNum, systemNum, navigateToUniverse, navigateToGalaxy, navigateToRegion]);

  if (!empire) {
    return (
      <div className="space-y-4">
        <div className="game-card border-2 border-yellow-500">
          <p className="text-yellow-300">
            You need to create an empire before using the universe map.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dynamic breadcrumb navigation */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold text-empire-gold flex items-center justify-center gap-2">
          {breadcrumbTitle}
        </h2>
        <p className="text-gray-400 text-sm">{viewInstructionText}</p>
      </div>

      {/* Map container - NO REMOUNTING on view level changes */}
      <div className="game-card p-0 h-[75vh] overflow-hidden">
        <React.Suspense fallback={<div className="p-4 text-center">Loading map…</div>}>
          <UniverseMap
            initialView={{
              level: initialLevel,
              coord: empire.homeSystem
            }}
            userRegions={userRegions}
            onSelectLocation={handleSelectLocation}
            onZoomChange={handleZoomChange}
          />
        </React.Suspense>
      </div>
    </div>
  );
};

export default MapPage;
