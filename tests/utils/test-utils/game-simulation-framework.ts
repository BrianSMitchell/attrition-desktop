/**
 * Game Simulation and State Testing Framework
 * 
 * This framework provides comprehensive tools for testing Attrition's game logic,
 * including state management, resource calculations, turn-based mechanics,
 * and automated game scenario testing.
 */

import { Empire } from '../models/Empire';
import { Location } from '../models/Location';
import { Building } from '../models/Building';
import { Fleet } from '../models/Fleet';
import { TechQueue } from '../models/TechQueue';
import { UnitQueue } from '../models/UnitQueue';
import { ResearchProject } from '../models/ResearchProject';
import { ResourceService } from '../services/resourceService';
import { GameLoopService } from '../services/gameLoopService';
import { TechService } from '../services/techService';
import { StructuresService } from '../services/structuresService';
import { UnitsService } from '../services/unitsService';
import { CapacityService } from '../services/capacityService';
import { EconomyService } from '../services/economyService';
import { 
  TechnologyKey, 
  BuildingKey, 
  UnitKey, 
  ResourceCost, 
  getTechSpec,
  getBuildingSpec,
  getUnitSpec 
} from '@game/shared';
import mongoose from 'mongoose';

// ========================
// Core Types & Interfaces
// ========================

export interface GameSimulationConfig {
  /** Starting resources for test empires */
  startingResources: {
    credits: number;
    energy: number;
    metal: number;
    research: number;
  };
  /** Time acceleration factor for simulation */
  timeAcceleration: number;
  /** Maximum simulation time in real milliseconds */
  maxSimulationTime: number;
  /** Enable debug logging */
  debug: boolean;
}

export interface EmpireTestState {
  empireId: string;
  userId: string;
  resources: ResourceCost & { energy: number; metal: number; research: number };
  territories: string[];
  technologies: Map<TechnologyKey, number>;
  buildings: BuildingTestState[];
  units: UnitTestState[];
  queues: {
    tech: TechQueueState[];
    units: UnitQueueState[];
    buildings: BuildingQueueState[];
  };
}

export interface BuildingTestState {
  locationCoord: string;
  buildingKey: BuildingKey;
  level: number;
  isActive: boolean;
  constructionCompleted?: Date;
}

export interface UnitTestState {
  locationCoord: string;
  unitKey: UnitKey;
  quantity: number;
  isActive: boolean;
}

export interface TechQueueState {
  techKey: TechnologyKey;
  level: number;
  locationCoord: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  completesAt?: Date;
  charged: boolean;
}

export interface UnitQueueState {
  unitKey: UnitKey;
  quantity: number;
  locationCoord: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  completesAt?: Date;
}

export interface BuildingQueueState {
  buildingKey: BuildingKey;
  level: number;
  locationCoord: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  constructionCompleted?: Date;
}

export interface GameScenarioResult {
  success: boolean;
  duration: number;
  iterations: number;
  finalState: EmpireTestState[];
  metrics: GameMetrics;
  errors: string[];
  warnings: string[];
}

export interface GameMetrics {
  totalResourcesGenerated: ResourceCost & { energy: number; metal: number; research: number };
  totalResourcesSpent: ResourceCost & { energy: number; metal: number; research: number };
  totalTechnologiesCompleted: number;
  totalBuildingsCompleted: number;
  totalUnitsProduced: number;
  averageResourceGenerationPerHour: number;
  resourceEfficiencyRatio: number;
}

export interface GameAssertion {
  type: 'resource' | 'technology' | 'building' | 'unit' | 'queue' | 'custom';
  empireId?: string;
  condition: (state: EmpireTestState) => boolean;
  description: string;
  required?: boolean;
}

// ======================
// Game Simulation Engine
// ======================

export class GameSimulationEngine {
  private config: GameSimulationConfig;
  private empires: Map<string, EmpireTestState>;
  private gameLoop: GameLoopService;
  private startTime: Date;
  private isRunning: boolean;
  private metrics: GameMetrics;

