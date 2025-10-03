import { StateCreator } from 'zustand';
import { Colony, Building, TechnologySpec, TechnologyKey, DefenseSpec, StructureSpec, StructureKey as BuildingKey, Empire, UnitSpec, UnitKey } from '@game/shared';
import { gameApi, type TechStatusData, type DefensesStatusData, type DefenseQueueData, type PlanetYieldsData } from '../services/gameApi';
import type { BaseStatsDTO } from '../../services/basesService';
import type { FleetListRow } from '../../services/fleetsService';

interface BaseData extends Omit<Colony, 'buildings'> {
  buildings: Building[];
}

// Research data structures
// Note: TechStatusData is imported from gameApi

interface ActiveResearchData {
  key: TechnologyKey;
  completesAt: string;
}

// Defense data structures
// Note: DefensesStatusData is imported from gameApi

// Note: DefenseQueueData is imported from gameApi

// Structures data structures
interface ActiveConstructionData {
  key: BuildingKey;
  completionAt: string;
}

// Note: PlanetYieldsData is imported from gameApi

// Units data structures
interface UnitsStatusData {
  techLevels: Partial<Record<string, number>>;
  eligibility: Record<
    UnitKey,
    {
      canStart: boolean;
      reasons: string[];
    }
  >;
}

interface UnitQueueData {
  _id: string;
  unitKey: UnitKey;
  startedAt: string;
  completesAt: string;
  status: 'pending' | 'completed' | 'cancelled';
}

// Dashboard data structures
interface DashboardData {
  user: any;
  empire: Empire | null;
  isNewPlayer: boolean;
  serverInfo: {
    name: string;
    version: string;
    playersOnline: number;
    universeSize: { width: number; height: number };
  };
  profile?: {
    economyPerHour: number;
    fleetScore: number;
    technologyScore: number;
    level: number;
  };
}

export interface GameState {
  selectedBaseId: string | null;
  bases: BaseData[];
  baseStats: BaseStatsDTO | null;
  loading: {
    bases: boolean;
    baseStats: boolean;
    research: boolean;
    defense: boolean;
    structures: boolean;
    dashboard: boolean;
    empire: boolean;
    [key: string]: boolean;
  };
  error: string | null;
  
  // Dashboard state
  dashboard: {
    data: DashboardData | null;
    error: string | null;
  };
  
  // Empire state
  empire: {
    data: Empire | null;
    error: string | null;
  };
  
  // Research state
  research: {
    catalog: TechnologySpec[];
    status: TechStatusData | null;
    activeResearch: ActiveResearchData | null;
    researchPerHour?: number;
    error: string | null;
  };
  
  // Defense state  
  defense: {
    catalog: DefenseSpec[];
    status: DefensesStatusData | null;
    queue: DefenseQueueData[];
    activeConstruction: ActiveConstructionData | null;
    citizenPerHour?: number;
    currentLevels?: Record<string, number>;
    error: string | null;
  };
  
  // Structures state
  structures: {
    catalog: StructureSpec[];
    status: any;
    activeConstruction: ActiveConstructionData | null;
    constructionPerHour?: number;
    planetYields: PlanetYieldsData;
    error: string | null;
  };
  
  // Fleets state (by base coordinate)
  fleets: {
    itemsByCoord: Record<string, FleetListRow[]>;
    loadingByCoord: Record<string, boolean>;
    errorByCoord: Record<string, string | null>;
  };
  
  // Units state
  units: {
    catalog: UnitSpec[];
    status: UnitsStatusData | null;
    queue: UnitQueueData[];
    productionPerHour?: number;
    error: string | null;
  };
}

export interface GameSlice {
  game: GameState;
  
  // Base actions
  setSelectedBase: (baseId: string | null) => void;
  setBases: (bases: BaseData[]) => void;
  updateBase: (baseId: string, updates: Partial<BaseData>) => void;
  addBase: (base: BaseData) => void;
  removeBase: (baseId: string) => void;
  
  // Loading and error actions
  setGameLoading: (key: string, loading: boolean) => void;
  setGameError: (error: string | null) => void;
  
  // Research actions
  setResearchData: (data: Partial<GameState['research']>) => void;
  loadResearchData: (baseCoord: string) => Promise<void>;
  loadResearchQueue: (baseCoord: string) => Promise<void>;
  
