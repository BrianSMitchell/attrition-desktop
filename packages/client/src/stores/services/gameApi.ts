/**
 * Game API service for the enhanced store system
 * Integrates with existing API infrastructure to provide game-specific data
 */

import api, { ApiError } from '../../services/api';
import { capacitiesService } from '../../services/capacitiesService';
import basesService, { type BaseStatsDTO } from '../../services/basesService';
import universeService from '../../services/universeService';
import techService from '../../services/techService';
import defensesService from '../../services/defensesService';
import structuresService from '../../services/structuresService';
import fleetsService from '../../services/fleetsService';
import unitsService from '../../services/unitsService';
import { ApiResponse, TechnologySpec, TechnologyKey, DefenseSpec, StructureSpec, StructureKey as BuildingKey, DefenseKey, Empire } from '@game/shared';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ERROR_MESSAGES } from '@game/shared';



// Re-export types for enhanced store
export interface TechStatusData {
  techLevels: Record<string, number>;
  eligibility: Record<string, { canStart: boolean; reasons: string[] }>;
  baseLabTotal: number;
}

export interface DefensesStatusData {
  credits: number;
  techLevels: Record<string, number>;
  eligibility: Record<string, { canStart: boolean; reasons: string[] }>;
  currentLevels?: Record<string, number>;
}

export interface DefenseQueueData {
  id: string;
  defenseKey: string;
  startedAt?: string;
  completesAt?: string;
  baseCoord: string;
}

export interface ActiveConstructionData {
  key: BuildingKey;
  completionAt: string;
}

export interface PlanetYieldsData {
  gasYield?: number;
  metalYield?: number;
  crystalsYield?: number;
  solarEnergy?: number;
  fertility?: number;
}

function isApiErrorLike(err: unknown): err is ApiError {
  return (
    !!err &&
    typeof err === 'object' &&
    typeof (err as any).code === 'string' &&
    typeof (err as any).message === 'string'
  );
}

