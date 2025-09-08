// Utility functions for the game

import { Coordinates, CoordinateComponents } from './types';

/**
 * Calculate distance between two coordinates
 */
export function calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
  const dx = coord2.x - coord1.x;
  const dy = coord2.y - coord1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Generate a random coordinate within bounds
 */
export function generateRandomCoordinate(maxX: number, maxY: number): Coordinates {
  return {
    x: Math.floor(Math.random() * maxX),
    y: Math.floor(Math.random() * maxY)
  };
}

/**
 * Check if coordinates are within bounds
 */
export function isWithinBounds(coord: Coordinates, maxX: number, maxY: number): boolean {
  return coord.x >= 0 && coord.x < maxX && coord.y >= 0 && coord.y < maxY;
}

/**
 * Generate a unique name for star systems
 */
export function generateSystemName(): string {
  const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];
  const suffixes = ['Centauri', 'Draconis', 'Orionis', 'Cygni', 'Lyrae', 'Vega', 'Sirius', 'Rigel'];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const number = Math.floor(Math.random() * 999) + 1;
  
  return `${prefix} ${suffix} ${number}`;
}

/**
 * Generate a unique name for planets
 */
export function generatePlanetName(): string {
  const names = [
    'Kepler', 'Proxima', 'Gliese', 'Trappist', 'HD', 'K2', 'TOI', 'WASP',
    'HAT-P', 'XO', 'TrES', 'CoRoT', 'Qatar', 'KELT', 'MASCARA'
  ];
  
  const name = names[Math.floor(Math.random() * names.length)];
  const number = Math.floor(Math.random() * 9999) + 1;
  const letter = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // a-z
  
  return `${name}-${number}${letter}`;
}

/**
 * Calculate travel time between two coordinates
 */
export function calculateTravelTime(
  from: Coordinates, 
  to: Coordinates, 
  speed: number
): number {
  const distance = calculateDistance(from, to);
  return Math.ceil(distance / speed);
}

/**
 * Format large numbers with suffixes (K, M, B)
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max
 */
export function randomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Check if two coordinates are adjacent (within 1 unit)
 */
export function areAdjacent(coord1: Coordinates, coord2: Coordinates): boolean {
  const distance = calculateDistance(coord1, coord2);
  return distance <= 1.5; // Allow for diagonal adjacency
}

/**
 * Get all coordinates within a certain radius
 */
export function getCoordinatesInRadius(
  center: Coordinates, 
  radius: number, 
  maxX: number, 
  maxY: number
): Coordinates[] {
  const coordinates: Coordinates[] = [];
  
  for (let x = Math.max(0, center.x - radius); x <= Math.min(maxX - 1, center.x + radius); x++) {
    for (let y = Math.max(0, center.y - radius); y <= Math.min(maxY - 1, center.y + radius); y++) {
      const coord = { x, y };
      if (calculateDistance(center, coord) <= radius) {
        coordinates.push(coord);
      }
    }
  }
  
  return coordinates;
}

// ===== NEW HIERARCHICAL COORDINATE SYSTEM UTILITIES =====

/**
 * Parse coordinate string into components
 * Format: "A00:10:22:10" (server:galaxy:region:system:body)
 */
export function parseCoord(coordStr: string): CoordinateComponents {
  const coordRegex = /^([A-Z])(\d{2}):(\d{2}):(\d{2}):(\d{2})$/;
  const match = coordStr.match(coordRegex);
  
  if (!match) {
    throw new Error(`Invalid coordinate format: ${coordStr}. Expected format: A00:10:22:10`);
  }
  
  return {
    server: match[1],
    galaxy: parseInt(match[2], 10),
    region: parseInt(match[3], 10),
    system: parseInt(match[4], 10),
    body: parseInt(match[5], 10)
  };
}

/**
 * Format coordinate components into string
 */
export function formatCoord(coord: CoordinateComponents): string {
  return `${coord.server}${coord.galaxy.toString().padStart(2, '0')}:${coord.region.toString().padStart(2, '0')}:${coord.system.toString().padStart(2, '0')}:${coord.body.toString().padStart(2, '0')}`;
}

