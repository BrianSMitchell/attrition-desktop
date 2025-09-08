// Deterministic random helpers (decoupled from legacy MK star module)
// This module centralizes coordinate-based seeding so other modules
// (e.g., overhaul.ts) don't depend on ./astro and can outlive its deprecation.

/**
 * Generate deterministic seed from coordinate string (+ optional index)
 * Ensures the same coordinate/stream always produces the same value.
 * 
 * Example:
 *  const seed = generateSeedFromCoordinate("A00:10:22:10", 101)
 */
export const generateSeedFromCoordinate = (coordinate: string, index: number = 0): number => {
  let hash = 0;
  const str = coordinate + index.toString();

  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash);
};
