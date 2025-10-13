import { Empire, ResourceCost } from '@game/shared';

/**
 * Service for managing and calculating empire resource capacities
 */
export class CapacityService {
  constructor(
    private readonly empire: Empire
  ) {}

  /**
   * Calculate the total resource capacity for an empire
   */
  public calculateResourceCapacity(): ResourceCost {
    return {
      credits: Infinity, // Credits have no cap
      energyDelta: 0,
    };
  }
}