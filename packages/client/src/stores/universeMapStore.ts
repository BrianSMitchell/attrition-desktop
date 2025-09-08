import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CoordinateComponents } from '@game/shared';

export type MapZoomLevel = 'universe' | 'galaxy' | 'region' | 'system';

export interface MapViewport {
  centerX: number;
  centerY: number;
  zoom: number;
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
  persist(
    (set, get) => ({
      // Initial state
      zoomLevel: 'universe',
      selectedCoordinate: null,
      viewport: {
        centerX: 0,
        centerY: 0,
        zoom: 1
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
      
      setSelectedCoordinate: (coord) => set({ selectedCoordinate: coord }),
      
      navigateToCoordinate: (coord) => {
        const zoomLevel = get().getZoomLevelFromCoordinate(coord);
        set({ 
          selectedCoordinate: coord,
          zoomLevel,
          viewport: {
            centerX: coord.galaxy,
            centerY: coord.region,
            zoom: zoomLevel === 'universe' ? 1 : zoomLevel === 'galaxy' ? 2 : zoomLevel === 'region' ? 4 : 8
          }
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
        const server = get().selectedCoordinate?.server ?? 'A';
        set({
          zoomLevel: 'galaxy',
          selectedCoordinate: {
            server,
            galaxy,
            region: 0,
            system: 0,
            body: 0
          },
          viewport: { centerX: galaxy, centerY: 0, zoom: 2 }
        });
      },

      navigateToRegion: (galaxy, region) => {
        const server = get().selectedCoordinate?.server ?? 'A';
        set({
          zoomLevel: 'region',
          selectedCoordinate: {
            server,
            galaxy,
            region,
            system: 0,
            body: 0
          },
          viewport: { centerX: galaxy, centerY: region, zoom: 4 }
        });
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
            centerY: viewport.centerY + deltaY
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
        // Select view based on most specific coordinate part provided
        if (coord.body > 0) return 'system';
        // If a specific system is referenced (even with body 0), show system view
        if (coord.system > 0) return 'system';
        // Clicking a region should enter region view (region can be 0..99)
        if (coord.region >= 0) return 'region';
        // Fallback to galaxy view when only galaxy is specified
        if (coord.galaxy >= 0) return 'galaxy';
        // Default to universe view
        return 'universe';
      }
    }),
    {
      name: 'universe-map-storage',
      partialize: (state) => ({
        zoomLevel: state.zoomLevel,
        selectedCoordinate: state.selectedCoordinate,
        viewport: state.viewport,
        showGrid: state.showGrid,
        showTerritories: state.showTerritories,
        showFleets: state.showFleets,
        showResources: state.showResources,
        showOverhaulData: state.showOverhaulData
      })
    }
  )
);

export default useUniverseMapStore;
