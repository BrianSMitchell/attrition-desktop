import axios from 'axios';
import { ApiResponse } from '@game/shared';
import { attachMetrics } from './httpInstrumentation';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config (mirrors authService)
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
attachMetrics(api, 'universe');

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage');
  if (token) {
    try {
      const parsed = JSON.parse(token);
      if (parsed.state?.token) {
        (config.headers as any).Authorization = `Bearer ${parsed.state.token}`;
      }
    } catch (error) {
      console.error('Error parsing auth token:', error);
    }
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types for universe API
export interface UniverseLocationData {
  coord: string;
  type: 'planet' | 'asteroid' | 'star';
  starProperties?: {
    spectralClass: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M';
    color: string;
    temperatureK: number;
    massSolar: number;
    luminositySolar: number;
    effects?: {
      fertilityMultiplier?: number;
      energyMultiplier?: number;
      researchMultiplier?: number;
    };
  };
  orbitPosition?: number;
  terrain?: {
    type: string;
    baseline: {
      metal: number;
      gas: number;
      crystals: number;
      fertility: number;
      areaPlanet?: number;
      areaMoon?: number;
    };
  };
  positionBase?: { solarEnergy: number; fertility: number };
  starApplied?: {
    solarEnergyDelta: number;
    fertilityDelta: number;
    resourceDelta: { metal: number; gas: number; crystals: number };
  };
  result?: {
    solarEnergy: number;
    fertility: number;
    yields: { metal: number; gas: number; crystals: number };
    area?: number;
  };
  starOverhaul?: {
    kind: 'RED_GIANT' | 'SUPER_GIANT' | 'BLUE' | 'NEUTRON' | 'WHITE' | 'WHITE_DWARF' | 'ORANGE' | 'YELLOW';
    orbitModifiers?: Array<{
      position: number;
      solarEnergyDelta: number;
      fertilityDelta: number;
      resourceDelta: { metal: number; gas: number; crystals: number };
    }>;
    notes?: string;
  };
  owner: { id: string; username: string } | null;
  context?: {
    server: string;
    galaxy: number;
    region: number;
    system: number;
    body: number;
  };
  createdAt?: string;
}

export interface UniverseSystemBodiesData {
  system: {
    server: string;
    galaxy: number;
    region: number;
    system: number;
  };
  bodies: Array<{
    coord: string;
    type: 'planet' | 'asteroid' | 'star';
    owner: UniverseLocationData['owner'];
    // Overhaul fields (optional)
    orbitPosition?: number;
    terrain?: UniverseLocationData['terrain'];
    positionBase?: UniverseLocationData['positionBase'];
    starApplied?: UniverseLocationData['starApplied'];
    result?: UniverseLocationData['result'];
    starOverhaul?: UniverseLocationData['starOverhaul'];
  }>;
}

export interface UniverseRegionSystemsData {
  region: {
    server: string;
    galaxy: number;
    region: number;
  };
  systems: Array<{
    system: number;
    coord: string;
    star: { spectralClass: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'; color: string } | null;
    hasOwned: boolean;
  }>;
}

export interface GalaxyRegionSummariesData {
  server: string;
  galaxy: number;
  regions: Array<{
    region: number;
    systemsWithStars: number[];
  }>;
}

export interface GalaxyRegionStarColorsData {
  server: string;
  galaxy: number;
  regions: Array<{
    region: number;
    systems: Array<{ system: number; color: string }>;
  }>;
}

/**
 * Lightweight in-flight dedupe and short TTL cache for GETs.
 */
const inFlightByUrl = new Map<string, Promise<ApiResponse<any>>>();
const resultCache = new Map<string, { ts: number; data: ApiResponse<any> }>();
const CACHE_TTL_MS = 3000;

async function getWithDedupe<T>(url: string): Promise<ApiResponse<T>> {
  const now = Date.now();

  const cached = resultCache.get(url);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return cached.data as ApiResponse<T>;
  }

  const existing = inFlightByUrl.get(url);
  if (existing) {
    return (await existing) as ApiResponse<T>;
  }

  const p = (async () => {
    try {
      const response = await api.get<ApiResponse<T>>(url);
      const data = response.data;
      if (data && data.success) {
        resultCache.set(url, { ts: Date.now(), data });
      }
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        return error.response.data as ApiResponse<T>;
      }
      throw new Error('Network error occurred');
    } finally {
      inFlightByUrl.delete(url);
    }
  })();

  inFlightByUrl.set(url, p);
  return (await p) as ApiResponse<T>;
}

export const universeService = {
  async getLocationByCoord(coord: string): Promise<ApiResponse<UniverseLocationData>> {
    const url = `/universe/coord/${encodeURIComponent(coord)}`;
    return await getWithDedupe<UniverseLocationData>(url);
  },

  async getSystemBodies(server: string, galaxy: number, region: number, system: number): Promise<ApiResponse<UniverseSystemBodiesData>> {
    const url = `/universe/system/${encodeURIComponent(server)}/${galaxy}/${region}/${system}`;
    return await getWithDedupe<UniverseSystemBodiesData>(url);
  },

  async getGalaxyRegionSummaries(server: string, galaxy: number): Promise<ApiResponse<GalaxyRegionSummariesData>> {
    const url = `/universe/galaxy/${encodeURIComponent(server)}/${galaxy}/regions`;
    return await getWithDedupe<GalaxyRegionSummariesData>(url);
  },
  async getGalaxyRegionStarColors(server: string, galaxy: number): Promise<ApiResponse<GalaxyRegionStarColorsData>> {
    const url = `/universe/galaxy/${encodeURIComponent(server)}/${galaxy}/region-stars`;
    return await getWithDedupe<GalaxyRegionStarColorsData>(url);
  },
  async getRegionSystems(server: string, galaxy: number, region: number): Promise<ApiResponse<UniverseRegionSystemsData>> {
    const url = `/universe/region/${encodeURIComponent(server)}/${galaxy}/${region}`;
    return await getWithDedupe<UniverseRegionSystemsData>(url);
  }
};

export default universeService;
