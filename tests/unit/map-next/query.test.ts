import { isMapViewLevel, getViewParamFromLevel, getLevelFromViewParam } from '../../../packages/client/src/components/game/map-next/query';
import type { MapViewLevel } from '../../../packages/client/src/components/game/map-next/types';

describe('map-next/query helpers (unit)', () => {
  test('isMapViewLevel guards correctly', () => {
    expect(isMapViewLevel('universe')).toBe(true);
    expect(isMapViewLevel('galaxy')).toBe(true);
    expect(isMapViewLevel('region')).toBe(true);
    expect(isMapViewLevel('system')).toBe(true);

    expect(isMapViewLevel('overview')).toBe(false);
    expect(isMapViewLevel('structures')).toBe(false);
    expect(isMapViewLevel('')).toBe(false);
    expect(isMapViewLevel(null)).toBe(false);
    expect(isMapViewLevel(undefined)).toBe(false);
  });

  test('getViewParamFromLevel is identity mapping for current union', () => {
    const levels: MapViewLevel[] = ['universe', 'galaxy', 'region', 'system'];
    for (const lvl of levels) {
      expect(getViewParamFromLevel(lvl)).toBe(lvl);
    }
  });

  test('getLevelFromViewParam parses string or falls back', () => {
    expect(getLevelFromViewParam('universe', 'galaxy')).toBe<'universe'>('universe');
    expect(getLevelFromViewParam('galaxy', 'universe')).toBe<'galaxy'>('galaxy');
    expect(getLevelFromViewParam('region', 'universe')).toBe<'region'>('region');
    expect(getLevelFromViewParam('system', 'universe')).toBe<'system'>('system');

    // Invalid inputs fall back
    expect(getLevelFromViewParam('overview', 'universe')).toBe<'universe'>('universe');
    expect(getLevelFromViewParam('', 'galaxy')).toBe<'galaxy'>('galaxy');
    expect(getLevelFromViewParam(null, 'region')).toBe<'region'>('region');
    expect(getLevelFromViewParam(undefined, 'system')).toBe<'system'>('system');
  });
});