  // Defense actions
  setDefenseData: (data: Partial<GameState['defense']>) => void;
  loadDefenseData: (baseCoord: string) => Promise<void>;
  
  // Structures actions
  setStructuresData: (data: Partial<GameState['structures']>) => void;
  loadStructuresData: (baseCoord: string) => Promise<void>;
  
  // Base stats actions
  setBaseStats: (stats: BaseStatsDTO | null) => void;
  loadBaseStats: (baseCoord: string) => Promise<void>;
  
  // Fleet actions
  loadFleetsForBase: (baseCoord: string) => Promise<void>;
  getFleetsForBase: (baseCoord: string) => FleetListRow[];
  getFleetsError: (baseCoord: string) => string | null;
  isFleetsLoading: (baseCoord: string) => boolean;
  
  // Units actions
  setUnitsData: (data: Partial<GameState['units']>) => void;
  loadUnitsData: (baseCoord: string) => Promise<void>;
  loadUnitsQueue: (baseCoord: string) => Promise<void>;
  
  // Dashboard actions
  setDashboardData: (data: Partial<GameState['dashboard']>) => void;
  loadDashboard: () => Promise<void>;
  
  // Empire actions
  setEmpireData: (data: Partial<GameState['empire']>) => void;
  loadEmpire: () => Promise<void>;
  createEmpire: (name: string) => Promise<boolean>;
  updateEmpireResources: () => Promise<void>;
  
  // Computed getters
  getSelectedBase: () => BaseData | null;
  getBaseById: (baseId: string) => BaseData | null;
  getTotalBases: () => number;
  getDashboardData: () => DashboardData | null;
  getEmpire: () => Empire | null;
}

const createGameSlice: StateCreator<
  GameSlice,
  [],
  [],
  GameSlice
