import { computeEnergyBalance, canStartWithDelta, EnergyContextInput } from '../../packages/shared/src/energyBudget';

describe('energyBudget helper', () => {
  test('baseline only: produced=2, consumed=0, reserved=0, balance=2', () => {
    const input: EnergyContextInput = {
      buildingsAtBase: [],
      location: {},
    };
    const res = computeEnergyBalance(input);
    expect(res.produced).toBe(2);
    expect(res.consumed).toBe(0);
    expect(res.reservedNegative).toBe(0);
    expect(res.balance).toBe(2);
  });

  test('solar scaling: produced adds level * solarEnergy', () => {
    const input: EnergyContextInput = {
      buildingsAtBase: [
        { key: 'solar_plants', level: 3, isActive: true },
      ],
      location: { solarEnergy: 5 },
    };
    const res = computeEnergyBalance(input);
    // baseline 2 + (3 * 5) = 17
    expect(res.produced).toBe(2 + 15);
    expect(res.consumed).toBe(0);
    expect(res.balance).toBe(17);
  });

  test('gas scaling: produced adds level * gasYield', () => {
    const input: EnergyContextInput = {
      buildingsAtBase: [
        { key: 'gas_plants', level: 2, isActive: true },
      ],
      location: { gasYield: 4 },
    };
    const res = computeEnergyBalance(input);
    // baseline 2 + (2 * 4) = 10
    expect(res.produced).toBe(2 + 8);
    expect(res.consumed).toBe(0);
    expect(res.balance).toBe(10);
  });

  test('mixed producers/consumers: fusion (+4) and research_labs (-1)', () => {
    const input: EnergyContextInput = {
      buildingsAtBase: [
        { key: 'fusion_plants', level: 1, isActive: true },   // +4
        { key: 'research_labs', level: 2, isActive: true },   // -1 per level => consumed += 2
      ],
      location: {},
    };
    const res = computeEnergyBalance(input);
    // produced: baseline 2 + 4 = 6
    // consumed: 2
    // balance: 6 - 2 = 4
    expect(res.produced).toBe(6);
    expect(res.consumed).toBe(2);
    expect(res.balance).toBe(4);
  });

  test('queued reservations include only negative deltas and do not multiply by level', () => {
    const input: EnergyContextInput = {
      buildingsAtBase: [
        // Active baseline to avoid negative balance confusion
        { key: 'fusion_plants', level: 1, isActive: true }, // +4
        // Queued consumer (negative delta), should count once (not multiplied by level)
        { key: 'research_labs', level: 3, isActive: false, isQueuedConsumer: true }, // -1 reserved
        // Queued producer should be ignored for reservation
        { key: 'fusion_plants', level: 2, isActive: false, isQueuedConsumer: false },
      ],
      location: {},
    };
    const res = computeEnergyBalance(input);
    expect(res.produced).toBe(2 + 4);
    expect(res.consumed).toBe(0);
    expect(res.reservedNegative).toBeLessThanOrEqual(0);
    expect(res.reservedNegative).toBe(-1); // do not multiply by level
    expect(res.balance).toBe(6);
  });

  test('canStartWithDelta: producers always allowed', () => {
    expect(canStartWithDelta({ balance: 0, reservedNegative: -5, delta: 0 })).toBe(true);
    expect(canStartWithDelta({ balance: -10, reservedNegative: -5, delta: 3 })).toBe(true);
  });

  test('canStartWithDelta: consumers allowed when projectedEnergy >= 0', () => {
    // balance 3, reserved -2, delta -1 => projected = 0 => allowed
    expect(canStartWithDelta({ balance: 3, reservedNegative: -2, delta: -1 })).toBe(true);
    // balance 3, reserved -2, delta -2 => projected = -1 => blocked
    expect(canStartWithDelta({ balance: 3, reservedNegative: -2, delta: -2 })).toBe(false);
  });

  test('unknown/missing specs are treated as neutral', () => {
    const input: EnergyContextInput = {
      buildingsAtBase: [{ key: 'unknown_building_key' as any, level: 5, isActive: true }],
      location: {},
    };
    const res = computeEnergyBalance(input);
    // Only baseline applies
    expect(res.produced).toBe(2);
    expect(res.consumed).toBe(0);
    expect(res.balance).toBe(2);
  });
});
