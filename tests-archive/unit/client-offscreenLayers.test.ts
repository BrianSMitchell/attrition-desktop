import { getCacheKeyFromDeps, buildCachedLayer, createOffscreenLayer, clearLayerCache } from '../offscreenLayers';

describe('getCacheKeyFromDeps', () => {
  it('produces the same key regardless of property order', () => {
    const a = { galaxy: 7, region: 12, server: 'A', showTerritories: true, systems: '100:12345' };
    const b = { systems: '100:12345', showTerritories: true, server: 'A', region: 12, galaxy: 7 };

    const keyA = getCacheKeyFromDeps(a as unknown as Record<string, unknown>);
    const keyB = getCacheKeyFromDeps(b as unknown as Record<string, unknown>);

    expect(keyA).toBe(keyB);
  });

  it('produces different keys when any relevant value changes', () => {
    const base = { server: 'A', galaxy: 7, region: 12, systems: '100:12345', showTerritories: true };
    const diffRegion = { ...base, region: 13 };
    const diffSystems = { ...base, systems: '101:12345' };
    const diffFlag = { ...base, showTerritories: false };

    expect(getCacheKeyFromDeps(base as unknown as Record<string, unknown>)).not.toBe(
      getCacheKeyFromDeps(diffRegion as unknown as Record<string, unknown>)
    );
    expect(getCacheKeyFromDeps(base as unknown as Record<string, unknown>)).not.toBe(
      getCacheKeyFromDeps(diffSystems as unknown as Record<string, unknown>)
    );
    expect(getCacheKeyFromDeps(base as unknown as Record<string, unknown>)).not.toBe(
      getCacheKeyFromDeps(diffFlag as unknown as Record<string, unknown>)
    );
  });

  it('handles non-serializable values gracefully (falls back to key join)', () => {
    // Create a value that JSON.stringify may not represent meaningfully
    const deps = { server: 'A', custom: new Map([['k', 'v']]) as unknown as Record<string, unknown> };
    const key = getCacheKeyFromDeps(deps as unknown as Record<string, unknown>);
    // Should be a non-empty string and stable across repeated calls
    expect(typeof key).toBe('string');
    const key2 = getCacheKeyFromDeps(deps as unknown as Record<string, unknown>);
    expect(key).toBe(key2);
  });

  it('treats nested object key order as irrelevant (stable on nested)', () => {
    const a = {
      a: 1,
      b: { x: 2, y: [3, 4], z: { p: 'q', r: 9 } },
      c: 'ok',
    };
    const b = {
      c: 'ok',
      b: { z: { r: 9, p: 'q' }, y: [3, 4], x: 2 },
      a: 1,
    };
    const keyA = getCacheKeyFromDeps(a as unknown as Record<string, unknown>);
    const keyB = getCacheKeyFromDeps(b as unknown as Record<string, unknown>);
    expect(keyA).toBe(keyB);
  });

  it('handles circular references without throwing and marks circulars', () => {
    const a: any = {};
    a.self = a; // circular
    const key = getCacheKeyFromDeps({ a } as Record<string, unknown>);
    expect(typeof key).toBe('string');
    // Implementation encodes circulars as "__circular__"
    expect(key).toContain('__circular__');
  });

  it('width/height (visual deps) changes produce different keys', () => {
    const k1 = getCacheKeyFromDeps({ width: 800, height: 600 } as Record<string, unknown>);
    const k2 = getCacheKeyFromDeps({ width: 1024, height: 600 } as Record<string, unknown>);
    const k3 = getCacheKeyFromDeps({ height: 600, width: 1024 } as Record<string, unknown>);
    expect(k1).not.toBe(k2);
    expect(k2).toBe(k3);
  });
});

describe('buildCachedLayer', () => {
  it('reuses the same layer instance for identical prefix + deps and creates new after clear', () => {
    const cache: Map<string, HTMLCanvasElement> = new Map();
    const prefix = 'test:layer';
    const depsA = { width: 100, height: 100, flag: true };

    const instance1 = buildCachedLayer(prefix, depsA, cache, () => createOffscreenLayer(100, 100));
    // Same deps but different key order
    const depsB = { height: 100, flag: true, width: 100 };
    const instance2 = buildCachedLayer(prefix, depsB, cache, () => createOffscreenLayer(100, 100));

    expect(instance1).toBe(instance2);

    // Clear by predicate and ensure a new instance is created
    clearLayerCache(cache, (k) => k.startsWith(prefix));
    const instance3 = buildCachedLayer(prefix, depsA, cache, () => createOffscreenLayer(100, 100));
    expect(instance3).not.toBe(instance1);
  });
});
