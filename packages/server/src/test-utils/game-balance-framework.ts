/**
 * Game Balance Testing Framework
 * 
 * This framework provides comprehensive testing tools for validating game balance
 * mechanics in the Attrition MMO, including resource calculations, technology
 * progression curves, unit effectiveness, and economic equilibrium.
 */

import { 
  TechnologyKey,
  BuildingKey,
  UnitKey,
  ResourceCost,
  getTechSpec,
  getBuildingSpec,
  getUnitSpec,
  computeAllCapacities,
  getTechCreditCostForLevel
} from '@game/shared';
import { CapacityService } from '../services/capacityService';
import { ResourceService } from '../services/resourceService';
import { EconomyService } from '../services/economyService';
import { Empire } from '../models/Empire';
import { Building } from '../models/Building';
import { Location } from '../models/Location';
import { TechQueue } from '../models/TechQueue';
import { UnitQueue } from '../models/UnitQueue';
import mongoose from 'mongoose';

// ========================
// Balance Testing Types
// ========================

export interface BalanceTestScenario {
  name: string;
  description: string;
  initialState: {
    resources: ResourceCost;
    technologies: Map<TechnologyKey, number>;
    buildings: Array<{ key: BuildingKey; level: number; quantity: number }>;
    empireAge: number; // hours since creation
  };
  expectations: BalanceExpectation[];
  constraints: BalanceConstraint[];
}

export interface BalanceExpectation {
  type: 'resource_generation' | 'capacity_calculation' | 'tech_progression' | 
        'economic_equilibrium' | 'unit_effectiveness' | 'progression_time';
  metric: string;
  operator: '>' | '<' | '==' | '>=' | '<=' | 'between' | 'ratio';
  target: number | [number, number];
  tolerance?: number; // percentage tolerance for approximate matches
  description: string;
}

export interface BalanceConstraint {
  type: 'min_viability' | 'max_dominance' | 'progression_gate' | 'resource_sink';
  condition: string;
  threshold: number;
  critical: boolean; // if true, scenario fails if constraint violated
}

export interface BalanceTestResult {
  scenarioName: string;
  success: boolean;
  duration: number;
  metrics: BalanceMetrics;
  expectations: Array<{
    expectation: BalanceExpectation;
    actualValue: number | [number, number];
    passed: boolean;
    deviation?: number;
  }>;
  constraints: Array<{
    constraint: BalanceConstraint;
    satisfied: boolean;
    actualValue: number;
  }>;
  recommendations: string[];
  warnings: string[];
}

export interface BalanceMetrics {
  economicMetrics: {
    creditsPerHour: number;
    constructionCapacity: number;
    productionCapacity: number;
    researchCapacity: number;
    economicEfficiency: number; // credits per hour per building credit invested
    resourceUtilization: number; // percentage of capacity being used
  };
  progressionMetrics: {
    techProgressionRate: number; // average tech levels per hour
    buildingDiversityIndex: number; // measure of building type variety
    strategicOptions: number; // number of viable strategies available
    progressionBottlenecks: string[]; // identified bottlenecks
  };
  balanceMetrics: {
    unitCostEfficiency: Map<UnitKey, number>; // damage per credit
    techReturnOnInvestment: Map<TechnologyKey, number>; // benefit per credit
    buildingEffectiveness: Map<BuildingKey, number>; // contribution per credit
    equilibriumScore: number; // how balanced different strategies are (0-1)
  };
}

// ========================
// Game Balance Engine
// ========================

export class GameBalanceEngine {
  private testEmpires: Map<string, string> = new Map(); // test name -> empire ID
  private baseMetrics: BalanceMetrics | null = null;

