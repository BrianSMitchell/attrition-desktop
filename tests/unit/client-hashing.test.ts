import { computeStarsHash, computeEmpireTerritoryHash } from '../hashing';

describe('computeStarsHash', () => {
  it('is stable w.r.t. object key order and changes when region lengths change', () => {
    const map1: Record<number, any[] | undefined> = { 0: [1, 2, 3], 5: [] };
    const h1 = computeStarsHash(map1);

    // Same contents, different key order
    const map1b: Record<number, any[] | undefined> = { 5: [], 0: [1, 2, 3] };
    const h1b = computeStarsHash(map1b);
    expect(h1).toBe(h1b);

    // Change a region's length -> hash must change
    const map2: Record<number, any[] | undefined> = { ...map1, 0: [1, 2, 3, 4] };
    const h2 = computeStarsHash(map2);
    expect(h2).not.toBe(h1);
  });

  it('ignores regions outside 0..99 and treats missing regions as empty', () => {
    const emptyMap: Record<number, any[] | undefined> = {};
    const hEmpty = computeStarsHash(emptyMap);

    const withOutOfRange: Record<number, any[] | undefined> = { 1000: [1, 2, 3] }; // outside canonical range
    const hOut = computeStarsHash(withOutOfRange);

    expect(hOut).toBe(hEmpty);
  });
});

describe('computeEmpireTerritoryHash', () => {
  it('is order-independent and encodes list length in the prefix', () => {
    const empireA = { territories: ['A00:00:00', 'A00:00:01', 'A00:00:02'] } as any;
    const empireB = { territories: ['A00:00:02', 'A00:00:00', 'A00:00:01'] } as any;

    const hA = computeEmpireTerritoryHash(empireA);
    const hB = computeEmpireTerritoryHash(empireB);

    expect(hA).toBe(hB);

    const empireC = { territories: ['A00:00:00', 'A00:00:01'] } as any;
    const hC = computeEmpireTerritoryHash(empireC);

    expect(hC).not.toBe(hA);
    expect(hA.startsWith('3:')).toBe(true);
    expect(hC.startsWith('2:')).toBe(true);
  });

  it('handles empty/undefined consistently', () => {
    const h1 = computeEmpireTerritoryHash({ territories: [] } as any);
    const h2 = computeEmpireTerritoryHash(null as any);
    const h3 = computeEmpireTerritoryHash(undefined as any);

    expect(h1).toBe(h2);
    expect(h2).toBe(h3);
    expect(h1.startsWith('0:')).toBe(true);
  });
});
