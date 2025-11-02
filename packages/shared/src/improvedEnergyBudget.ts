/**
 * Improved Energy Budget Calculator
 * 
 * Clear separation between:
 * - Current energy state (active buildings only)
 * - Projected energy state (including in-progress constructions)
 */

import { getBuildingSpec, BuildingKey } from "./buildings.js";

export interface EnergyCalculationInput {
  buildings: Array<{
    key: BuildingKey;
    level: number;
    isActive: boolean;
  }>;
  constructionQueue?: Array<{
    key: BuildingKey;
    targetLevel: number; // The level it will be when complete
  }>;
  planet: {
    solarEnergy: number;
    gasYield: number;
  };
}

export interface EnergyState {
  // Base components
  baseline: number;
  solarProduction: number;
  gasProduction: number;
  otherProduction: number;
  consumption: number;
  
  // Calculated totals
  totalProduced: number;
  totalConsumed: number;
  currentBalance: number;
  
  // Projections (only if construction queue exists)
  queuedConsumption?: number;
  projectedBalance?: number;
  
  // Detailed breakdown for UI
  breakdown: {
    producers: Array<{ key: string; name: string; amount: number }>;
    consumers: Array<{ key: string; name: string; amount: number }>;
    queued?: Array<{ key: string; name: string; amount: number }>;
  };
}

export function calculateEnergyState(input: EnergyCalculationInput): EnergyState {
  const { buildings, constructionQueue = [], planet } = input;
  const BASELINE_ENERGY = 2;
  
  // Initialize state
  let solarProduction = 0;
  let gasProduction = 0;
  let otherProduction = 0;
  let consumption = 0;
  
  const producers: Array<{ key: string; name: string; amount: number }> = [];
  const consumers: Array<{ key: string; name: string; amount: number }> = [];
  
  // Process active buildings only
  for (const building of buildings) {
    if (!building.isActive) continue;
    
    const spec = getBuildingSpec(building.key);
    const amount = building.level;
    
    switch (building.key) {
      case 'solar_plants':
        solarProduction = amount * planet.solarEnergy;
        break;
        
      case 'gas_plants':
        gasProduction = amount * planet.gasYield;
        break;
        
      default:
        const delta = spec.energyDelta || 0;
        if (delta > 0) {
          otherProduction += amount * delta;
          producers.push({
            key: building.key,
            name: spec.name,
            amount: amount * delta
          });
        } else if (delta < 0) {
          consumption += amount * Math.abs(delta);
          consumers.push({
            key: building.key,
            name: spec.name,
            amount: amount * Math.abs(delta)
          });
        }
    }
  }
  
  // Calculate current state
  const totalProduced = BASELINE_ENERGY + solarProduction + gasProduction + otherProduction;
  const totalConsumed = consumption;
  const currentBalance = totalProduced - totalConsumed;
  
  // Build result
  const result: EnergyState = {
    baseline: BASELINE_ENERGY,
    solarProduction,
    gasProduction,
    otherProduction,
    consumption,
    totalProduced,
    totalConsumed,
    currentBalance,
    breakdown: {
      producers: producers.sort((a, b) => b.amount - a.amount),
      consumers: consumers.sort((a, b) => b.amount - a.amount)
    }
  };
  
  // Only calculate projections if there's an active construction queue
  if (constructionQueue.length > 0) {
    let queuedConsumption = 0;
    const queued: Array<{ key: string; name: string; amount: number }> = [];
    
    for (const item of constructionQueue) {
      const spec = getBuildingSpec(item.key);
      const delta = spec.energyDelta || 0;
      
      // Only count negative deltas (consumers) in queue
      if (delta < 0) {
        const amount = Math.abs(delta); // Per-level consumption
        queuedConsumption += amount;
        queued.push({
          key: item.key,
          name: spec.name,
          amount
        });
      }
    }
    
    result.queuedConsumption = queuedConsumption;
    result.projectedBalance = currentBalance - queuedConsumption;
    result.breakdown.queued = queued;
  }
  
  return result;
}

/**
 * Check if starting a new construction is allowed based on energy
 */
export function canStartConstruction(
  currentBalance: number,
  queuedConsumption: number,
  newBuildingKey: BuildingKey
): boolean {
  const spec = getBuildingSpec(newBuildingKey);
  const delta = spec.energyDelta || 0;
  
  // Producers are always allowed
  if (delta >= 0) return true;
  
  // For consumers, check if we have enough energy after accounting for queue
  const availableEnergy = currentBalance - queuedConsumption;
  const requiredEnergy = Math.abs(delta);
  
  return availableEnergy >= requiredEnergy;
}