  /**
   * Create a test empire with specific initial conditions
   */
  async createBalanceTestEmpire(
    testName: string,
    initialState: BalanceTestScenario['initialState']
  ): Promise<string> {
    const empireId = new mongoose.Types.ObjectId().toString();
    const baseCoord = `TEST:${testName}:${Date.now()}`;

    // Create test empire
    const empire = new Empire({
      _id: empireId,
      userId: `balance-test-${testName}`,
      name: `Balance Test ${testName}`,
      territories: [baseCoord],
      baseCount: 1,
      hasDeletedBase: false,
      resources: {
        credits: initialState.resources.credits || 10000,
        energy: initialState.resources.energy || 5000
      },
      techLevels: initialState.technologies,
      createdAt: new Date(Date.now() - (initialState.empireAge * 60 * 60 * 1000)),
      updatedAt: new Date()
    });
    
    await empire.save();

    // Create test location
    const location = new Location({
      coord: baseCoord,
      owner: empire.userId,
      name: `Test Location ${testName}`,
      createdAt: new Date(),
      // Standard test environment values
      result: {
        yields: { metal: 3 },
        fertility: 2
      },
      positionBase: {
        solarEnergy: 4
      }
    });
    
    await location.save();

    // Create initial buildings
    for (const buildingConfig of initialState.buildings) {
      for (let i = 0; i < buildingConfig.quantity; i++) {
        const building = new Building({
          empireId: new mongoose.Types.ObjectId(empireId),
          locationCoord: baseCoord,
          catalogKey: buildingConfig.key,
          buildingKey: buildingConfig.key,
          level: buildingConfig.level,
          isActive: true,
          identityKey: `${empireId}:${baseCoord}:${buildingConfig.key}:L${buildingConfig.level}:Q${i + 1}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        await building.save();
      }
    }

    this.testEmpires.set(testName, empireId);
    return empireId;
  }

  /**
   * Run a comprehensive balance test scenario
   */
  async runBalanceScenario(scenario: BalanceTestScenario): Promise<BalanceTestResult> {
    const startTime = Date.now();
    console.log(`[BalanceTest] Running scenario: ${scenario.name}`);

    try {
      // Create test empire
      const empireId = await this.createBalanceTestEmpire(scenario.name, scenario.initialState);
      const baseCoord = `TEST:${scenario.name}:${startTime}`;

      // Collect balance metrics
      const metrics = await this.collectBalanceMetrics(empireId, baseCoord);

      // Evaluate expectations
      const expectationResults = await this.evaluateExpectations(
        scenario.expectations,
        metrics,
        empireId,
        baseCoord
      );

      // Evaluate constraints
      const constraintResults = await this.evaluateConstraints(
        scenario.constraints,
        metrics,
        empireId,
        baseCoord
      );

      // Generate recommendations
      const recommendations = this.generateBalanceRecommendations(
        metrics,
        expectationResults,
        constraintResults
      );

      // Check for warnings
      const warnings = this.generateBalanceWarnings(metrics, scenario);

      // Determine overall success
      const success = expectationResults.every(r => r.passed) &&
                     constraintResults.filter(c => c.constraint.critical).every(c => c.satisfied);

      return {
        scenarioName: scenario.name,
        success,
        duration: Date.now() - startTime,
        metrics,
        expectations: expectationResults,
        constraints: constraintResults,
        recommendations,
        warnings
      };

    } catch (error) {
      console.error(`[BalanceTest] Error in scenario ${scenario.name}:`, error);
      return {
        scenarioName: scenario.name,
        success: false,
        duration: Date.now() - startTime,
        metrics: this.getEmptyMetrics(),
        expectations: [],
        constraints: [],
        recommendations: [`Failed to execute scenario: ${error}`],
        warnings: []
      };
    }
  }

  /**
   * Collect comprehensive balance metrics for an empire
   */
  private async collectBalanceMetrics(empireId: string, baseCoord: string): Promise<BalanceMetrics> {
    // Economic metrics
    const economicBreakdown = await EconomyService.computeEmpireEconomy(empireId);
    const researchBonuses = await EconomyService.getResearchCreditBonuses(empireId);
    const capacities = await CapacityService.getBaseCapacities(empireId, baseCoord);

    // Building analysis
    const buildings = await Building.find({
      empireId: new mongoose.Types.ObjectId(empireId),
      locationCoord: baseCoord,
      isActive: true
    }).lean();

    const totalBuildingCost = buildings.reduce((sum, building) => {
      const spec = getBuildingSpec(building.buildingKey as BuildingKey);
      return sum + (spec?.creditsCost || 0) * (building.level || 1);
    }, 0);

    // Technology analysis
    const empire = await Empire.findById(empireId);
    const techLevels = empire?.techLevels || new Map<string, number>();

    const economicMetrics = {
      creditsPerHour: economicBreakdown.totalCreditsPerHour + researchBonuses,
      constructionCapacity: capacities.construction.value,
      productionCapacity: capacities.production.value,
      researchCapacity: capacities.research.value,
      economicEfficiency: totalBuildingCost > 0 ? 
        (economicBreakdown.totalCreditsPerHour + researchBonuses) / totalBuildingCost : 0,
      resourceUtilization: this.calculateResourceUtilization(capacities)
    };

    const progressionMetrics = {
      techProgressionRate: this.calculateTechProgressionRate(techLevels, empire?.createdAt || new Date()),
      buildingDiversityIndex: this.calculateBuildingDiversity(buildings),
      strategicOptions: this.calculateStrategicOptions(techLevels, buildings),
      progressionBottlenecks: this.identifyProgressionBottlenecks(capacities, economicMetrics)
    };

    const balanceMetrics = {
      unitCostEfficiency: this.calculateUnitCostEfficiency(techLevels),
      techReturnOnInvestment: this.calculateTechROI(techLevels),
      buildingEffectiveness: this.calculateBuildingEffectiveness(buildings),
      equilibriumScore: this.calculateEquilibriumScore(economicMetrics, progressionMetrics)
    };

    return {
      economicMetrics,
      progressionMetrics,
      balanceMetrics
    };
  }

  /**
   * Evaluate balance expectations against actual metrics
   */
  private async evaluateExpectations(
    expectations: BalanceExpectation[],
    metrics: BalanceMetrics,
    empireId: string,
    baseCoord: string
  ): Promise<Array<{
    expectation: BalanceExpectation;
    actualValue: number | [number, number];
    passed: boolean;
    deviation?: number;
  }>> {
    const results = [];

    for (const expectation of expectations) {
      let actualValue: number | [number, number];
      let passed = false;
      let deviation: number | undefined;

      // Extract actual value based on expectation type
      switch (expectation.type) {
        case 'resource_generation':
          actualValue = this.getResourceGenerationMetric(expectation.metric, metrics);
          break;
        case 'capacity_calculation':
          actualValue = this.getCapacityMetric(expectation.metric, metrics);
          break;
        case 'tech_progression':
          actualValue = this.getTechProgressionMetric(expectation.metric, metrics);
          break;
        case 'economic_equilibrium':
          actualValue = this.getEconomicMetric(expectation.metric, metrics);
          break;
        case 'unit_effectiveness':
          actualValue = this.getUnitEffectivenessMetric(expectation.metric, metrics);
          break;
        case 'progression_time':
          actualValue = await this.getProgressionTimeMetric(expectation.metric, empireId, baseCoord);
          break;
        default:
          actualValue = 0;
      }

      // Evaluate expectation
      if (typeof actualValue === 'number') {
        passed = this.evaluateNumericExpectation(expectation, actualValue);
        if (expectation.tolerance) {
          const target = Array.isArray(expectation.target) ? expectation.target[0] : expectation.target;
          deviation = Math.abs((actualValue - target) / target) * 100;
        }
      } else {
        // Handle range values
        passed = this.evaluateRangeExpectation(expectation, actualValue);
      }

      results.push({
        expectation,
        actualValue,
        passed,
        deviation
      });
    }

    return results;
  }

  /**
   * Evaluate balance constraints
   */
  private async evaluateConstraints(
    constraints: BalanceConstraint[],
    metrics: BalanceMetrics,
    empireId: string,
    baseCoord: string
  ): Promise<Array<{
    constraint: BalanceConstraint;
    satisfied: boolean;
    actualValue: number;
  }>> {
    const results = [];

    for (const constraint of constraints) {
      let actualValue: number;
      let satisfied: boolean;

      switch (constraint.type) {
        case 'min_viability':
          actualValue = this.getViabilityScore(constraint.condition, metrics);
          satisfied = actualValue >= constraint.threshold;
          break;
        case 'max_dominance':
          actualValue = this.getDominanceScore(constraint.condition, metrics);
          satisfied = actualValue <= constraint.threshold;
          break;
        case 'progression_gate':
          actualValue = this.getProgressionGateScore(constraint.condition, metrics);
          satisfied = actualValue >= constraint.threshold;
          break;
        case 'resource_sink':
          actualValue = this.getResourceSinkScore(constraint.condition, metrics);
          satisfied = actualValue >= constraint.threshold;
          break;
        default:
          actualValue = 0;
          satisfied = false;
      }

      results.push({
        constraint,
        satisfied,
        actualValue
      });
    }

    return results;
  }

  /**
   * Calculate resource utilization percentage
   */
  private calculateResourceUtilization(capacities: any): number {
    // This is a simplified calculation - in reality, you'd check actual queue usage
    const totalCapacity = capacities.construction.value + capacities.production.value + capacities.research.value;
    if (totalCapacity === 0) return 0;
    
    // Assume 60% utilization as baseline for test scenarios
    return 0.6;
  }

  /**
   * Calculate technology progression rate (average tech levels per hour)
   */
  private calculateTechProgressionRate(techLevels: Map<string, number>, createdAt: Date): number {
    const totalLevels = Array.from(techLevels.values()).reduce((sum, level) => sum + level, 0);
    const hoursElapsed = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60);
    return hoursElapsed > 0 ? totalLevels / hoursElapsed : 0;
  }

  /**
   * Calculate building diversity index (Shannon diversity)
   */
  private calculateBuildingDiversity(buildings: any[]): number {
    const buildingCounts = new Map<string, number>();
    
    buildings.forEach(building => {
      const key = building.buildingKey || building.catalogKey;
      buildingCounts.set(key, (buildingCounts.get(key) || 0) + 1);
    });

    const total = buildings.length;
    if (total === 0) return 0;

    let diversity = 0;
    for (const count of buildingCounts.values()) {
      const proportion = count / total;
      if (proportion > 0) {
        diversity -= proportion * Math.log2(proportion);
      }
    }

    return diversity;
  }

  /**
   * Calculate number of strategic options available
   */
  private calculateStrategicOptions(techLevels: Map<string, number>, buildings: any[]): number {
    let options = 0;
    
    // Economic strategies
    if (this.hasEconomicFocus(buildings)) options++;
    if (this.hasMilitaryFocus(buildings)) options++;
    if (this.hasResearchFocus(buildings)) options++;
    if (this.hasExpansionFocus(buildings)) options++;
    
    // Technology-enabled strategies
    const totalTechLevels = Array.from(techLevels.values()).reduce((sum, level) => sum + level, 0);
    options += Math.floor(totalTechLevels / 10); // Each 10 tech levels enables new strategies

    return Math.min(options, 10); // Cap at 10 for scoring purposes
  }

  /**
   * Identify progression bottlenecks
   */
  private identifyProgressionBottlenecks(capacities: any, economicMetrics: any): string[] {
    const bottlenecks: string[] = [];

    if (capacities.construction.value < 100) {
      bottlenecks.push('Low construction capacity limiting building expansion');
    }
    
    if (capacities.research.value < 50) {
      bottlenecks.push('Limited research capacity slowing technology progress');
    }
    
    if (economicMetrics.creditsPerHour < 1000) {
      bottlenecks.push('Insufficient credit generation for rapid development');
    }
    
    if (economicMetrics.resourceUtilization < 0.3) {
      bottlenecks.push('Underutilized production capacity');
    }

    return bottlenecks;
  }

  /**
   * Calculate unit cost efficiency (damage per credit)
   */
  private calculateUnitCostEfficiency(techLevels: Map<string, number>): Map<UnitKey, number> {
    const efficiencyMap = new Map<UnitKey, number>();
    
    // Sample unit efficiency calculations
    const sampleUnits: UnitKey[] = ['fighter', 'bomber', 'corvette', 'destroyer', 'cruiser'];
    
    sampleUnits.forEach(unitKey => {
      const spec = getUnitSpec(unitKey);
      if (spec) {
        // Base efficiency: attack / credits
        let efficiency = spec.attack / spec.creditsCost;
        
        // Apply technology bonuses
        const weaponTech = this.getWeaponTechForUnit(unitKey);
        if (weaponTech && techLevels.has(weaponTech)) {
          const techLevel = techLevels.get(weaponTech) || 0;
          efficiency *= (1 + techLevel * 0.05); // 5% per level
        }
        
        efficiencyMap.set(unitKey, efficiency);
      }
    });

    return efficiencyMap;
  }

  /**
   * Calculate technology return on investment
   */
  private calculateTechROI(techLevels: Map<string, number>): Map<TechnologyKey, number> {
    const roiMap = new Map<TechnologyKey, number>();
    
    techLevels.forEach((level, techKey) => {
      const spec = getTechSpec(techKey as TechnologyKey);
      if (spec) {
        const totalCost = this.getTotalTechCost(techKey as TechnologyKey, level);
        const benefit = this.estimateTechBenefit(techKey as TechnologyKey, level);
        const roi = totalCost > 0 ? benefit / totalCost : 0;
        roiMap.set(techKey as TechnologyKey, roi);
      }
    });

    return roiMap;
  }

  /**
   * Calculate building effectiveness
   */
  private calculateBuildingEffectiveness(buildings: any[]): Map<BuildingKey, number> {
    const effectivenessMap = new Map<BuildingKey, number>();
    
    buildings.forEach(building => {
      const key = (building.buildingKey || building.catalogKey) as BuildingKey;
      const spec = getBuildingSpec(key);
      if (spec) {
        // Simplified effectiveness: benefit per credit cost
        const effectiveness = this.estimateBuildingBenefit(key, building.level || 1) / spec.creditsCost;
        effectivenessMap.set(key, effectiveness);
      }
    });

    return effectivenessMap;
  }

  /**
   * Calculate equilibrium score (how balanced different strategies are)
   */
  private calculateEquilibriumScore(economicMetrics: any, progressionMetrics: any): number {
    // Score based on how well-balanced different aspects are
    const factors = [
      economicMetrics.economicEfficiency,
      economicMetrics.resourceUtilization,
      progressionMetrics.buildingDiversityIndex / 3, // Normalize to 0-1 range
      progressionMetrics.strategicOptions / 10,
      Math.min(progressionMetrics.progressionBottlenecks.length === 0 ? 1 : 0.5, 1)
    ];

    // Calculate coefficient of variation (lower = more balanced)
    const mean = factors.reduce((sum, f) => sum + f, 0) / factors.length;
    const variance = factors.reduce((sum, f) => sum + Math.pow(f - mean, 2), 0) / factors.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    
    // Convert to 0-1 score (lower CV = higher score)
    return Math.max(0, 1 - cv);
  }

  // Helper methods for metric extraction and evaluation

  private getResourceGenerationMetric(metric: string, metrics: BalanceMetrics): number {
    switch (metric) {
      case 'credits_per_hour': return metrics.economicMetrics.creditsPerHour;
      case 'economic_efficiency': return metrics.economicMetrics.economicEfficiency;
      default: return 0;
    }
  }

  private getCapacityMetric(metric: string, metrics: BalanceMetrics): number {
    switch (metric) {
      case 'construction_capacity': return metrics.economicMetrics.constructionCapacity;
      case 'production_capacity': return metrics.economicMetrics.productionCapacity;
      case 'research_capacity': return metrics.economicMetrics.researchCapacity;
      case 'resource_utilization': return metrics.economicMetrics.resourceUtilization;
      default: return 0;
    }
  }

  private getTechProgressionMetric(metric: string, metrics: BalanceMetrics): number {
    switch (metric) {
      case 'tech_progression_rate': return metrics.progressionMetrics.techProgressionRate;
      case 'strategic_options': return metrics.progressionMetrics.strategicOptions;
      case 'diversity_index': return metrics.progressionMetrics.buildingDiversityIndex;
      default: return 0;
    }
  }

  private getEconomicMetric(metric: string, metrics: BalanceMetrics): number {
    switch (metric) {
      case 'equilibrium_score': return metrics.balanceMetrics.equilibriumScore;
      case 'economic_efficiency': return metrics.economicMetrics.economicEfficiency;
      default: return 0;
    }
  }

  private getUnitEffectivenessMetric(metric: string, metrics: BalanceMetrics): number {
    // Extract specific unit efficiency or average
    if (metric.startsWith('unit_efficiency_')) {
      const unitKey = metric.replace('unit_efficiency_', '') as UnitKey;
      return metrics.balanceMetrics.unitCostEfficiency.get(unitKey) || 0;
    }
    
    // Average unit efficiency
    const efficiencies = Array.from(metrics.balanceMetrics.unitCostEfficiency.values());
    return efficiencies.length > 0 ? efficiencies.reduce((sum, eff) => sum + eff, 0) / efficiencies.length : 0;
  }

  private async getProgressionTimeMetric(metric: string, empireId: string, baseCoord: string): Promise<number> {
    // Calculate time to achieve specific progression goals
    switch (metric) {
      case 'time_to_next_tech':
        return this.calculateTimeToNextTech(empireId, baseCoord);
      case 'time_to_expansion':
        return this.calculateTimeToExpansion(empireId, baseCoord);
      default:
        return 0;
    }
  }

  private evaluateNumericExpectation(expectation: BalanceExpectation, actualValue: number): boolean {
    const target = Array.isArray(expectation.target) ? expectation.target[0] : expectation.target;
    const tolerance = expectation.tolerance || 0;
    
    switch (expectation.operator) {
      case '>':
        return actualValue > target;
      case '<':
        return actualValue < target;
      case '==':
        const diff = Math.abs(actualValue - target);
        return tolerance > 0 ? diff / target <= tolerance / 100 : diff < 0.01;
      case '>=':
        return actualValue >= target;
      case '<=':
        return actualValue <= target;
      case 'between':
        if (!Array.isArray(expectation.target)) return false;
        return actualValue >= expectation.target[0] && actualValue <= expectation.target[1];
      case 'ratio':
        // Special handling for ratio comparisons
        return Math.abs(actualValue - target) / target <= (tolerance || 10) / 100;
      default:
        return false;
    }
  }

  private evaluateRangeExpectation(expectation: BalanceExpectation, actualValue: [number, number]): boolean {
    // For range values, evaluate based on the expectation type
    const [min, max] = actualValue;
    const target = Array.isArray(expectation.target) ? expectation.target : [expectation.target, expectation.target];
    
    return min >= target[0] && max <= target[1];
  }

  // Additional helper methods...

  private hasEconomicFocus(buildings: any[]): boolean {
    const economicBuildings = buildings.filter(b => 
      ['urban_structures', 'economic_centers', 'metal_refineries'].includes(b.buildingKey || b.catalogKey)
    );
    return economicBuildings.length >= 3;
  }

  private hasMilitaryFocus(buildings: any[]): boolean {
    const militaryBuildings = buildings.filter(b =>
      ['shipyards', 'orbital_shipyards', 'barracks'].includes(b.buildingKey || b.catalogKey)
    );
    return militaryBuildings.length >= 2;
  }

  private hasResearchFocus(buildings: any[]): boolean {
    const researchBuildings = buildings.filter(b =>
      ['research_labs'].includes(b.buildingKey || b.catalogKey)
    );
    return researchBuildings.length >= 1;
  }

  private hasExpansionFocus(buildings: any[]): boolean {
    const expansionBuildings = buildings.filter(b =>
      ['outpost_ships', 'terraform', 'multi_level_platforms'].includes(b.buildingKey || b.catalogKey)
    );
    return expansionBuildings.length >= 1;
  }

  private getWeaponTechForUnit(unitKey: UnitKey): string | undefined {
    const weaponMap: Record<string, string> = {
      fighter: 'laser',
      bomber: 'missiles',
      heavy_bomber: 'plasma',
      ion_bomber: 'ion',
      corvette: 'laser',
      destroyer: 'plasma',
      cruiser: 'plasma',
      battleship: 'ion'
    };
    return weaponMap[unitKey];
  }

  private getTotalTechCost(techKey: TechnologyKey, level: number): number {
    let totalCost = 0;
    for (let i = 1; i <= level; i++) {
      const spec = getTechSpec(techKey);
      if (spec) {
        totalCost += getTechCreditCostForLevel(spec, i);
      }
    }
    return totalCost;
  }

  private estimateTechBenefit(techKey: TechnologyKey, level: number): number {
    // Simplified benefit estimation - would be more complex in reality
    const baseBenefits: Record<string, number> = {
      energy: 100 * level, // Energy efficiency improvements
      computer: 50 * level, // Fleet capacity
      laser: 75 * level, // Weapon effectiveness
      cybernetics: 200 * level, // Construction/production bonus
      artificial_intelligence: 150 * level // Research bonus
    };
    return baseBenefits[techKey] || 50 * level;
  }

  private estimateBuildingBenefit(buildingKey: BuildingKey, level: number): number {
    // Simplified building benefit estimation
    const baseBenefits: Record<string, number> = {
      urban_structures: 20 * level,
      research_labs: 40 * level,
      metal_refineries: 30 * level,
      robotic_factories: 25 * level,
      shipyards: 15 * level
    };
    return baseBenefits[buildingKey] || 10 * level;
  }

  private async calculateTimeToNextTech(empireId: string, baseCoord: string): Promise<number> {
    // Calculate time to complete next available technology
    const capacities = await CapacityService.getBaseCapacities(empireId, baseCoord);
    const researchCapacity = capacities.research.value;
    
    if (researchCapacity <= 0) return Infinity;
    
    // Simplified: assume next tech costs 100 credits
    const nextTechCost = 100;
    return nextTechCost / researchCapacity;
  }

  private async calculateTimeToExpansion(empireId: string, baseCoord: string): Promise<number> {
    // Calculate time to build expansion capability (outpost ship)
    const capacities = await CapacityService.getBaseCapacities(empireId, baseCoord);
    const productionCapacity = capacities.production.value;
    
    if (productionCapacity <= 0) return Infinity;
    
    const outpostShipCost = 100; // Simplified cost
    return outpostShipCost / productionCapacity;
  }

  private getViabilityScore(condition: string, metrics: BalanceMetrics): number {
    // Evaluate minimum viability conditions
    switch (condition) {
      case 'economic_growth':
        return metrics.economicMetrics.creditsPerHour;
      case 'tech_progression':
        return metrics.progressionMetrics.techProgressionRate;
      case 'strategic_flexibility':
        return metrics.progressionMetrics.strategicOptions;
      default:
        return 0;
    }
  }

  private getDominanceScore(condition: string, metrics: BalanceMetrics): number {
    // Evaluate dominance/overpowered conditions
    const efficiencies = Array.from(metrics.balanceMetrics.unitCostEfficiency.values());
    return efficiencies.length > 0 ? Math.max(...efficiencies) : 0;
  }

  private getProgressionGateScore(condition: string, metrics: BalanceMetrics): number {
    // Evaluate progression gate accessibility
    return metrics.progressionMetrics.progressionBottlenecks.length === 0 ? 1 : 0;
  }

  private getResourceSinkScore(condition: string, metrics: BalanceMetrics): number {
    // Evaluate resource sink effectiveness
    return metrics.economicMetrics.resourceUtilization;
  }

  private generateBalanceRecommendations(
    metrics: BalanceMetrics,
    expectationResults: any[],
    constraintResults: any[]
  ): string[] {
    const recommendations: string[] = [];

    // Economic recommendations
    if (metrics.economicMetrics.economicEfficiency < 0.5) {
      recommendations.push('Consider improving economic efficiency through better building placement and technology research');
    }

    // Progression recommendations
    if (metrics.progressionMetrics.strategicOptions < 3) {
      recommendations.push('Expand strategic options by researching diverse technologies and building varied structures');
    }

    // Balance recommendations
    if (metrics.balanceMetrics.equilibriumScore < 0.6) {
      recommendations.push('Work on balancing different aspects of empire development for better overall performance');
    }

    // Failed expectation recommendations
    const failedExpectations = expectationResults.filter(r => !r.passed);
    failedExpectations.forEach(result => {
      recommendations.push(`Address failed expectation: ${result.expectation.description}`);
    });

    return recommendations;
  }

  private generateBalanceWarnings(metrics: BalanceMetrics, scenario: BalanceTestScenario): string[] {
    const warnings: string[] = [];

    // Bottleneck warnings
    if (metrics.progressionMetrics.progressionBottlenecks.length > 0) {
      warnings.push(`Identified bottlenecks: ${metrics.progressionMetrics.progressionBottlenecks.join(', ')}`);
    }

    // Efficiency warnings
    if (metrics.economicMetrics.resourceUtilization < 0.3) {
      warnings.push('Low resource utilization detected - capacity may be underused');
    }

    // Balance warnings
    if (metrics.balanceMetrics.equilibriumScore < 0.4) {
      warnings.push('Poor strategic balance detected - empire may be too specialized');
    }

    return warnings;
  }

  private getEmptyMetrics(): BalanceMetrics {
    return {
      economicMetrics: {
        creditsPerHour: 0,
        constructionCapacity: 0,
        productionCapacity: 0,
        researchCapacity: 0,
        economicEfficiency: 0,
        resourceUtilization: 0
      },
      progressionMetrics: {
        techProgressionRate: 0,
        buildingDiversityIndex: 0,
        strategicOptions: 0,
        progressionBottlenecks: []
      },
      balanceMetrics: {
        unitCostEfficiency: new Map(),
        techReturnOnInvestment: new Map(),
        buildingEffectiveness: new Map(),
        equilibriumScore: 0
      }
    };
  }

  /**
   * Clean up test resources
   */
  async cleanup(): Promise<void> {
    console.log('[BalanceTest] Cleaning up test resources...');

    const empireIds = Array.from(this.testEmpires.values());
    
    if (empireIds.length > 0) {
      await Promise.all([
        Empire.deleteMany({ _id: { $in: empireIds.map(id => new mongoose.Types.ObjectId(id)) } }),
        Building.deleteMany({ empireId: { $in: empireIds.map(id => new mongoose.Types.ObjectId(id)) } }),
        Location.deleteMany({ coord: { $regex: /^TEST:/ } }),
        TechQueue.deleteMany({ empireId: { $in: empireIds.map(id => new mongoose.Types.ObjectId(id)) } }),
        UnitQueue.deleteMany({ empireId: { $in: empireIds.map(id => new mongoose.Types.ObjectId(id)) } })
      ]);
    }

    this.testEmpires.clear();
    console.log('[BalanceTest] Cleanup completed');
  }
}

// ================
// Helper Functions
// ================

/**
 * Create standard balance test scenarios
 */
export function createStandardBalanceScenarios(): BalanceTestScenario[] {
  return [
    // Early game balance
    {
      name: 'Early Game Economic Focus',
      description: 'Test early game economic development balance',
      initialState: {
        resources: { credits: 10000 },
        technologies: new Map([['energy', 1]]),
        buildings: [
          { key: 'urban_structures' as BuildingKey, level: 2, quantity: 3 },
          { key: 'metal_refineries' as BuildingKey, level: 1, quantity: 1 }
        ],
        empireAge: 2 // 2 hours old
      },
      expectations: [
        {
          type: 'resource_generation',
          metric: 'credits_per_hour',
          operator: '>=',
          target: 500,
          description: 'Should generate at least 500 credits per hour'
        },
        {
          type: 'economic_equilibrium',
          metric: 'economic_efficiency',
          operator: 'between',
          target: [0.3, 1.0],
          description: 'Economic efficiency should be reasonable'
        }
      ],
      constraints: [
        {
          type: 'min_viability',
          condition: 'economic_growth',
          threshold: 300,
          critical: true
        }
      ]
    },

    // Mid game balance
    {
      name: 'Mid Game Tech Rush',
      description: 'Test mid game technology research balance',
      initialState: {
        resources: { credits: 50000 },
        technologies: new Map([
          ['energy', 3], 
          ['computer', 2], 
          ['laser', 2]
        ]),
        buildings: [
          { key: 'urban_structures' as BuildingKey, level: 3, quantity: 5 },
          { key: 'research_labs' as BuildingKey, level: 2, quantity: 3 },
          { key: 'metal_refineries' as BuildingKey, level: 2, quantity: 2 }
        ],
        empireAge: 12 // 12 hours old
      },
      expectations: [
        {
          type: 'capacity_calculation',
          metric: 'research_capacity',
          operator: '>=',
          target: 200,
          description: 'Should have significant research capacity'
        },
        {
          type: 'tech_progression',
          metric: 'tech_progression_rate',
          operator: '>',
          target: 0.5,
          description: 'Should be researching at least 0.5 tech levels per hour'
        }
      ],
      constraints: [
        {
          type: 'progression_gate',
          condition: 'research_access',
          threshold: 1,
          critical: true
        }
      ]
    },

    // Military balance
    {
      name: 'Military Production Balance',
      description: 'Test military unit production balance and effectiveness',
      initialState: {
        resources: { credits: 100000 },
        technologies: new Map([
          ['energy', 4],
          ['computer', 3],
          ['laser', 3],
          ['stellar_drive', 2],
          ['armour', 2]
        ]),
        buildings: [
          { key: 'urban_structures' as BuildingKey, level: 4, quantity: 6 },
          { key: 'shipyards' as BuildingKey, level: 2, quantity: 3 },
          { key: 'robotic_factories' as BuildingKey, level: 2, quantity: 2 }
        ],
        empireAge: 24 // 24 hours old
      },
      expectations: [
        {
          type: 'capacity_calculation',
          metric: 'production_capacity',
          operator: '>=',
          target: 150,
          description: 'Should have substantial production capacity'
        },
        {
          type: 'unit_effectiveness',
          metric: 'unit_efficiency_fighter',
          operator: '>',
          target: 0.5,
          description: 'Fighter units should be cost-effective'
        }
      ],
      constraints: [
        {
          type: 'max_dominance',
          condition: 'unit_effectiveness',
          threshold: 2.0,
          critical: false
        }
      ]
    }
  ];
}

/**
 * Create balance assertions for common scenarios
 */
export const BalanceAssertions = {
  economicViability: (creditsPerHour: number): BalanceExpectation => ({
    type: 'resource_generation',
    metric: 'credits_per_hour',
    operator: '>=',
    target: creditsPerHour,
    description: `Should generate at least ${creditsPerHour} credits per hour`
  }),

  techProgression: (minRate: number): BalanceExpectation => ({
    type: 'tech_progression',
    metric: 'tech_progression_rate',
    operator: '>=',
    target: minRate,
    description: `Should research at least ${minRate} tech levels per hour`
  }),

  strategicDiversity: (minOptions: number): BalanceExpectation => ({
    type: 'tech_progression',
    metric: 'strategic_options',
    operator: '>=',
    target: minOptions,
    description: `Should have at least ${minOptions} strategic options available`
  }),

  capacityUtilization: (minUtilization: number): BalanceExpectation => ({
    type: 'capacity_calculation',
    metric: 'resource_utilization',
    operator: '>=',
    target: minUtilization,
    description: `Should utilize at least ${minUtilization * 100}% of capacity`
  }),

  balanceEquilibrium: (minScore: number): BalanceExpectation => ({
    type: 'economic_equilibrium',
    metric: 'equilibrium_score',
    operator: '>=',
    target: minScore,
    description: `Should maintain strategic balance score of at least ${minScore}`
  })
};
