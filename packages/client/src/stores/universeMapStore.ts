import { create } from 'zustand';
import { CoordinateComponents } from '@game/shared';

export type MapZoomLevel = 'universe' | 'galaxy' | 'region' | 'system';

export interface MapViewport {
  centerX: number;
  centerY: number;
  zoom: number;
  minZoom?: number;
  maxZoom?: number;
}

export interface UniverseMapState {
  // Current view state
  zoomLevel: MapZoomLevel;
  selectedCoordinate: CoordinateComponents | null;
  viewport: MapViewport;
  
  // Data cache
  galaxyData: Map<number, any>;
  regionData: Map<string, any>;
  systemData: Map<string, any>;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  showGrid: boolean;
  showTerritories: boolean;
  showFleets: boolean;
  showResources: boolean;
  showOverhaulData: boolean;
  
  // Search state
  searchQuery: string;
  searchResults: CoordinateComponents[];

  // Shared timebase for System view hit-testing (non-persistent)
  systemTimeScalar: number | null;

  // Version bump to trigger view refresh when regionData updates
  regionDataVersion: number;
}

export interface UniverseMapActions {
  // Navigation actions
  setZoomLevel: (level: MapZoomLevel) => void;
  setSelectedCoordinate: (coord: CoordinateComponents | null) => void;
  navigateToCoordinate: (coord: CoordinateComponents) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  navigateToUniverse: () => void;
  navigateToGalaxy: (galaxy: number) => void;
  navigateToRegion: (galaxy: number, region: number) => void;
  navigateToSystem: (galaxy: number, region: number, system: number) => void;
  
  // Viewport actions
  setViewport: (viewport: MapViewport) => void;
  panViewport: (deltaX: number, deltaY: number) => void;
  
  // Data actions
  setGalaxyData: (galaxyId: number, data: any) => void;
  setRegionData: (key: string, data: any) => void;
  setSystemData: (key: string, data: any) => void;
  clearCache: () => void;
  
  // UI actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleGrid: () => void;
  toggleTerritories: () => void;
  toggleFleets: () => void;
  toggleResources: () => void;
  toggleOverhaulData: () => void;
  
  // Search actions
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: CoordinateComponents[]) => void;
  
  // Computed getters
  getCurrentRegionKey: () => string | null;
  getCurrentSystemKey: () => string | null;
  getZoomLevelFromCoordinate: (coord: CoordinateComponents) => MapZoomLevel;

  // Timebase setter for System view hit-testing
  setSystemTimeScalar: (v: number) => void;
}