  constructor(config: Partial<GameSimulationConfig> = {}) {
    this.config = {
      startingResources: {
        credits: 10000,
        energy: 1000,
        metal: 1000,
        research: 100
      },
      timeAcceleration: 1000, // 1000x faster than real time
      maxSimulationTime: 60000, // 1 minute max
      debug: false,
      ...config
    };
    
    this.empires = new Map();
    this.gameLoop = GameLoopService.getInstance();
    this.startTime = new Date();
    this.isRunning = false;
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): GameMetrics {
    return {
      totalResourcesGenerated: { credits: 0, energy: 0, metal: 0, research: 0 },
      totalResourcesSpent: { credits: 0, energy: 0, metal: 0, research: 0 },
      totalTechnologiesCompleted: 0,
      totalBuildingsCompleted: 0,
      totalUnitsProduced: 0,
      averageResourceGenerationPerHour: 0,
      resourceEfficiencyRatio: 0
    };
  }

  /**
   * Create a test empire with specified configuration
   */
  async createTestEmpire(userId: string, territories: string[] = ['A00:00:00:00']): Promise<EmpireTestState> {
    const empireId = new mongoose.Types.ObjectId().toString();
    
    // Create empire in database
    const empire = new Empire({
      _id: empireId,
      userId: userId,
      name: `Test Empire ${userId}`,
      territories: territories,
      baseCount: territories.length,
      hasDeletedBase: false,
      resources: {
        credits: this.config.startingResources.credits,
        energy: this.config.startingResources.energy
      },
      techLevels: new Map(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    await empire.save();

    // Create locations for territories
    for (const coord of territories) {
      await this.createTestLocation(coord, userId);
    }

    const testState: EmpireTestState = {
      empireId,
      userId,
      resources: { ...this.config.startingResources },
      territories,
      technologies: new Map(),
      buildings: [],
      units: [],
      queues: {
        tech: [],
        units: [],
        buildings: []
      }
    };

    this.empires.set(empireId, testState);
    
    if (this.config.debug) {
      console.log(`[GameSim] Created test empire: ${empireId} for user: ${userId}`);
    }
    
    return testState;
  }

  /**
   * Create a test location
   */
  private async createTestLocation(coord: string, owner: string): Promise<void> {
    const location = new Location({
      coord,
      owner,
      name: `Test Location ${coord}`,
      createdAt: new Date()
    });
    
    await location.save();
  }

  /**
   * Add buildings to an empire's base
   */
  async addTestBuilding(
    empireId: string, 
    locationCoord: string, 
    buildingKey: BuildingKey, 
    level: number = 1
  ): Promise<void> {
    const building = new Building({
      empireId,
      locationCoord,
      buildingKey,
      level,
      isActive: true,
      constructionCompleted: new Date(),
      identityKey: `${empireId}:${locationCoord}:${buildingKey}:L${level}:Q1`
    });

    await building.save();

    const state = this.empires.get(empireId);
    if (state) {
      state.buildings.push({
        locationCoord,
        buildingKey,
        level,
        isActive: true,
        constructionCompleted: new Date()
      });
    }

    if (this.config.debug) {
      console.log(`[GameSim] Added building: ${buildingKey} level ${level} to ${empireId} at ${locationCoord}`);
    }
  }

  /**
   * Start research for a technology
   */
  async startTechnology(
    empireId: string, 
    locationCoord: string, 
    techKey: TechnologyKey
  ): Promise<{ success: boolean; data?: any; reasons?: string[] }> {
    const result = await TechService.start(empireId, locationCoord, techKey);
    
    if (result.success && result.data) {
      const state = this.empires.get(empireId);
      if (state) {
        state.queues.tech.push({
          techKey,
          level: result.data.level || 1,
          locationCoord,
          status: 'active',
          completesAt: result.data.completesAt,
          charged: true
        });
      }
    }

    if (this.config.debug) {
      console.log(`[GameSim] Started technology ${techKey} for ${empireId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      if (!result.success && (result as any).reasons) {
        console.log(`[GameSim] Reasons: ${(result as any).reasons.join(', ')}`);
      }
    }

    return result;
  }

  /**
   * Start building construction
   */
  async startBuilding(
    empireId: string, 
    locationCoord: string, 
    buildingKey: BuildingKey
  ): Promise<{ success: boolean; data?: any; reasons?: string[] }> {
    const result = await StructuresService.start(empireId, locationCoord, buildingKey);
    
    if (result.success && result.data) {
      const state = this.empires.get(empireId);
      if (state) {
        state.queues.buildings.push({
          buildingKey,
          level: result.data.level || 1,
          locationCoord,
          status: 'active',
          constructionCompleted: result.data.constructionCompleted
        });
      }
    }

    if (this.config.debug) {
      console.log(`[GameSim] Started building ${buildingKey} for ${empireId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    }

    return result;
  }

  /**
   * Start unit production
   */
  async startUnit(
    empireId: string, 
    locationCoord: string, 
    unitKey: UnitKey, 
    quantity: number = 1
  ): Promise<{ success: boolean; data?: any; reasons?: string[] }> {
    const result = await UnitsService.start(empireId, locationCoord, unitKey, quantity);
    
    if (result.success && result.data) {
      const state = this.empires.get(empireId);
      if (state) {
        state.queues.units.push({
          unitKey,
          quantity,
          locationCoord,
          status: 'active',
          completesAt: result.data.completesAt
        });
      }
    }

    if (this.config.debug) {
      console.log(`[GameSim] Started unit production ${unitKey} x${quantity} for ${empireId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    }

    return result;
  }

  /**
   * Run a single game loop iteration
   */
  async runGameTick(): Promise<void> {
    if (this.config.debug) {
      console.log('[GameSim] Running game tick...');
    }

    // Manually run the game loop logic
    const gameLoop = GameLoopService.getInstance();
    await (gameLoop as any).runGameLoop();

    // Update empire states
    await this.updateEmpireStates();

    // Update metrics
    this.updateMetrics();
  }

  /**
   * Update empire states from database
   */
  private async updateEmpireStates(): Promise<void> {
    for (const [empireId, state] of this.empires) {
      // Update empire resources
      const empire = await Empire.findById(empireId);
      if (empire) {
        state.resources.credits = empire.resources.credits;
        state.resources.energy = empire.resources.energy;
        
        // Update tech levels
        if (empire.techLevels) {
          state.technologies = new Map(empire.techLevels);
        }
      }

      // Update building states
      const buildings = await Building.find({ empireId }).lean();
      state.buildings = buildings.map((b: any) => ({
        locationCoord: b.locationCoord,
        buildingKey: b.buildingKey,
        level: b.level,
        isActive: b.isActive,
        constructionCompleted: b.constructionCompleted
      }));

      // Update queue states
      const techQueue = await TechQueue.find({ empireId }).lean();
      state.queues.tech = techQueue.map((t: any) => ({
        techKey: t.techKey,
        level: t.level,
        locationCoord: t.locationCoord,
        status: t.status,
        completesAt: t.completesAt,
        charged: t.charged
      }));

      const unitQueue = await UnitQueue.find({ empireId }).lean();
      state.queues.units = unitQueue.map((u: any) => ({
        unitKey: u.unitKey,
        quantity: u.quantity,
        locationCoord: u.locationCoord,
        status: u.status,
        completesAt: u.completesAt
      }));
    }
  }

  /**
   * Update simulation metrics
   */
  private updateMetrics(): void {
    let totalCreditsGenerated = 0;
    let totalCreditsSpent = 0;
    let totalTechCompleted = 0;
    let totalBuildingsCompleted = 0;
    let totalUnitsProduced = 0;

    for (const state of this.empires.values()) {
      totalCreditsGenerated += state.resources.credits;
      totalTechCompleted += state.queues.tech.filter(t => t.status === 'completed').length;
      totalBuildingsCompleted += state.buildings.filter(b => b.isActive).length;
      totalUnitsProduced += state.units.reduce((sum, u) => sum + u.quantity, 0);
    }

    this.metrics.totalResourcesGenerated.credits = totalCreditsGenerated;
    this.metrics.totalTechnologiesCompleted = totalTechCompleted;
    this.metrics.totalBuildingsCompleted = totalBuildingsCompleted;
    this.metrics.totalUnitsProduced = totalUnitsProduced;

    const hoursElapsed = (Date.now() - this.startTime.getTime()) / (1000 * 60 * 60);
    this.metrics.averageResourceGenerationPerHour = totalCreditsGenerated / Math.max(hoursElapsed, 0.001);
    this.metrics.resourceEfficiencyRatio = totalCreditsSpent > 0 ? totalCreditsGenerated / totalCreditsSpent : 0;
  }

  /**
   * Run simulation for specified duration or until conditions are met
   */
  async runSimulation(
    durationMs: number,
    assertions: GameAssertion[] = []
  ): Promise<GameScenarioResult> {
    const startTime = Date.now();
    let iterations = 0;
    const errors: string[] = [];
    const warnings: string[] = [];

    this.isRunning = true;

    try {
      while (this.isRunning && (Date.now() - startTime) < durationMs) {
        await this.runGameTick();
        iterations++;

        // Check assertions
        for (const assertion of assertions) {
          try {
            if (assertion.empireId) {
              const state = this.empires.get(assertion.empireId);
              if (state && !assertion.condition(state)) {
                if (assertion.required) {
                  errors.push(`Required assertion failed: ${assertion.description}`);
                } else {
                  warnings.push(`Assertion warning: ${assertion.description}`);
                }
              }
            } else {
              // Check against all empires
              const allMatch = Array.from(this.empires.values()).every(assertion.condition);
              if (!allMatch) {
                if (assertion.required) {
                  errors.push(`Required assertion failed for all empires: ${assertion.description}`);
                } else {
                  warnings.push(`Assertion warning for some empires: ${assertion.description}`);
                }
              }
            }
          } catch (error) {
            errors.push(`Assertion evaluation error: ${assertion.description} - ${error}`);
          }
        }

        // Stop if required assertions fail
        if (errors.length > 0) {
          break;
        }

        // Throttle to prevent overwhelming the system
        if (iterations % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }
    } catch (error) {
      errors.push(`Simulation error: ${error}`);
    } finally {
      this.isRunning = false;
    }

    const finalState = Array.from(this.empires.values());
    
    return {
      success: errors.length === 0,
      duration: Date.now() - startTime,
      iterations,
      finalState,
      metrics: { ...this.metrics },
      errors,
      warnings
    };
  }

  /**
   * Fast-forward simulation by skipping time
   */
  async fastForward(hours: number): Promise<void> {
    const currentTime = new Date();
    const targetTime = new Date(currentTime.getTime() + (hours * 60 * 60 * 1000));

    // Update all time-dependent entities
    for (const empireId of this.empires.keys()) {
      // Update resource generation
      await ResourceService.updateEmpireCreditsAligned(empireId);
      
      // Complete any research that should be done
      const techQueue = await TechQueue.find({ 
        empireId, 
        status: 'active',
        completesAt: { $lte: targetTime }
      });

      for (const tech of techQueue) {
        tech.status = 'completed';
        await tech.save();
      }

      // Complete any buildings that should be done
      const buildings = await Building.find({
        empireId,
        isActive: false,
        constructionCompleted: { $lte: targetTime }
      });

      for (const building of buildings) {
        building.isActive = true;
        await building.save();
      }
    }

    await this.updateEmpireStates();

    if (this.config.debug) {
      console.log(`[GameSim] Fast-forwarded ${hours} hours`);
    }
  }

  /**
   * Get current state of an empire
   */
  getEmpireState(empireId: string): EmpireTestState | undefined {
    return this.empires.get(empireId);
  }

  /**
   * Get all empire states
   */
  getAllEmpireStates(): EmpireTestState[] {
    return Array.from(this.empires.values());
  }

  /**
   * Clean up simulation resources
   */
  async cleanup(): Promise<void> {
    this.isRunning = false;
    
    // Clean up database entities created during testing
    const empireIds = Array.from(this.empires.keys());
    
    await Promise.all([
      Empire.deleteMany({ _id: { $in: empireIds } }),
      Location.deleteMany({ owner: { $in: empireIds.map(id => this.empires.get(id)?.userId).filter(Boolean) } }),
      Building.deleteMany({ empireId: { $in: empireIds } }),
      TechQueue.deleteMany({ empireId: { $in: empireIds } }),
      UnitQueue.deleteMany({ empireId: { $in: empireIds } }),
      ResearchProject.deleteMany({ empireId: { $in: empireIds } })
    ]);

    this.empires.clear();

    if (this.config.debug) {
      console.log('[GameSim] Cleanup completed');
    }
  }
}

// ==================
// Test Helper Classes
// ==================

export class GameStateValidator {
  /**
   * Validate empire resource constraints
   */
  static validateResourceConstraints(state: EmpireTestState): string[] {
    const errors: string[] = [];

    if (state.resources.credits < 0) {
      errors.push(`Empire ${state.empireId} has negative credits: ${state.resources.credits}`);
    }

    if (state.resources.energy < 0) {
      errors.push(`Empire ${state.empireId} has negative energy: ${state.resources.energy}`);
    }

    return errors;
  }

  /**
   * Validate technology prerequisites
   */
  static validateTechnologyPrerequisites(state: EmpireTestState): string[] {
    const errors: string[] = [];

    for (const [techKey, level] of state.technologies) {
      const spec = getTechSpec(techKey);
      if (spec.prerequisites) {
        for (const [prereqTech, prereqLevel] of Object.entries(spec.prerequisites)) {
          const currentLevel = state.technologies.get(prereqTech as TechnologyKey) || 0;
          if (currentLevel < prereqLevel) {
            errors.push(
              `Empire ${state.empireId} has ${techKey} level ${level} but prerequisite ${prereqTech} is only level ${currentLevel} (requires ${prereqLevel})`
            );
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate building requirements
   */
  static validateBuildingRequirements(state: EmpireTestState): string[] {
    const errors: string[] = [];

    for (const building of state.buildings) {
      const spec = getBuildingSpec(building.buildingKey);
      if (spec.techRequirements) {
        for (const [techKey, requiredLevel] of Object.entries(spec.techRequirements)) {
          const currentLevel = state.technologies.get(techKey as TechnologyKey) || 0;
          if (currentLevel < requiredLevel) {
            errors.push(
              `Empire ${state.empireId} has building ${building.buildingKey} level ${building.level} at ${building.locationCoord} but lacks technology ${techKey} level ${requiredLevel} (has ${currentLevel})`
            );
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate all game state constraints
   */
  static validateGameState(state: EmpireTestState): string[] {
    return [
      ...this.validateResourceConstraints(state),
      ...this.validateTechnologyPrerequisites(state),
      ...this.validateBuildingRequirements(state)
    ];
  }
}

export class GameScenarioBuilder {
  private engine: GameSimulationEngine;
  private assertions: GameAssertion[];

  constructor(config?: Partial<GameSimulationConfig>) {
    this.engine = new GameSimulationEngine(config);
    this.assertions = [];
  }

  /**
   * Add empire to scenario
   */
  async addEmpire(userId: string, territories?: string[]): Promise<EmpireTestState> {
    return await this.engine.createTestEmpire(userId, territories);
  }

  /**
   * Add building to empire
   */
  async addBuilding(empireId: string, locationCoord: string, buildingKey: BuildingKey, level: number = 1): Promise<void> {
    await this.engine.addTestBuilding(empireId, locationCoord, buildingKey, level);
  }

  /**
   * Start technology research
   */
  async startTech(empireId: string, locationCoord: string, techKey: TechnologyKey): Promise<any> {
    return await this.engine.startTechnology(empireId, locationCoord, techKey);
  }

  /**
   * Add assertion to scenario
   */
  addAssertion(assertion: GameAssertion): GameScenarioBuilder {
    this.assertions.push(assertion);
    return this;
  }

  /**
   * Add resource assertion
   */
  assertResourceMinimum(empireId: string, resourceType: keyof ResourceCost, minimum: number): GameScenarioBuilder {
    return this.addAssertion({
      type: 'resource',
      empireId,
      condition: (state) => (state.resources as any)[resourceType] >= minimum,
      description: `Empire ${empireId} should have at least ${minimum} ${resourceType}`,
      required: true
    });
  }

  /**
   * Add technology assertion
   */
  assertTechnologyLevel(empireId: string, techKey: TechnologyKey, minimumLevel: number): GameScenarioBuilder {
    return this.addAssertion({
      type: 'technology',
      empireId,
      condition: (state) => (state.technologies.get(techKey) || 0) >= minimumLevel,
      description: `Empire ${empireId} should have ${techKey} at level ${minimumLevel} or higher`,
      required: true
    });
  }

  /**
   * Add building assertion
   */
  assertBuildingCount(empireId: string, buildingKey: BuildingKey, minimumCount: number): GameScenarioBuilder {
    return this.addAssertion({
      type: 'building',
      empireId,
      condition: (state) => state.buildings.filter(b => b.buildingKey === buildingKey && b.isActive).length >= minimumCount,
      description: `Empire ${empireId} should have at least ${minimumCount} active ${buildingKey} buildings`,
      required: true
    });
  }

  /**
   * Run the scenario
   */
  async run(durationMs: number = 30000): Promise<GameScenarioResult> {
    try {
      return await this.engine.runSimulation(durationMs, this.assertions);
    } finally {
      await this.engine.cleanup();
    }
  }

  /**
   * Fast-forward simulation
   */
  async fastForward(hours: number): Promise<void> {
    await this.engine.fastForward(hours);
  }

  /**
   * Get engine for advanced operations
   */
  getEngine(): GameSimulationEngine {
    return this.engine;
  }
}

// =================
// Utility Functions
// =================

/**
 * Create a standard test empire with basic infrastructure
 */
export async function createStandardTestEmpire(
  simulation: GameSimulationEngine,
  userId: string,
  options: {
    territories?: string[];
    startingBuildings?: { locationCoord: string; buildingKey: BuildingKey; level: number }[];
    startingTech?: { techKey: TechnologyKey; level: number }[];
  } = {}
): Promise<EmpireTestState> {
  const territories = options.territories || ['A00:00:00:00'];
  const empire = await simulation.createTestEmpire(userId, territories);

  // Add starting buildings
  if (options.startingBuildings) {
    for (const building of options.startingBuildings) {
      await simulation.addTestBuilding(empire.empireId, building.locationCoord, building.buildingKey, building.level);
    }
  }

  // Add starting technologies (would need to implement direct tech setting)
  if (options.startingTech) {
    const empireDoc = await Empire.findById(empire.empireId);
    if (empireDoc) {
      for (const tech of options.startingTech) {
        empireDoc.techLevels?.set(tech.techKey, tech.level);
      }
      await empireDoc.save();
    }
  }

  return empire;
}

/**
 * Validate resource production calculations
 */
export function validateResourceProduction(
  initialResources: ResourceCost,
  finalResources: ResourceCost,
  productionRate: number,
  timeHours: number,
  tolerance: number = 0.01
): { valid: boolean; expected: number; actual: number; difference: number } {
  const expected = initialResources.credits + (productionRate * timeHours);
  const actual = finalResources.credits;
  const difference = Math.abs(expected - actual);
  const valid = difference <= tolerance * expected;

  return { valid, expected, actual, difference };
}

/**
 * Create common game assertions
 */
export const GameAssertions = {
  empireHasCredits: (empireId: string, minimum: number): GameAssertion => ({
    type: 'resource',
    empireId,
    condition: (state) => state.resources.credits >= minimum,
    description: `Empire ${empireId} should have at least ${minimum} credits`,
    required: true
  }),

  empireHasTechnology: (empireId: string, techKey: TechnologyKey, level: number = 1): GameAssertion => ({
    type: 'technology',
    empireId,
    condition: (state) => (state.technologies.get(techKey) || 0) >= level,
    description: `Empire ${empireId} should have ${techKey} at level ${level}`,
    required: true
  }),

  empireHasBuilding: (empireId: string, buildingKey: BuildingKey, count: number = 1): GameAssertion => ({
    type: 'building',
    empireId,
    condition: (state) => state.buildings.filter(b => b.buildingKey === buildingKey && b.isActive).length >= count,
    description: `Empire ${empireId} should have ${count} ${buildingKey} buildings`,
    required: true
  }),

  noNegativeResources: (empireId: string): GameAssertion => ({
    type: 'resource',
    empireId,
    condition: (state) => state.resources.credits >= 0 && state.resources.energy >= 0,
    description: `Empire ${empireId} should not have negative resources`,
    required: true
  }),

  resourceProductionPositive: (empireId: string): GameAssertion => ({
    type: 'custom',
    empireId,
    condition: (state) => {
      // This would need to track resource changes over time
      return true; // Placeholder - would need actual production tracking
    },
    description: `Empire ${empireId} should have positive resource production`,
    required: false
  })
};
