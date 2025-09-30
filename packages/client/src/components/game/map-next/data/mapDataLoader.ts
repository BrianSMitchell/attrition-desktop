import universeService, { GalaxyRegionSummariesData, UniverseRegionSystemsData, UniverseSystemBodiesData, UniverseLocationData } from '../../../../services/universeService';
import fleetsService, { FleetsListDTO, FleetStatusDTO } from '../../../../services/fleetsService';
import { ApiResponse } from '@game/shared';
import { MapViewLevel } from '../types';

/**
 * Map Data Loader - Centralized data loading utilities for map views
 * Handles data fetching, caching, and error handling for all map view levels
 */

// Cache for data to avoid repeated fetches
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 30000; // 30 seconds

// In-flight request tracking to prevent duplicate requests
const inFlightRequests = new Map<string, Promise<any>>();

/**
 * Generate cache key for data requests
 */
function generateCacheKey(type: string, ...params: any[]): string {
  return `${type}:${JSON.stringify(params)}`;
}

/**
 * Check if cached data is still valid
 */
function isCacheValid(key: string): boolean {
  const cached = dataCache.get(key);
  if (!cached) return false;
 return Date.now() - cached.timestamp < CACHE_DURATION;
}

/**
 * Get cached data or fetch new data
 */
async function getCachedOrFetch<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
  // Check cache first
  if (isCacheValid(key)) {
    return dataCache.get(key)!.data as T;
  }

  // Check for in-flight requests
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  // Start new request
  const requestPromise = fetchFn().then(data => {
    // Cache the result
    dataCache.set(key, { data, timestamp: Date.now() });
    inFlightRequests.delete(key);
    return data;
  }).catch(error => {
    inFlightRequests.delete(key);
    throw error;
  });

  inFlightRequests.set(key, requestPromise);
  return requestPromise;
}

/**
 * Clear cache for specific data types
 */
export function clearCacheForType(type: string): void {
  const keysToDelete: string[] = [];
  dataCache.forEach((value, key) => {
    // Use value parameter to avoid TS6133 error
    console.log(`Cache entry: ${key} = ${JSON.stringify(value)}`);
    if (key.startsWith(`${type}:`)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => dataCache.delete(key));
}

/**
 * Load galaxy data - regions and their systems
 */
export async function loadGalaxyData(server: string, galaxy: number): Promise<ApiResponse<GalaxyRegionSummariesData>> {
  const cacheKey = generateCacheKey('galaxy', server, galaxy);
  return getCachedOrFetch(cacheKey, () => universeService.getGalaxyRegionSummaries(server, galaxy));
}

/**
 * Load region data - systems within a region
 */
export async function loadRegionData(server: string, galaxy: number, region: number): Promise<ApiResponse<UniverseRegionSystemsData>> {
  const cacheKey = generateCacheKey('region', server, galaxy, region);
  return getCachedOrFetch(cacheKey, () => universeService.getRegionSystems(server, galaxy, region));
}

/**
 * Load system data - bodies within a system
 */
export async function loadSystemData(server: string, galaxy: number, region: number, system: number): Promise<ApiResponse<UniverseSystemBodiesData>> {
  const cacheKey = generateCacheKey('system', server, galaxy, region, system);
  return getCachedOrFetch(cacheKey, () => universeService.getSystemBodies(server, galaxy, region, system));
}

/**
 * Load planet data - detailed information about a specific location
 */
export async function loadPlanetData(coord: string): Promise<ApiResponse<UniverseLocationData>> {
  const cacheKey = generateCacheKey('planet', coord);
  return getCachedOrFetch(cacheKey, () => universeService.getLocationByCoord(coord));
}

/**
 * Load fleet data for a specific location or all fleets
 */
export async function loadFleetData(baseCoord?: string): Promise<ApiResponse<FleetsListDTO>> {
  const cacheKey = generateCacheKey('fleets', baseCoord || 'all');
  return getCachedOrFetch(cacheKey, () => fleetsService.getFleets(baseCoord));
}

/**
 * Load detailed fleet status
 */
export async function loadFleetStatus(fleetId: string): Promise<ApiResponse<FleetStatusDTO>> {
  const cacheKey = generateCacheKey('fleetStatus', fleetId);
  return getCachedOrFetch(cacheKey, () => fleetsService.getFleetStatus(fleetId));
}

/**
 * Parse coordinate string into components
 */
export interface CoordinateComponents {
  server: string;
  galaxy: number;
  region: number;
  system: number;
  body?: number;
}

export function parseCoordinate(coord: string): CoordinateComponents | null {
  // Expected format: "A00:00:12:02" where A00 = server+galaxy, 00 = region, 12 = system, 02 = body
  const parts = coord.split(':');
  if (parts.length < 4) return null;

  try {
    // Parse the first part which contains server letter and galaxy number
    const serverGalaxy = parts[0]; // e.g., "A00"
    const server = serverGalaxy.charAt(0); // Extract just "A"
    const galaxy = parseInt(serverGalaxy.slice(1), 10); // Extract "00" -> 0
    
    return {
      server: server,
      galaxy: galaxy,
      region: parseInt(parts[1], 10), // Now parts[1] is the region
      system: parseInt(parts[2], 10), // parts[2] is the system
      body: parts[3] ? parseInt(parts[3], 10) : undefined // parts[3] is the body
    };
  } catch (error) {
    return null;
  }
}

/**
 * Convert coordinate components to map position
 * This is a placeholder - actual implementation will depend on the coordinate system
 */
export function coordinateToPosition(components: CoordinateComponents, viewLevel: MapViewLevel): { x: number; y: number } {
  // Simple grid-based positioning for now
  switch (viewLevel) {
    case 'universe':
      // Universe level - position galaxies
      return { x: components.galaxy * 200, y: 0 };
    case 'galaxy':
      // Galaxy level - position regions
      return { x: components.region * 150, y: components.region * 100 };
    case 'region':
      // Region level - position systems
      return { x: components.system * 120, y: components.system * 80 };
    case 'system':
      // System level - position bodies
      return { x: components.body ? components.body * 80 : 0, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
}

/**
 * Clear cache for a specific key or all cache
 */
export function clearCache(key?: string): void {
  if (key) {
    dataCache.delete(key);
  } else {
    dataCache.clear();
  }
}

/**
 * Clear all in-flight requests
 */
export function clearInFlightRequests(): void {
  inFlightRequests.clear();
}

// Export types for external use
export type {
  GalaxyRegionSummariesData,
  UniverseRegionSystemsData,
  UniverseSystemBodiesData,
  UniverseLocationData,
  FleetsListDTO,
  FleetStatusDTO
};