const useUniverseMapStore = create<UniverseMapState & UniverseMapActions>()(
    (set, get) => ({
// Initial state
      zoomLevel: 'universe',
      selectedCoordinate: null,
      viewport: {
        centerX: 0,
        centerY: 0,
        zoom: 1,
        minZoom: 0.1,
        maxZoom: 10
      },
      
      galaxyData: new Map(),
      regionData: new Map(),
      systemData: new Map(),
      
      isLoading: false,
      error: null,
      showGrid: true,
      showTerritories: true,
      showFleets: true,
      showResources: false,
      showOverhaulData: false,
      
      searchQuery: '',
      searchResults: [],

      // Shared timebase (initialized per SystemView render)
      systemTimeScalar: null,

      // Region data version for view refresh triggers
      regionDataVersion: 0,
      
      // Navigation actions
      setZoomLevel: (level) => set({ zoomLevel: level }),
      
      setSelectedCoordinate: (coord) => {
        console.log('[UniverseMapStore] setSelectedCoordinate called with:', {
          coord,
          hasServer: coord?.server ? 'yes' : 'no',
          hasGalaxy: typeof coord?.galaxy === 'number' ? 'yes' : 'no',
          hasRegion: typeof coord?.region === 'number' ? 'yes' : 'no',
          hasSystem: typeof coord?.system === 'number' ? 'yes' : 'no',
          coordString: coord ? `${coord.server || '?'}${typeof coord.galaxy === 'number' ? coord.galaxy : '?'}:${typeof coord.region === 'number' ? coord.region : '?'}${typeof coord.system === 'number' ? ':' + coord.system : ''}` : 'null'
        });
        set({ selectedCoordinate: coord });
      },
      
      navigateToCoordinate: (coord) => {
        if (!coord) {
          console.warn('[UniverseMapStore] Coordinate is null/undefined');
          return;
        }
        if (!coord) {
          console.warn('[UniverseMapStore] Coordinate is null/undefined');
          return;
        }

        // Build a safe coordinate with defaults
        const safeCoord = {
          server: coord?.server || 'A',
          galaxy: typeof coord?.galaxy === 'number' ? coord.galaxy : 0,
          region: typeof coord?.region === 'number' ? coord.region : 0,
          system: typeof coord?.system === 'number' ? coord.system : 0,
          body: typeof coord?.body === 'number' ? coord.body : 0
        };

        const zoomLevel = get().getZoomLevelFromCoordinate(coord);
        const baseZoom = zoomLevel === 'universe' ? 1 : zoomLevel === 'galaxy' ? 2 : zoomLevel === 'region' ? 4 : 8;
        
        // Get current state for smooth transition
        const prevState = get();

        // Set up new viewport with transition-friendly zoom
        const newViewport = {
          ...prevState.viewport,
          centerX: safeCoord.galaxy,
          centerY: safeCoord.region,
          zoom: baseZoom,
          minZoom: Math.max(0.1, baseZoom * 0.5),
          maxZoom: baseZoom * 2
        };

        // Update state
        set({
          selectedCoordinate: safeCoord,
          zoomLevel,
          viewport: newViewport
        });
      },

      navigateToUniverse: () => {
        set({
          zoomLevel: 'universe',
          selectedCoordinate: null,
          viewport: { centerX: 0, centerY: 0, zoom: 1 }
        });
      },

      navigateToGalaxy: (galaxy) => {
        console.log('[UniverseMapStore] navigateToGalaxy called with:', galaxy);
        try {
          if (typeof galaxy !== 'number') {
            console.error('[UniverseMapStore] Invalid galaxy parameter:', galaxy);
            return;
          }
          const server = get().selectedCoordinate?.server ?? 'A';
          const newState = {
            zoomLevel: 'galaxy' as MapZoomLevel,
            selectedCoordinate: {
              server,
              galaxy,
              region: 0,
              system: 0,
              body: 0
            },
            viewport: { centerX: galaxy, centerY: 0, zoom: 2 }
          };
          console.log('[UniverseMapStore] Setting state:', newState);
          set(newState);
        } catch (error) {
          console.error('[UniverseMapStore] Error in navigateToGalaxy:', error);
        }
      },

      navigateToRegion: (galaxy, region) => {
        console.log('[UniverseMapStore] navigateToRegion called with:', { galaxy, region });
        try {
          if (typeof galaxy !== 'number' || typeof region !== 'number') {
            console.error('[UniverseMapStore] Invalid parameters for navigateToRegion:', { galaxy, region });
            return;
          }
          const server = get().selectedCoordinate?.server ?? 'A';
          const newState = {
            zoomLevel: 'region' as MapZoomLevel,
            selectedCoordinate: {
              server,
              galaxy,
              region,
              system: 0,
              body: 0
            },
            viewport: { centerX: galaxy, centerY: region, zoom: 4 }
          };
          console.log('[UniverseMapStore] Setting state:', newState);
          set(newState);
        } catch (error) {
          console.error('[UniverseMapStore] Error in navigateToRegion:', error);
        }
      },

      navigateToSystem: (galaxy, region, system) => {
        const server = get().selectedCoordinate?.server ?? 'A';
        set({
          zoomLevel: 'system',
          selectedCoordinate: {
            server,
            galaxy,
            region,
            system,
            body: 0
          },
          viewport: { centerX: galaxy, centerY: region, zoom: 8 }
        });
      },
      
      zoomIn: () => {
        const { zoomLevel } = get();
        const levels: MapZoomLevel[] = ['universe', 'galaxy', 'region', 'system'];
        const currentIndex = levels.indexOf(zoomLevel);
        if (currentIndex < levels.length - 1) {
          set({ zoomLevel: levels[currentIndex + 1] });
        }
      },
      
      zoomOut: () => {
        const { zoomLevel } = get();
        const levels: MapZoomLevel[] = ['universe', 'galaxy', 'region', 'system'];
        const currentIndex = levels.indexOf(zoomLevel);
        if (currentIndex > 0) {
          set({ zoomLevel: levels[currentIndex - 1] });
        }
      },
      
      // Viewport actions
      setViewport: (viewport) => set({ viewport }),
      
      panViewport: (deltaX, deltaY) => {
        const { viewport } = get();
        set({
          viewport: {
            ...viewport,
            centerX: viewport.centerX + deltaX,
            centerY: viewport.centerY + deltaY,
            zoom: Math.max(viewport.minZoom ?? 0.1, Math.min(viewport.maxZoom ?? 10, viewport.zoom))
          }
        });
      },
      
      // Data actions
      setGalaxyData: (galaxyId, data) => {
        const { galaxyData } = get();
        const newGalaxyData = new Map(galaxyData);
        newGalaxyData.set(galaxyId, data);
        set({ galaxyData: newGalaxyData });
      },
      
      setRegionData: (key, data) => {
        const { regionData } = get();
        const newRegionData = new Map(regionData);
        newRegionData.set(key, data);
        set({
          regionData: newRegionData,
          regionDataVersion: (get().regionDataVersion ?? 0) + 1
        });
      },
      
      setSystemData: (key, data) => {
        const { systemData } = get();
        const newSystemData = new Map(systemData);
        newSystemData.set(key, data);
        set({ systemData: newSystemData });
      },
      
      clearCache: () => set({
        galaxyData: new Map(),
        regionData: new Map(),
        systemData: new Map()
      }),
      
      // UI actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      toggleGrid: () => set((state) => ({ showGrid: !state.showGrid })),
      toggleTerritories: () => set((state) => ({ showTerritories: !state.showTerritories })),
      toggleFleets: () => set((state) => ({ showFleets: !state.showFleets })),
      toggleResources: () => set((state) => ({ showResources: !state.showResources })),
      toggleOverhaulData: () => set((state) => ({ showOverhaulData: !state.showOverhaulData })),
      
      // Search actions
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchResults: (results) => set({ searchResults: results }),

      // System timebase setter
      setSystemTimeScalar: (v) => set({ systemTimeScalar: v }),
      
      // Computed getters
      getCurrentRegionKey: () => {
        const { selectedCoordinate } = get();
        if (!selectedCoordinate) return null;
        return `${selectedCoordinate.server}${selectedCoordinate.galaxy}:${selectedCoordinate.region}`;
      },
      
      getCurrentSystemKey: () => {
        const { selectedCoordinate } = get();
        if (!selectedCoordinate) return null;
        return `${selectedCoordinate.server}${selectedCoordinate.galaxy}:${selectedCoordinate.region}:${selectedCoordinate.system}`;
      },
      
      getZoomLevelFromCoordinate: (coord) => {
        console.log('[UniverseMapStore] getZoomLevelFromCoordinate called with:', coord);
        if (!coord) {
          console.log('[UniverseMapStore] No coordinate provided, returning universe');
          return 'universe';
        }

        // Select view based on most specific coordinate part provided
        if (typeof coord.body === 'number' && coord.body > 0) {
          console.log('[UniverseMapStore] Body coordinate detected:', coord.body, ', returning system');
          return 'system';
        }
        // If a specific system is referenced (even with body 0), show system view
        if (typeof coord.system === 'number' && coord.system > 0) {
          console.log('[UniverseMapStore] System coordinate detected:', coord.system, ', returning system');
          return 'system';
        }
        // Clicking a region should enter region view (region can be 0..99)
        if (typeof coord.region === 'number' && coord.region >= 0) {
          console.log('[UniverseMapStore] Region coordinate detected:', coord.region, ', returning region');
          return 'region';
        }
        // Fallback to galaxy view when only galaxy is specified
        if (typeof coord.galaxy === 'number' && coord.galaxy >= 0) {
          console.log('[UniverseMapStore] Galaxy coordinate detected:', coord.galaxy, ', returning galaxy');
          return 'galaxy';
        }
        // Default to universe view
        console.log('[UniverseMapStore] No valid coordinates found, returning universe');
        return 'universe';
      }
      
    })
);

export default useUniverseMapStore;