> = (set, get) => ({
  game: {
    selectedBaseId: null,
    bases: [],
    baseStats: null,
    loading: {
      bases: false,
      baseStats: false,
      research: false,
      defense: false,
      structures: false,
      dashboard: false,
      empire: false,
    },
    error: null,
    dashboard: {
      data: null,
      error: null,
    },
    empire: {
      data: null,
      error: null,
    },
    research: {
      catalog: [],
      status: null,
      activeResearch: null,
      researchPerHour: undefined,
      error: null,
    },
    defense: {
      catalog: [],
      status: null,
      queue: [],
      activeConstruction: null,
      citizenPerHour: undefined,
      error: null,
    },
    structures: {
      catalog: [],
      status: null,
      activeConstruction: null,
      constructionPerHour: undefined,
      planetYields: {},
      error: null,
    },
    fleets: {
      itemsByCoord: {},
      loadingByCoord: {},
      errorByCoord: {},
    },
    units: {
      catalog: [],
      status: null,
      queue: [],
      productionPerHour: undefined,
      error: null,
    },
  },

  setSelectedBase: (baseId: string | null) => {
    set((state) => ({
      game: {
        ...state.game,
        selectedBaseId: baseId,
      },
    }));
  },

  setBases: (bases: BaseData[]) => {
    set((state) => ({
      game: {
        ...state.game,
        bases,
        error: null,
      },
    }));
  },

  updateBase: (baseId: string, updates: Partial<BaseData>) => {
    set((state) => ({
      game: {
        ...state.game,
        bases: state.game.bases.map((base) =>
          base._id === baseId ? { ...base, ...updates } : base
        ),
      },
    }));
  },

  addBase: (base: BaseData) => {
    set((state) => ({
      game: {
        ...state.game,
        bases: [...state.game.bases, base],
      },
    }));
  },

  removeBase: (baseId: string) => {
    set((state) => ({
      game: {
        ...state.game,
        bases: state.game.bases.filter((base) => base._id !== baseId),
        selectedBaseId: state.game.selectedBaseId === baseId ? null : state.game.selectedBaseId,
      },
    }));
  },

  setGameLoading: (key: string, loading: boolean) => {
    set((state) => ({
      game: {
        ...state.game,
        loading: {
          ...state.game.loading,
          [key]: loading,
        },
      },
    }));
  },

  setGameError: (error: string | null) => {
    set((state) => ({
      game: {
        ...state.game,
        error,
      },
    }));
  },

  getSelectedBase: () => {
    const { game } = get();
    return game.selectedBaseId 
      ? game.bases.find((base) => base._id === game.selectedBaseId) || null
      : null;
  },

  getBaseById: (baseId: string) => {
    const { game } = get();
    return game.bases.find((base) => base._id === baseId) || null;
  },

  getTotalBases: () => {
    const { game } = get();
    return game.bases.length;
  },

  getDashboardData: () => {
    const { game } = get();
    return game.dashboard.data;
  },

  getEmpire: () => {
    const { game } = get();
    return game.empire.data;
  },

  // Research actions
  setResearchData: (data: Partial<GameState['research']>) => {
    set((state) => ({
      game: {
        ...state.game,
        research: {
          ...state.game.research,
          ...data,
        },
      },
    }));
  },

  loadResearchData: async (baseCoord: string) => {
    const { setGameLoading, setResearchData } = get();
    
    try {
      setGameLoading('research', true);
      setResearchData({ error: null });
      
      console.log('🔬 Loading research data for base:', baseCoord);
      
      // Load research catalog
      const catalogResponse = await gameApi.getResearchCatalog();
      if (!catalogResponse.success) {
        throw new Error(catalogResponse.error || 'Failed to load research catalog');
      }
      
      // Load research status
      const statusResponse = await gameApi.getResearchStatus(baseCoord);
      if (!statusResponse.success) {
        throw new Error(statusResponse.error || 'Failed to load research status');
      }
      
      setResearchData({
        catalog: catalogResponse.data || [],
        status: statusResponse.data,
        researchPerHour: 100, // This might come from a different API
      });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load research data';
      console.error('Error loading research data:', message);
      setResearchData({ error: message });
    } finally {
      setGameLoading('research', false);
    }
  },

  loadResearchQueue: async (baseCoord: string) => {
    console.log('🔬 Loading research queue for base:', baseCoord);
    
    const { setResearchData } = get();
    
    try {
      const queueResponse = await gameApi.getResearchQueue(baseCoord);
      if (queueResponse.success && queueResponse.data) {
        const queue = queueResponse.data;
        // Find active research from queue
        const activeResearch = queue.length > 0 && queue[0].completesAt 
          ? { key: queue[0].key as TechnologyKey, completesAt: queue[0].completesAt }
          : null;
        setResearchData({ activeResearch });
      } else {
        console.warn('Failed to load research queue:', queueResponse.error);
        setResearchData({ activeResearch: null });
      }
    } catch (error) {
      console.error('Error loading research queue:', error);
      setResearchData({ activeResearch: null });
    }
  },

  // Defense actions
  setDefenseData: (data: Partial<GameState['defense']>) => {
    set((state) => ({
      game: {
        ...state.game,
        defense: {
          ...state.game.defense,
          ...data,
        },
      },
    }));
  },

  loadDefenseData: async (baseCoord: string) => {
    const { setGameLoading, setDefenseData } = get();
    
    try {
      setGameLoading('defense', true);
      setDefenseData({ error: null });
      
      console.log('🛡️ Loading defense data for base:', baseCoord);
      
      // Load defenses catalog
      const catalogResponse = await gameApi.getDefensesCatalog();
      if (!catalogResponse.success) {
        throw new Error(catalogResponse.error || 'Failed to load defenses catalog');
      }
      
      // Load base defenses with current levels - this is the key fix!
      const defensesResponse = await gameApi.getBaseDefenses(baseCoord);
      if (!defensesResponse.success) {
        console.error('Failed to load base defenses:', defensesResponse.error);
        throw new Error(defensesResponse.error || 'Failed to load base defenses');
      }
      
      // Load defenses status for build eligibility
      const statusResponse = await gameApi.getDefensesStatus();
      if (!statusResponse.success) {
        throw new Error(statusResponse.error || 'Failed to load defenses status');
      }
      
      // Load defense queue
      const queueResponse = await gameApi.getDefenseQueue(baseCoord);
      if (!queueResponse.success) {
        console.warn('Failed to load defense queue:', queueResponse.error);
      }
      
      // Load capacities (for citizen production rate)
      const capacitiesResponse = await gameApi.getCapacities(baseCoord);
      if (!capacitiesResponse.success) {
        console.warn('Failed to load capacities:', capacitiesResponse.error);
      }
      
      // Extract current levels from defenses data
      const currentLevels: Record<string, number> = {};
      if (defensesResponse.data?.defenseLevels) {
        for (const defense of defensesResponse.data.defenseLevels) {
          currentLevels[defense.key] = defense.level || 0;
        }
      }
      
      setDefenseData({
        catalog: catalogResponse.data || [],
        status: {
          credits: 0, // Defenses don't have separate credits
          techLevels: {},
          eligibility: {},
          ...statusResponse.data,
          // Include current levels in the status object
          currentLevels
        },
        queue: queueResponse.data || [],
        citizenPerHour: (capacitiesResponse.success && (capacitiesResponse.data as any)?.citizen?.value)
          ? (capacitiesResponse.data as any).citizen.value
          : 0,
        // Include current defense levels for display
        currentLevels,
      });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load defense data';
      console.error('Error loading defense data:', message);
      setDefenseData({ error: message });
    } finally {
      setGameLoading('defense', false);
    }
  },

  // Structures actions
  setStructuresData: (data: Partial<GameState['structures']>) => {
    set((state) => ({
      game: {
        ...state.game,
        structures: {
          ...state.game.structures,
          ...data,
        },
      },
    }));
  },

  loadStructuresData: async (baseCoord: string) => {
    const { setGameLoading, setStructuresData } = get();
    
    try {
      setGameLoading('structures', true);
      setStructuresData({ error: null });
      
      console.log('🏗️ Loading structures data for base:', baseCoord);
      
      // Load structures catalog
      const catalogResponse = await gameApi.getStructuresCatalog();
      if (!catalogResponse.success) {
        console.error('Failed to load structures catalog:', catalogResponse.error);
        throw new Error(catalogResponse.error || 'Failed to load structures catalog');
      }
      
      // Load base structures with current levels - this is the key fix!
      const structuresResponse = await gameApi.getBaseStructures(baseCoord);
      if (!structuresResponse.success) {
        console.error('Failed to load base structures:', structuresResponse.error);
        throw new Error(structuresResponse.error || 'Failed to load base structures');
      }
      
      // Load base structures status for build eligibility
      const statusResponse = await gameApi.getBaseStructuresStatus(baseCoord);
      if (!statusResponse.success) {
        console.error('Failed to load base structures status:', statusResponse.error);
        throw new Error(statusResponse.error || 'Failed to load base structures status');
      }
      
      // Load planet yields
      const yieldsResponse = await gameApi.getPlanetYields(baseCoord);
      if (!yieldsResponse.success) {
        console.warn('Failed to load planet yields:', yieldsResponse.error);
      }
      
      // Load capacities
      const capacitiesResponse = await gameApi.getCapacities(baseCoord);
      if (!capacitiesResponse.success) {
        console.warn('Failed to load capacities:', capacitiesResponse.error);
      }
      
      // Extract current levels from structures data
      const currentLevels: Record<string, number> = {};
      if (structuresResponse.data?.items) {
        for (const item of structuresResponse.data.items) {
          currentLevels[item.key] = item.currentLevel || 0;
        }
      }
      
      setStructuresData({
        catalog: catalogResponse.data || [],
        status: {
          ...statusResponse.data,
          capacities: capacitiesResponse.data,
          // Include current levels in the status object
          currentLevels
        },
        constructionPerHour: structuresResponse.data?.constructionPerHour || statusResponse.data?.constructionPerHour || 0,
        activeConstruction: structuresResponse.data?.activeConstruction || statusResponse.data?.activeConstruction || null,
        planetYields: yieldsResponse.data || {},
      });
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load structures data';
      console.error('Error loading structures data:', message);
      setStructuresData({ error: message });
    } finally {
      setGameLoading('structures', false);
    }
  },

  // Base stats actions
  setBaseStats: (stats: BaseStatsDTO | null) => {
    set((state) => ({
      game: {
        ...state.game,
        baseStats: stats,
      },
    }));
  },

  loadBaseStats: async (baseCoord: string) => {
    const { setGameLoading, setBaseStats } = get();
    
    try {
      setGameLoading('baseStats', true);
      
      console.log('📊 Loading base stats for:', baseCoord);
      
      const response = await gameApi.getBaseStats(baseCoord);
      if (response.success && response.data) {
        setBaseStats(response.data);
      } else {
        console.warn('Failed to load base stats:', response.error);
        setBaseStats(null);
      }
    } catch (error) {
      console.error('Error loading base stats:', error);
      setBaseStats(null);
    } finally {
      setGameLoading('baseStats', false);
    }
  },

  // Fleet actions implementation
  loadFleetsForBase: async (baseCoord: string) => {
    const { setGameLoading } = get();
    try {
      console.log('🚢 Loading fleets for base:', baseCoord);
      
      // Per-base loading flag with safe access
      set((state) => ({
        game: {
          ...state.game,
          fleets: {
            itemsByCoord: state.game.fleets?.itemsByCoord || {},
            loadingByCoord: { ...(state.game.fleets?.loadingByCoord || {}), [baseCoord]: true },
            errorByCoord: { ...(state.game.fleets?.errorByCoord || {}), [baseCoord]: null },
          },
        },
      }));

      const res = await gameApi.getFleets(baseCoord);
      console.log('🚢 Fleet API response:', res);
      
      if (res.success && res.data && res.data.fleets) {
        console.log('✅ Fleets loaded successfully:', res.data.fleets.length, 'fleets');
        set((state) => ({
          game: {
            ...state.game,
            fleets: {
              itemsByCoord: { ...(state.game.fleets?.itemsByCoord || {}), [baseCoord]: res.data.fleets },
              loadingByCoord: state.game.fleets?.loadingByCoord || {},
              errorByCoord: state.game.fleets?.errorByCoord || {},
            },
          },
        }));
      } else {
        console.warn('⚠️ Fleet loading failed or returned no data:', res.error || 'Unknown error');
        set((state) => ({
          game: {
            ...state.game,
            fleets: {
              itemsByCoord: { ...(state.game.fleets?.itemsByCoord || {}), [baseCoord]: [] },
              loadingByCoord: state.game.fleets?.loadingByCoord || {},
              errorByCoord: { ...(state.game.fleets?.errorByCoord || {}), [baseCoord]: res.error || 'Failed to load fleets' },
            },
          },
        }));
      }
    } catch (err) {
      console.error('❌ Network error loading fleets:', err);
      set((state) => ({
        game: {
          ...state.game,
          fleets: {
            itemsByCoord: state.game.fleets?.itemsByCoord || {},
            loadingByCoord: state.game.fleets?.loadingByCoord || {},
            errorByCoord: { ...(state.game.fleets?.errorByCoord || {}), [baseCoord]: 'Network error loading fleets' },
          },
        },
      }));
    } finally {
      set((state) => ({
        game: {
          ...state.game,
          fleets: {
            itemsByCoord: state.game.fleets?.itemsByCoord || {},
            loadingByCoord: { ...(state.game.fleets?.loadingByCoord || {}), [baseCoord]: false },
            errorByCoord: state.game.fleets?.errorByCoord || {},
          },
        },
      }));
      // Also clear generic key if used anywhere
      setGameLoading('fleets', false);
    }
  },

  getFleetsForBase: (baseCoord: string) => {
    const { game } = get();
    return game.fleets?.itemsByCoord?.[baseCoord] || [];
  },

  getFleetsError: (baseCoord: string) => {
    const { game } = get();
    return game.fleets?.errorByCoord?.[baseCoord] ?? null;
  },

  isFleetsLoading: (baseCoord: string) => {
    const { game } = get();
    return !!game.fleets?.loadingByCoord?.[baseCoord];
  },

  // Dashboard actions implementation
  setDashboardData: (data: Partial<GameState['dashboard']>) => {
    set((state) => ({
      game: {
        ...state.game,
        dashboard: {
          ...state.game.dashboard,
          ...data,
        },
      },
    }));
  },

  loadDashboard: async () => {
    const { setGameLoading, setDashboardData } = get();
    
    try {
      setGameLoading('dashboard', true);
      setDashboardData({ error: null });
      
      console.log('🎰 Loading dashboard data');
      
      // Check service readiness
      if (!gameApi || !gameApi.getDashboard) {
        console.error('❌ Game API not properly initialized');
        throw new Error('Game services not ready - please try again');
      }
      
      const response = await gameApi.getDashboard();
      console.log('📊 Dashboard API response:', response);
      
      if (response.success && response.data) {
        console.log('✅ Dashboard data loaded successfully:', response.data);
        setDashboardData({ data: response.data });
      } else {
        console.error('❌ Failed to load dashboard data:', response.error);
        throw new Error(response.error || 'Failed to load dashboard data');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load dashboard data';
      console.error('Error loading dashboard data:', message);
      setDashboardData({ error: message });
    } finally {
      setGameLoading('dashboard', false);
    }
  },

  // Empire actions implementation
  setEmpireData: (data: Partial<GameState['empire']>) => {
    set((state) => ({
      game: {
        ...state.game,
        empire: {
          ...state.game.empire,
          ...data,
        },
      },
    }));
  },

  loadEmpire: async () => {
    const { setGameLoading, setEmpireData } = get();
    
    try {
      setGameLoading('empire', true);
      setEmpireData({ error: null });
      
      console.log('🚀 Loading empire data');
      
      const response = await gameApi.getEmpire();
      if (response.success && response.data?.empire) {
        setEmpireData({ data: response.data.empire });
      } else {
        throw new Error(response.error || 'Failed to load empire data');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load empire data';
      console.error('Error loading empire data:', message);
      setEmpireData({ error: message });
    } finally {
      setGameLoading('empire', false);
    }
  },

  createEmpire: async (name: string) => {
    const { loadDashboard } = get();
    
    try {
      console.log('🛠️ Creating new empire:', name);
      
      const response = await gameApi.createEmpire(name);
      if (response.success) {
        // Refresh dashboard data after empire creation
        await loadDashboard();
        return true;
      } else {
        console.error('Failed to create empire:', response.error);
        return false;
      }
    } catch (error) {
      console.error('Error creating empire:', error);
      return false;
    }
  },

  updateEmpireResources: async () => {
    const { setGameLoading, setEmpireData } = get();
    
    try {
      setGameLoading('empire', true);
      
      console.log('💰 Updating empire resources');
      
      const response = await gameApi.updateEmpireResources();
      if (response.success && response.data?.empire) {
        setEmpireData({ data: response.data.empire });
      } else {
        console.warn('Failed to update empire resources:', response.error);
      }
    } catch (error) {
      console.error('Error updating empire resources:', error);
    } finally {
      setGameLoading('empire', false);
    }
  },

  // Units actions implementation
  setUnitsData: (data: Partial<GameState['units']>) => {
    set((state) => ({
      game: {
        ...state.game,
        units: {
          ...state.game.units,
          ...data,
        },
      },
    }));
  },

  loadUnitsData: async (baseCoord: string) => {
    const { setGameLoading, setUnitsData } = get();
    
    try {
      setGameLoading('units', true);
      
      console.log('🚀 Loading units data for:', baseCoord);
      
      // Load units catalog (using existing API method)
      const catalogResponse = await gameApi.getUnitsCatalog();
      if (!catalogResponse.success) {
        console.error('Failed to load units catalog:', catalogResponse.error);
        throw new Error(catalogResponse.error || 'Failed to load units catalog');
      }
      
      // Load units status (eligibility) - using existing API method
      const statusResponse = await gameApi.getUnitsStatus(baseCoord);
      if (!statusResponse.success) {
        console.error('Failed to load units status:', statusResponse.error);
        throw new Error(statusResponse.error || 'Failed to load units status');
      }
      
      // Load production capacity
      const capacitiesResponse = await gameApi.getCapacities(baseCoord);
      const productionPerHour = capacitiesResponse.success && capacitiesResponse.data?.production?.value 
        ? capacitiesResponse.data.production.value 
        : undefined;
      
      setUnitsData({
        catalog: catalogResponse.data || [],
        status: statusResponse.data || null,
        productionPerHour,
        error: null,
      });
      
      console.log('✅ Units data loaded successfully');
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load units data';
      console.error('Error loading units data:', message);
      setUnitsData({ error: message });
    } finally {
      setGameLoading('units', false);
    }
  },

  loadUnitsQueue: async (baseCoord: string) => {
    const { setGameLoading, setUnitsData } = get();
    
    try {
      setGameLoading('units', true);
      
      console.log('📋 Loading units queue for:', baseCoord);
      
      // Using existing getUnitProductionQueue API method
      const response = await gameApi.getUnitProductionQueue(baseCoord);
      if (response.success && response.data) {
        setUnitsData({
          queue: response.data || [],
          error: null,
        });
        console.log('✅ Units queue loaded:', response.data?.length || 0, 'items');
      } else {
        console.warn('Failed to load units queue:', response.error);
        setUnitsData({ queue: [], error: response.error || null });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load units queue';
      console.error('Error loading units queue:', message);
      setUnitsData({ queue: [], error: message });
    } finally {
      setGameLoading('units', false);
    }
  },
});

export default createGameSlice;
