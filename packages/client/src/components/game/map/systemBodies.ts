/**
 * Deterministic system body generation + shared positioning for draw and hit-testing.
 * Mirrors the visual math used in SystemView to satisfy the canvas-debugging rule:
 * hit tests must use the exact same math as draw functions.
 */

import { STANDARD_ORBITS } from './mapConstants';
import { parseCoord } from '@game/shared';

export type BodyType = 'planet' | 'asteroid';

export interface SystemBody {
  id: number;
  type: BodyType;
  name: string;
  orbitRadius: number;
  size: number; // radius in pixels for draw/hit-test
  color: string;
  fertility: number;
  resources: {
    metal: number;
    energy: number;
    research: number;
  };
  owner?: { id: string; username: string } | null;
  hasColony: boolean;
}

/**
 * Mulberry32 PRNG - compact deterministic RNG from a numeric seed.
 * Returns a function that yields [0,1) floats.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), (a | 1));
    t ^= t + Math.imul(t ^ (t >>> 7), (t | 61));
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic color palette for planets (index chosen via RNG)
 */
function getPlanetColorDeterministic(rand: () => number): string {
  const colors = [
    '#8B4513', // Brown (rocky)
    '#4682B4', // Steel blue (water world)
    '#228B22', // Forest green (garden world)
    '#DC143C', // Crimson (volcanic)
    '#FFD700', // Gold (desert)
    '#9370DB', // Medium purple (gas giant)
    '#F0E68C', // Khaki (arid)
    '#20B2AA'  // Light sea green (ocean world)
  ];
  const idx = Math.floor(rand() * colors.length);
  return colors[idx];
}

/**
 * Deterministically generate bodies for a system from a numeric seed.
 * Matches the shape used by SystemView's previous mock bodies.
 */
export function generateSystemBodies(seed: number): SystemBody[] {
  const rand = mulberry32(seed);
  const bodies: SystemBody[] = [];
  // 5-19 bodies inclusive to keep coordinate.body in 0..19 (star=0, bodies=1..19)
  const bodyCount = 5 + Math.floor(rand() * 15);

  for (let i = 0; i < bodyCount; i++) {
    const isPlanet = rand() > 0.3; // ~70% planets
    // Snap orbit radius to standardized rings for consistent visuals across systems
    const orbitRadius = STANDARD_ORBITS[i % STANDARD_ORBITS.length];

    const size = isPlanet ? 3 + rand() * 4 : 1 + rand() * 2;
    const color = isPlanet ? getPlanetColorDeterministic(rand) : '#8B7355';

    const fertility = isPlanet ? (1 + Math.floor(rand() * 10)) : (1 + Math.floor(rand() * 3));
    const resVal = () => 1 + Math.floor(rand() * 10);

    bodies.push({
      id: i,
      type: isPlanet ? 'planet' : 'asteroid',
      name: isPlanet ? `Planet ${i + 1}` : `Asteroid ${i + 1}`,
      orbitRadius,
      size,
      color,
      fertility,
      resources: {
        metal: resVal(),
        energy: resVal(),
        research: resVal()
      },
      hasColony: false
    });
  }

  return bodies;
}

/**
 * Compute current position for a body at a given time.
 * Must mirror the math in drawCelestialBody:
 *   const angle = (time + body.id * 30) % (Math.PI * 2);
 *   x = centerX + cos(angle) * orbitRadius
 *   y = centerY + sin(angle) * orbitRadius
 *
 * Where "time" is expected to be Date.now() * 0.0005 same as draw.
 */
export function getBodyPositionAtTime(
  body: SystemBody,
  timeScalar: number,
  centerX: number,
  centerY: number
): { x: number; y: number } {
  const angle = (timeScalar + body.id * 30) % (Math.PI * 2);
  const x = centerX + Math.cos(angle) * body.orbitRadius;
  const y = centerY + Math.sin(angle) * body.orbitRadius;
  return { x, y };
}

/**
 * Minimal shape of a server-returned body for mapping to SystemBody.
 */
export interface ServerBody {
  coord: string;
  type: BodyType | 'star';
  result?: {
    fertility: number;
    yields: {
      metal: number;
      gas: number;
      crystals: number;
    };
  };
  owner?: { id: string; username: string } | null;
}

/**
 * Map server bodies (DB truth) into draw/hit-test SystemBody list.
 * - Skips the star (body 00)
 * - Uses STANDARD_ORBITS for visual parity
 * - Labels based on server type (authoritative)
 */
export function mapServerBodiesToSystemBodies(serverBodies: ServerBody[] | undefined | null): SystemBody[] {
  if (!serverBodies || serverBodies.length === 0) return [];

  const result: SystemBody[] = [];
  for (const b of serverBodies) {
    const c = parseCoord(b.coord);
    // Skip star (body 0)
    if (c.body === 0) continue;

    const id = c.body - 1; // 0..18
    const labelNum = c.body.toString().padStart(2, '0');
    const isPlanet = b.type === 'planet';
    const isAsteroid = b.type === 'asteroid';

    // Size/color by type (stable, no RNG)
    const size = isPlanet ? 5 : 2.5;
    const color = isPlanet ? '#2b4f28' : '#8B7355';

    result.push({
      id,
      type: isPlanet ? 'planet' : 'asteroid',
      name: isAsteroid ? `Asteroid ${labelNum}` : `Planet ${labelNum}`,
      orbitRadius: STANDARD_ORBITS[id % STANDARD_ORBITS.length],
      size,
      color,
      fertility: (typeof b.result?.fertility === 'number')
        ? Math.max(0, Math.min(10, Math.round(b.result!.fertility)))
        : (isPlanet ? 5 : 1),
      resources: {
        metal: (typeof b.result?.yields?.metal === 'number')
          ? Math.max(0, Math.min(10, Math.round(b.result!.yields.metal)))
          : 5,
        // Map new taxonomy gas->energy, crystals->research for UI indicators
        energy: (typeof b.result?.yields?.gas === 'number')
          ? Math.max(0, Math.min(10, Math.round(b.result!.yields.gas)))
          : 5,
        research: (typeof b.result?.yields?.crystals === 'number')
          ? Math.max(0, Math.min(10, Math.round(b.result!.yields.crystals)))
          : 5,
      },
      owner: b.owner ?? null,
      hasColony: !!b.owner,
    });
  }
  return result;
}
