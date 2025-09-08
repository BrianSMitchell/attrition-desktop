import { Empire } from '@game/shared';

/**
 * computeStarsHash
 * Produces a small, stable fingerprint for region -> systems arrays without embedding large JSON in cache keys.
 * - Depends only on per-region array lengths and region index (0..99)
 * - Order of object keys in the input map does not matter
 * - Any change in a region's systems length will change the hash
 */
export function computeStarsHash(byRegion: Record<number, any[] | undefined>): string {
  let count = 0;
  let accum = 0;
  // Deterministic iteration over 0..99 regions
  for (let i = 0; i < 100; i++) {
    const arr = byRegion[i] || [];
    const len = arr.length | 0;
    count += len;
    // Rolling checksum with region index contributes to stability
    accum = (accum * 31 + len + i) >>> 0;
  }
  return `${count}:${accum}`;
}

/**
 * computeEmpireTerritoryHash
 * Stable hash for an empire's territories list:
 * - Sorts the territories to make result order-independent
 * - Uses a DJB2-like rolling checksum
 * - Encodes list length in the prefix
 */
export function computeEmpireTerritoryHash(empire: Empire | undefined | null): string {
  const list = (empire?.territories || []).slice().sort();
  let accum = 0 >>> 0;
  for (const s of list) {
    for (let i = 0; i < s.length; i++) {
      accum = (accum * 33 + s.charCodeAt(i)) >>> 0;
    }
  }
  return `${list.length}:${accum}`;
}
