import { MapViewLevel } from './types';

/**
 * Type guard to validate a string as a MapViewLevel.
 */
export function isMapViewLevel(s: string | null | undefined): s is MapViewLevel {
  return s === 'universe' || s === 'galaxy' || s === 'region' || s === 'system';
}

/**
 * Returns the query param value for a given view level.
 * Currently 1:1 mapping to the union string literal.
 */
export function getViewParamFromLevel(level: MapViewLevel): string {
  return level;
}

/**
 * Parses the ?view= query param into a MapViewLevel, with a fallback when absent/invalid.
 */
export function getLevelFromViewParam(
  viewParam: string | null | undefined,
  fallback: MapViewLevel
): MapViewLevel {
  if (isMapViewLevel(viewParam)) {
    return viewParam;
  }
  return fallback;
}