/**
 * Calculate hierarchical distance between two coordinates
 * Distance formula: |galaxy1 - galaxy2| * 10000 + regionGridDist * 1000 + systemGridDist * 100 + |body1 - body2|
 */
export function calculateHierarchicalDistance(coord1: CoordinateComponents, coord2: CoordinateComponents): number {
  // Different servers are infinitely far apart
  if (coord1.server !== coord2.server) {
    return Infinity;
  }
  
  const galaxyDist = Math.abs(coord1.galaxy - coord2.galaxy) * 10000;
  
  // If different galaxies, only galaxy distance matters
  if (coord1.galaxy !== coord2.galaxy) {
    return galaxyDist;
  }
  
  // Calculate Manhattan distance in 10x10 region grid
  const region1X = coord1.region % 10;
  const region1Y = Math.floor(coord1.region / 10);
  const region2X = coord2.region % 10;
  const region2Y = Math.floor(coord2.region / 10);
  const regionGridDist = (Math.abs(region1X - region2X) + Math.abs(region1Y - region2Y)) * 1000;
  
  // If different regions, add region distance
  if (coord1.region !== coord2.region) {
    return galaxyDist + regionGridDist;
  }
  
  // Calculate Manhattan distance in 10x10 system grid
  const system1X = coord1.system % 10;
  const system1Y = Math.floor(coord1.system / 10);
  const system2X = coord2.system % 10;
  const system2Y = Math.floor(coord2.system / 10);
  const systemGridDist = (Math.abs(system1X - system2X) + Math.abs(system1Y - system2Y)) * 100;
  
  // If different systems, add system distance
  if (coord1.system !== coord2.system) {
    return galaxyDist + regionGridDist + systemGridDist;
  }
  
  // Same system, just body distance
  const bodyDist = Math.abs(coord1.body - coord2.body);
  return galaxyDist + regionGridDist + systemGridDist + bodyDist;
}

/**
 * Validate coordinate string format
 */
export function isValidCoordinate(coordStr: string): boolean {
  try {
    const coord = parseCoord(coordStr);
    return (
      coord.galaxy >= 0 && coord.galaxy <= 39 &&
      coord.region >= 0 && coord.region <= 99 &&
      coord.system >= 0 && coord.system <= 99 &&
      coord.body >= 0 && coord.body <= 19
    );
  } catch {
    return false;
  }
}

/**
 * Generate a random coordinate within valid ranges
 */
export function generateRandomHierarchicalCoordinate(server: string = 'A'): CoordinateComponents {
  return {
    server,
    galaxy: randomInt(0, 39),
    region: randomInt(0, 99),
    system: randomInt(0, 99),
    body: randomInt(0, 19)
  };
}

// ===== COLONIZATION COST UTILITIES =====

/**
 * Progressive colonization costs based on game mechanics
 * Costs: 100, 200, 500, 1k, 2k, 5k, 10k, 20k, 50k, 100k, 200k, 400k, 650k, 1M, 1.5M, 2.5M, 4M, 6.5M, 10M, 15M, 25M, 40M, 65M, 100M, 150M, 250M, 400M, 650M, ...
 */
const COLONIZATION_COSTS = [
  100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000,
  200000, 400000, 650000, 1000000, 1500000, 2500000, 4000000, 6500000, 10000000, 15000000,
  25000000, 40000000, 65000000, 100000000, 150000000, 250000000, 400000000, 650000000
];

/**
 * Calculate colonization cost based on empire base count and deletion discount
 * @param baseCount Current number of bases the empire owns
 * @param hasDeletedBase Whether empire gets 25% discount from deleting a base
 * @returns Credits cost for next colonization
 */
export function getColonizationCost(baseCount: number, hasDeletedBase: boolean): number {
  // Get base cost from progression table
  const baseCost = COLONIZATION_COSTS[Math.min(baseCount, COLONIZATION_COSTS.length - 1)] || 650000000;
  
  // Apply 25% discount if empire has deleted a base
  return hasDeletedBase ? Math.floor(baseCost * 0.25) : baseCost;
}

/**
 * Format credits with appropriate suffixes for display
 * @param amount Credits amount to format
 * @returns Formatted string (e.g., "1.5K", "2.5M", "650M")
 */
export function formatCredits(amount: number): string {
  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toString();
}
