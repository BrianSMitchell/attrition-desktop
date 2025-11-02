/**
 * Unit tests for Energy Budget helper
 * Tests canonical scenarios to ensure consistent energy calculations
 */

import { computeEnergyBalance, canStartWithDelta } from '../energyBudget.js';

describe('Energy Budget Helper', () => {
  describe('computeEnergyBalance', () => {
    test('baseline only (+2)', () => {
      const result = computeEnergyBalance({
        buildingsAtBase: [],
        location: {},
      });

      expect(result).toEqual({
        produced: 2,
        consumed: 0,
        balance: 2,
        reservedNegative: 0,
      });
    });

    test('solar scaling with planet context', () => {
      const result = computeEnergyBalance({
        buildingsAtBase: [
          { key: 'solar_plants', level: 3, isActive: true }
        ],
        location: { solarEnergy: 5 },
      });

      expect(result).toEqual({
        produced: 2 + (3 * 5), // baseline + level * solarEnergy
        consumed: 0,
        balance: 17,
        reservedNegative: 0,
      });
    });

    test('gas scaling with planet context', () => {
      const result = computeEnergyBalance({
        buildingsAtBase: [
          { key: 'gas_plants', level: 2, isActive: true }
        ],
        location: { gasYield: 4 },
      });

      expect(result).toEqual({
        produced: 2 + (2 * 4), // baseline + level * gasYield
        consumed: 0,
        balance: 10,
        reservedNegative: 0,
      });
    });

    test('mixed producers and consumers', () => {
      const result = computeEnergyBalance({
        buildingsAtBase: [
          { key: 'solar_plants', level: 2, isActive: true }, // +10 (2 * 5)
          { key: 'research_labs', level: 1, isActive: true }, // -1 (energyDelta: -1)
          { key: 'metal_refineries', level: 1, isActive: true }, // -1 (energyDelta: -1)
        ],
        location: { solarEnergy: 5 },
      });

      expect(result).toEqual({
        produced: 2 + 10, // baseline + solar
        consumed: 2, // labs + refineries
        balance: 10,
        reservedNegative: 0,
      });
    });

    test('queued consumer reservations', () => {
      const result = computeEnergyBalance({
        buildingsAtBase: [
          { key: 'solar_plants', level: 2, isActive: true }, // +10
          { key: 'research_labs', level: 1, isActive: false, isQueuedConsumer: true }, // reserve -1
        ],
        location: { solarEnergy: 5 },
        includeQueuedReservations: true,
      });

      expect(result).toEqual({
        produced: 12, // baseline + solar
        consumed: 0, // queued consumer not active yet
        balance: 12,
        reservedNegative: -1, // negative reservation
      });
    });

    test('queued reservations disabled', () => {
      const result = computeEnergyBalance({
        buildingsAtBase: [
          { key: 'solar_plants', level: 2, isActive: true },
          { key: 'research_labs', level: 1, isActive: false, isQueuedConsumer: true },
        ],
        location: { solarEnergy: 5 },
        includeQueuedReservations: false,
      });

      expect(result).toEqual({
        produced: 12,
        consumed: 0,
        balance: 12,
        reservedNegative: 0, // reservations ignored
      });
    });
  });

  describe('canStartWithDelta', () => {
    test('producers always allowed', () => {
      expect(canStartWithDelta({
        balance: -10,
        reservedNegative: -5,
        delta: 5, // producer
      })).toBe(true);

      expect(canStartWithDelta({
        balance: 0,
        reservedNegative: 0,
        delta: 0, // neutral
      })).toBe(true);
    });

    test('consumers allowed when projection >= 0', () => {
      expect(canStartWithDelta({
        balance: 10,
        reservedNegative: -3,
        delta: -5, // consumer
      })).toBe(true); // 10 + (-3) + (-5) = 2 >= 0
    });

    test('consumers blocked when projection < 0', () => {
      expect(canStartWithDelta({
        balance: 5,
        reservedNegative: -2,
        delta: -5, // consumer
      })).toBe(false); // 5 + (-2) + (-5) = -2 < 0
    });

    test('edge case: exactly 0 projection allowed', () => {
      expect(canStartWithDelta({
        balance: 7,
        reservedNegative: -2,
        delta: -5, // consumer
      })).toBe(true); // 7 + (-2) + (-5) = 0 = 0
    });
  });
});
