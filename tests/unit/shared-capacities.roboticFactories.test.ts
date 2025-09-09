import { computeConstructionCapacity, computeProductionCapacity, type CapacityContext } from '../capacities';

describe('Robotic Factories capacity parity (+2 per level to Construction and Production)', () => {
  const defaults = {
    baseConstructionCredPerHour: 40,
    baseProductionCredPerHour: 0,
    baseResearchCredPerHour: 0,
  };

  test('Construction: +1 level robotic_factories yields +2 cred/h and appears in breakdown', () => {
    const ctxA: CapacityContext = {
      techLevels: {},
      buildingsAtBase: [],
      defaults,
    };

    const ctxB: CapacityContext = {
      techLevels: {},
      buildingsAtBase: [
        // Minimal shape; rely on catalogKey only for robotics detection
        { type: 'factory' as any, level: 1, isActive: true, catalogKey: 'robotic_factories' },
      ],
      defaults,
    };

    const a = computeConstructionCapacity(ctxA);
    const b = computeConstructionCapacity(ctxB);

    const delta = b.value - a.value;
    expect(delta).toBe(2);

    // Assert breakdown contains Robotic Factories = 2
    const rf = b.breakdown.find((x) => x.source === 'Robotic Factories');
    expect(rf).toBeTruthy();
    expect(rf?.value).toBe(2);
    expect(rf?.kind).toBe('flat');
  });

  test('Production: +1 level robotic_factories yields total 2 cred/h and appears in breakdown', () => {
    const ctx: CapacityContext = {
      techLevels: {},
      buildingsAtBase: [
        { type: 'factory' as any, level: 1, isActive: true, catalogKey: 'robotic_factories' },
      ],
      defaults,
    };

    const res = computeProductionCapacity(ctx);
    expect(res.value).toBe(2);

    const rf = res.breakdown.find((x) => x.source === 'Robotic Factories');
    expect(rf).toBeTruthy();
    expect(rf?.value).toBe(2);
    expect(rf?.kind).toBe('flat');
  });
});