// API service methods for the enhanced store
export const gameApi = {
  // Research APIs
  async getResearchCatalog(): Promise<{ success: boolean; data?: TechnologySpec[]; error?: string }> {
    try {
      const res = await api.get<ApiResponse<{ catalog: TechnologySpec[] }>>(
        '/game/tech/catalog'
      );
      if (res.data.success) {
        return { success: true, data: res.data.data!.catalog };
      }
      return { success: false, error: res.data.message || 'Failed to load research catalog' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading research catalog' };
    }
  },

  async getResearchStatus(baseCoord: string): Promise<{ success: boolean; data?: TechStatusData; error?: string }> {
    try {
      const res = await api.get<ApiResponse<{ status: any }>>(
        '/game/tech/status',
        { params: { base: baseCoord } }
      );
      if (res.data.success) {
        const status = res.data.data!.status;
        return {
          success: true,
          data: {
            techLevels: status.techLevels || {},
            eligibility: status.eligibility || {},
            baseLabTotal: status.baseLabTotal || 0
          }
        };
      }
      return { success: false, error: res.data.message || 'Failed to load research status' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading research status' };
    }
  },

  async getResearchQueue(baseCoord: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    try {
      const res = await api.get<ApiResponse<{ queue: any[] }>>(
        '/game/tech/queue',
        { params: { base: baseCoord } }
      );
      if (res.data.success) {
        return { success: true, data: res.data.data!.queue };
      }
      return { success: false, error: res.data.message || 'Failed to load research queue' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading research queue' };
    }
  },

  // Defense APIs
  async getDefensesCatalog(): Promise<{ success: boolean; data?: DefenseSpec[]; error?: string }> {
    try {
      const res = await api.get<ApiResponse<{ catalog: DefenseSpec[] }>>(
        '/game/defenses/catalog'
      );
      if (res.data.success) {
        return { success: true, data: res.data.data!.catalog };
      }
      return { success: false, error: res.data.message || 'Failed to load defenses catalog' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading defenses catalog' };
    }
  },

  async getDefensesStatus(): Promise<{ success: boolean; data?: DefensesStatusData; error?: string }> {
    try {
      const [statusRes, empireRes] = await Promise.all([
        api.get<ApiResponse<{ status: any }>>('/game/defenses/status'),
        api.get<ApiResponse<{ empire: Empire }>>('/game/empire')
      ]);

      if (statusRes.data.success && empireRes.data.success) {
        const status = statusRes.data.data!.status;
        const empire = empireRes.data.data!.empire;
        return {
          success: true,
          data: {
            credits: (empire?.resources?.credits ?? 0),
            techLevels: status.techLevels || {},
            eligibility: status.eligibility || {},
          },
        };
      }

      if (!statusRes.data.success) {
        return { success: false, error: statusRes.data.message || 'Failed to load defenses status' };
      }

      return { success: false, error: empireRes.data.message || 'Failed to load empire data' };

    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading defenses status' };
    }
  },

  async getDefenseQueue(baseCoord: string): Promise<{ success: boolean; data?: DefenseQueueData[]; error?: string }> {
    try {
      const res = await api.get<ApiResponse<{ queue: DefenseQueueData[] }>>(
        '/game/defenses/queue',
        { params: { locationCoord: baseCoord } }
      );
      if (res.data.success) {
        return { success: true, data: res.data.data!.queue };
      }
      return { success: false, error: res.data.message || 'Failed to load defense queue' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading defense queue' };
    }
  },

  // Structures APIs
  async getStructuresCatalog(): Promise<{ success: boolean; data?: StructureSpec[]; error?: string }> {
    try {
      const res = await api.get<ApiResponse<{ catalog: any }>>(
        '/game/structures/catalog'
      );
      
      if (res.data.success) {
        const catalogData = res.data.data!.catalog;
        
        // Handle both formats:
        // 1. catalog: [...] (direct array)
        // 2. catalog: { buildings: [...], defenses: [...] } (object with arrays)
        let buildings: StructureSpec[];
        
        if (Array.isArray(catalogData)) {
          // Direct array format
          buildings = catalogData;
        } else if (catalogData && typeof catalogData === 'object' && Array.isArray(catalogData.buildings)) {
          // Object format with buildings array
          buildings = catalogData.buildings;
        } else {
          console.error('🔴 Unexpected catalog format:', catalogData);
          return { success: false, error: 'Unexpected catalog format from server' };
        }
        
        console.log('✅ Structures catalog loaded:', buildings.length, 'buildings');
        return { success: true, data: buildings };
      }
      return { success: false, error: res.data.message || 'Failed to load structures catalog' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading structures catalog' };
    }
  },

  async getBaseStructuresStatus(baseCoord: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔧 Calling basesService.getBaseStructures for:', baseCoord);
      const res = await basesService.getBaseStructures(baseCoord);
      console.log('🔧 basesService.getBaseStructures response:', res);
      
      if (res.success && res.data) {
        // Convert to the format expected by the enhanced store
        const eligibility: Record<string, { canStart: boolean; reasons: string[] }> = {};
        for (const item of res.data.items) {
          eligibility[item.key] = { canStart: !!item.canStart, reasons: item.reasons || [] };
        }

        return {
          success: true,
          data: {
            techLevels: {},
            eligibility,
            constructionPerHour: res.data.constructionPerHour,
            activeConstruction: res.data.activeConstruction
          }
        };
      }
      return { success: false, error: res.message || res.error || 'Failed to load base structures' };
    } catch (err) {
      console.error('🔧 Error in getBaseStructuresStatus:', err);
      return { success: false, error: 'Network error loading base structures' };
    }
  },

  async getPlanetYields(baseCoord: string): Promise<{ success: boolean; data?: PlanetYieldsData; error?: string }> {
    try {
      const res = await universeService.getLocationByCoord(baseCoord);
      if (res.success && res.data) {
        const result = res.data.result;
        return {
          success: true,
          data: {
            gasYield: typeof result?.yields?.gas === 'number' ? result.yields.gas : undefined,
            metalYield: typeof result?.yields?.metal === 'number' ? result.yields.metal : undefined,
            crystalsYield: typeof result?.yields?.crystals === 'number' ? result.yields.crystals : undefined,
            solarEnergy: typeof result?.solarEnergy === 'number' ? result.solarEnergy : undefined,
            fertility: typeof result?.fertility === 'number' ? result.fertility : undefined,
          }
        };
      }
      return { success: false, error: res.error || 'Failed to load planet yields' };
    } catch (err) {
      return { success: false, error: 'Network error loading planet yields' };
    }
  },

  // Capacity APIs
  async getCapacities(baseCoord: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await capacitiesService.getStatus(baseCoord);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to load capacities' };
    } catch (err) {
      return { success: false, error: 'Network error loading capacities' };
    }
  },

  // Action APIs
  async startResearch(baseCoord: string, techKey: TechnologyKey): Promise<{ success: boolean; data?: any; error?: string; reasons?: string[] }> {
    try {
      const res = await techService.start(baseCoord, techKey);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { 
        success: false, 
        error: res.message || 'Failed to start research', 
        reasons: res.reasons 
      };
    } catch (err) {
      return { success: false, error: 'Network error starting research' };
    }
  },

  async startDefense(baseCoord: string, defenseKey: DefenseKey): Promise<{ success: boolean; data?: any; error?: string; reasons?: string[] }> {
    try {
      const res = await defensesService.start(baseCoord, defenseKey);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { 
        success: false, 
        error: res.message || 'Failed to start defense', 
        reasons: res.reasons 
      };
    } catch (err) {
      return { success: false, error: 'Network error starting defense' };
    }
  },

  async startStructure(baseCoord: string, structureKey: BuildingKey): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await structuresService.start(baseCoord, structureKey);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.message || 'Failed to start structure construction' };
    } catch (err) {
      return { success: false, error: 'Network error starting structure construction' };
    }
  },

  // Cancel actions
  async cancelResearch(queueId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await techService.cancelQueueItem(queueId);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.message || 'Failed to cancel research' };
    } catch (err) {
      return { success: false, error: 'Network error cancelling research' };
    }
  },

  async cancelDefense(queueId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await defensesService.cancelQueue(queueId);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.message || 'Failed to cancel defense' };
    } catch (err) {
      return { success: false, error: 'Network error cancelling defense' };
    }
  },

  async cancelStructure(baseCoord: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await structuresService.cancelConstruction(baseCoord);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.message || 'Failed to cancel structure construction' };
    } catch (err) {
      return { success: false, error: 'Network error cancelling structure construction' };
    }
  },

  // Base stats API
  async getBaseStats(baseCoord: string): Promise<{ success: boolean; data?: BaseStatsDTO; error?: string }> {
    try {
      const res = await basesService.getBaseStats(baseCoord);
      if (res.success && res.data) {
        return { success: true, data: res.data.stats };
      }
      return { success: false, error: res.message || 'Failed to load base stats' };
    } catch (err) {
      return { success: false, error: 'Network error loading base stats' };
    }
  },

  // Base structures API (raw data for breakdown handlers)
  async getBaseStructures(baseCoord: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await basesService.getBaseStructures(baseCoord);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.message || res.error || 'Failed to load base structures' };
    } catch (err) {
      return { success: false, error: 'Network error loading base structures' };
    }
  },

  // Base defenses API (raw data for breakdown handlers)
  async getBaseDefenses(baseCoord: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await basesService.getBaseDefenses(baseCoord);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.message || res.error || 'Failed to load base defenses' };
    } catch (err) {
      return { success: false, error: 'Network error loading base defenses' };
    }
  },

  // Location/planet data API (raw data for breakdown handlers)
  async getLocationByCoord(baseCoord: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await universeService.getLocationByCoord(baseCoord);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to load location data' };
    } catch (err) {
      return { success: false, error: 'Network error loading location data' };
    }
  },

  // Fleets API (for BasePage public view)
  async getFleets(baseCoord: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Use the public overview endpoint which returns stationed and inbound fleets for any empire
      const res = await fleetsService.getFleetsOverview(baseCoord);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to load fleets data' };
    } catch (err) {
      return { success: false, error: 'Network error loading fleets data' };
    }
  },

  // Fleet Management APIs
  async getFleet(fleetId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fleetsService.getFleet(fleetId);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to load fleet data' };
    } catch (err) {
      return { success: false, error: 'Network error loading fleet data' };
    }
  },

  async getFleetStatus(fleetId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fleetsService.getFleetStatus(fleetId);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to load fleet status' };
    } catch (err) {
      return { success: false, error: 'Network error loading fleet status' };
    }
  },

  async dispatchFleet(fleetId: string, destinationCoord: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fleetsService.dispatchFleet(fleetId, destinationCoord);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to dispatch fleet' };
    } catch (err) {
      return { success: false, error: 'Network error dispatching fleet' };
    }
  },

  async recallFleet(fleetId: string, reason?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fleetsService.recallFleet(fleetId, reason);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to recall fleet' };
    } catch (err) {
      return { success: false, error: 'Network error recalling fleet' };
    }
  },

  async estimateTravelTime(fleetId: string, destinationCoord: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await fleetsService.estimateTravelTime(fleetId, destinationCoord);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to estimate travel time' };
    } catch (err) {
      return { success: false, error: 'Network error estimating travel time' };
    }
  },

  // Research APIs (for ResearchModal)
  async getResearchProjects(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.get('/game/research');
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.error || 'Failed to load research projects' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading research projects' };
    }
  },

  async startResearchProject(projectData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.post('/game/territories/colonize', projectData);
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.error || 'Failed to start research project' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error starting research project' };
    }
  },

  // Territory and Building APIs (for BaseManagement)
  async getTerritories(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.get('/game/territories');
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.error || 'Failed to load territories' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading territories' };
    }
  },

  async getBuildingsByLocation(locationCoord: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.get(`/game/buildings/location/${locationCoord}`);
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.error || 'Failed to load buildings' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading buildings' };
    }
  },

  async colonizeLocation(locationCoord: string, colonyName: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.post('/game/territories/colonize', { locationCoord, colonyName });
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.error || 'Failed to colonize location' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error colonizing location' };
    }
  },

  // Dashboard API
  async getDashboard(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.get('/game/dashboard');
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.error || 'Failed to load dashboard data' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading dashboard data' };
    }
  },

  // Empire APIs
  async getEmpire(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.get('/game/empire');
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.error || 'Failed to load empire data' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading empire data' };
    }
  },

  async createEmpire(name: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.post('/game/empire', { name });
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.error || 'Failed to create empire' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error creating empire' };
    }
  },

  async updateEmpireResources(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.post('/game/empire/update-resources');
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.error || 'Failed to update empire resources' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error updating empire resources' };
    }
  },

  // Universe APIs - wrapping universeService methods for enhanced store consistency
  async getSystemBodies(server: string, galaxy: number, region: number, system: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await universeService.getSystemBodies(server, galaxy, region, system);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to load system bodies' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading system bodies' };
    }
  },

  async getGalaxyRegionStarColors(server: string, galaxy: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await universeService.getGalaxyRegionStarColors(server, galaxy);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to load galaxy region star colors' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading galaxy region star colors' };
    }
  },

  async getGalaxyRegionSummaries(server: string, galaxy: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await universeService.getGalaxyRegionSummaries(server, galaxy);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to load galaxy region summaries' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading galaxy region summaries' };
    }
  },

  async getRegionSystems(server: string, galaxy: number, region: number): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await universeService.getRegionSystems(server, galaxy, region);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.error || 'Failed to load region systems' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading region systems' };
    }
  },

  // Units APIs - wrapping unitsService methods for enhanced store consistency
  async getUnitsCatalog(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await unitsService.getCatalog();
      if (res.success && res.data) {
        return { success: true, data: res.data.catalog };
      }
      return { success: false, error: res.message || 'Failed to load units catalog' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading units catalog' };
    }
  },

  async getUnitsStatus(locationCoord?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await unitsService.getStatus(locationCoord);
      if (res.success && res.data) {
        return { success: true, data: res.data.status };
      }
      return { success: false, error: res.message || 'Failed to load units status' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading units status' };
    }
  },

  async startUnit(locationCoord: string, unitKey: string): Promise<{ success: boolean; data?: any; error?: string; reasons?: string[] }> {
    try {
      const res = await unitsService.start(locationCoord, unitKey as any);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { 
        success: false, 
        error: res.message || 'Failed to start unit production', 
        reasons: res.reasons 
      };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error starting unit production' };
    }
  },

  async getUnitProductionQueue(baseCoord?: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await unitsService.getProductionQueue(baseCoord);
      if (res.success && res.data) {
        return { success: true, data: res.data.queue };
      }
      return { success: false, error: res.message || 'Failed to load unit production queue' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading unit production queue' };
    }
  },

  async cancelUnitProduction(itemId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await unitsService.cancelProduction(itemId);
      if (res.success && res.data) {
        return { success: true, data: res.data };
      }
      return { success: false, error: res.message || 'Failed to cancel unit production' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error cancelling unit production' };
    }
  },

  // Message APIs - for enhanced store message system integration
  async getMessages(type: 'inbox' | 'sentbox', page = 1, limit = 20): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const endpoint = type === 'inbox' ? '/game/messages/inbox' : '/game/messages/sentbox';
      const res = await api.get<ApiResponse<any>>(
        endpoint,
        { params: { page, limit } }
      );
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.message || `Failed to load ${type}` };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: `Network error loading ${type}` };
    }
  },

  async getMessageSummary(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.get<ApiResponse<any>>('/game/messages/summary');
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.message || ERROR_MESSAGES.FAILED_TO_LOAD_MESSAGE_SUMMARY };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading message summary' };
    }
  },

  async sendMessage(message: { toUsername: string; subject: string; content: string }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.post<ApiResponse<any>>('/game/messages/send', message);
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.message || 'Failed to send message' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error sending message' };
    }
  },

  async markMessagesAsRead(messageIds: string[]): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.post<ApiResponse<any>>('/game/messages/mark-read', { messageIds });
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.message || 'Failed to mark messages as read' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error marking messages as read' };
    }
  },

  async deleteMessage(messageId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.delete<ApiResponse<any>>(`/game/messages/${messageId}`);
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.message || 'Failed to delete message' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error deleting message' };
    }
  },

  // Status API - for server status monitoring
  async getServerStatus(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const res = await api.get<ApiResponse<any>>(API_ENDPOINTS.SYSTEM.STATUS);
      if (res.data.success) {
        return { success: true, data: res.data.data };
      }
      return { success: false, error: res.data.message || 'Failed to load server status' };
    } catch (err) {
      if (isApiErrorLike(err)) {
        return { success: false, error: err.message };
      }
      return { success: false, error: 'Network error loading server status' };
    }
  }
};




