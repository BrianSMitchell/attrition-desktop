/**
 * Comprehensive Game Balance Test Suite
 * 
 * Tests core game balance mechanics including resource calculations,
 * technology progression curves, unit effectiveness, and economic equilibrium
 * using the Game Balance Testing Framework.
 */

import mongoose from 'mongoose';
import {
  GameBalanceEngine,
  BalanceTestScenario,
  BalanceTestResult,
  BalanceExpectation,
  BalanceConstraint,
  createStandardBalanceScenarios,
  BalanceAssertions
} from '../../test-utils/game-balance-framework';
import { Empire } from '../../models/Empire';
import { Building } from '../../models/Building';
import { Location } from '../../models/Location';
import { TechnologyKey, BuildingKey, UnitKey } from '@game/shared';
import { CapacityService } from '../../services/capacityService';
import { EconomyService } from '../../services/economyService';

describe('Game Balance Testing', () => {
  let balanceEngine: GameBalanceEngine;

  // Test configuration
  const TEST_TIMEOUT = 30000; // 30 seconds for complex balance calculations

  beforeAll(async () => {
    // Connect to test database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/attrition-test');
    }

    balanceEngine = new GameBalanceEngine();
  });

  afterAll(async () => {
    await balanceEngine.cleanup();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up any existing test data
    await balanceEngine.cleanup();
  });

  describe('Standard Balance Scenarios', () => {
    test('should pass all standard balance scenarios', async () => {
      const scenarios = createStandardBalanceScenarios();
      const results: BalanceTestResult[] = [];

      // Run all standard scenarios
      for (const scenario of scenarios) {
        const result = await balanceEngine.runBalanceScenario(scenario);
        results.push(result);

        // Log detailed results for debugging
        console.log(`\n=== Balance Test: ${scenario.name} ===`);
        console.log(`Success: ${result.success}`);
        console.log(`Duration: ${result.duration}ms`);
        
        console.log('\nExpectations:');
        result.expectations.forEach(exp => {
          console.log(`  ${exp.passed ? '✓' : '✗'} ${exp.expectation.description}`);
          console.log(`    Expected: ${exp.expectation.operator} ${exp.expectation.target}`);
          console.log(`    Actual: ${exp.actualValue}${exp.deviation ? ` (${exp.deviation.toFixed(1)}% deviation)` : ''}`);
        });

        console.log('\nConstraints:');
        result.constraints.forEach(constraint => {
          console.log(`  ${constraint.satisfied ? '✓' : '✗'} ${constraint.constraint.type}: ${constraint.constraint.condition} >= ${constraint.constraint.threshold}`);
          console.log(`    Actual: ${constraint.actualValue}`);
        });

        if (result.warnings.length > 0) {
          console.log('\nWarnings:');
          result.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
        }

        if (result.recommendations.length > 0) {
          console.log('\nRecommendations:');
          result.recommendations.forEach(rec => console.log(`  💡 ${rec}`));
        }
      }

      // Validate that all scenarios pass
      const failedScenarios = results.filter(r => !r.success);
      if (failedScenarios.length > 0) {
        const failureDetails = failedScenarios.map(f => {
          const failedExpectations = f.expectations.filter(e => !e.passed);
          const failedConstraints = f.constraints.filter(c => c.constraint.critical && !c.satisfied);
          
          return `${f.scenarioName}: ${failedExpectations.length} failed expectations, ${failedConstraints.length} failed critical constraints`;
        }).join('\n');
        
        fail(`${failedScenarios.length} balance scenarios failed:\n${failureDetails}`);
      }

      expect(results.every(r => r.success)).toBe(true);
      expect(results).toHaveLength(scenarios.length);
    }, TEST_TIMEOUT);

    test('should validate early game economic balance', async () => {
      const scenario: BalanceTestScenario = {
        name: 'Early Economic Validation',
        description: 'Validate early game economic development patterns',
        initialState: {
          resources: { credits: 8000 },
          technologies: new Map([['energy', 1]]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 2, quantity: 2 },
            { key: 'metal_refineries' as BuildingKey, level: 1, quantity: 1 }
          ],
          empireAge: 1.5
        },
        expectations: [
          BalanceAssertions.economicViability(400),
          BalanceAssertions.strategicDiversity(2),
          {
            type: 'capacity_calculation',
            metric: 'construction_capacity',
            operator: '>=',
            target: 50,
            description: 'Should have basic construction capacity'
          }
        ],
        constraints: [
          {
            type: 'min_viability',
            condition: 'economic_growth',
            threshold: 250,
            critical: true
          }
        ]
      };

      const result = await balanceEngine.runBalanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.economicMetrics.creditsPerHour).toBeGreaterThan(400);
      expect(result.metrics.economicMetrics.constructionCapacity).toBeGreaterThan(50);
      expect(result.metrics.progressionMetrics.strategicOptions).toBeGreaterThanOrEqual(2);
    });

    test('should validate mid game technology balance', async () => {
      const scenario: BalanceTestScenario = {
        name: 'Mid Game Technology Validation',
        description: 'Validate technology research progression and balance',
        initialState: {
          resources: { credits: 45000 },
          technologies: new Map([
            ['energy', 3],
            ['computer', 2],
            ['cybernetics', 1]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 3, quantity: 4 },
            { key: 'research_labs' as BuildingKey, level: 2, quantity: 2 },
            { key: 'robotic_factories' as BuildingKey, level: 1, quantity: 1 }
          ],
          empireAge: 10
        },
        expectations: [
          BalanceAssertions.techProgression(0.3),
          {
            type: 'capacity_calculation',
            metric: 'research_capacity',
            operator: '>=',
            target: 150,
            description: 'Should have substantial research capacity'
          },
          {
            type: 'economic_equilibrium',
            metric: 'equilibrium_score',
            operator: '>=',
            target: 0.4,
            description: 'Should maintain reasonable strategic balance'
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
      };

      const result = await balanceEngine.runBalanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.economicMetrics.researchCapacity).toBeGreaterThan(150);
      expect(result.metrics.progressionMetrics.techProgressionRate).toBeGreaterThan(0.3);
      expect(result.metrics.balanceMetrics.equilibriumScore).toBeGreaterThan(0.4);
    });

    test('should validate late game military balance', async () => {
      const scenario: BalanceTestScenario = {
        name: 'Late Game Military Validation',
        description: 'Validate late game military production and unit effectiveness',
        initialState: {
          resources: { credits: 150000 },
          technologies: new Map([
            ['energy', 5],
            ['computer', 4],
            ['laser', 4],
            ['plasma', 2],
            ['stellar_drive', 3],
            ['armour', 3]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 5, quantity: 8 },
            { key: 'shipyards' as BuildingKey, level: 3, quantity: 4 },
            { key: 'orbital_shipyards' as BuildingKey, level: 2, quantity: 2 },
            { key: 'robotic_factories' as BuildingKey, level: 3, quantity: 3 }
          ],
          empireAge: 48
        },
        expectations: [
          {
            type: 'capacity_calculation',
            metric: 'production_capacity',
            operator: '>=',
            target: 300,
            description: 'Should have high production capacity'
          },
          {
            type: 'unit_effectiveness',
            metric: 'unit_efficiency_fighter',
            operator: '>',
            target: 0.4,
            description: 'Fighters should be cost-effective'
          },
          {
            type: 'unit_effectiveness',
            metric: 'unit_efficiency_destroyer',
            operator: '>',
            target: 0.3,
            description: 'Destroyers should be reasonably cost-effective'
          }
        ],
        constraints: [
          {
            type: 'max_dominance',
            condition: 'unit_effectiveness',
            threshold: 3.0,
            critical: false
          }
        ]
      };

      const result = await balanceEngine.runBalanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.economicMetrics.productionCapacity).toBeGreaterThan(300);
      
      // Check unit effectiveness
      const fighterEfficiency = result.metrics.balanceMetrics.unitCostEfficiency.get('fighter' as UnitKey);
      const destroyerEfficiency = result.metrics.balanceMetrics.unitCostEfficiency.get('destroyer' as UnitKey);
      
      expect(fighterEfficiency).toBeGreaterThan(0.4);
      expect(destroyerEfficiency).toBeGreaterThan(0.3);
    });
  });

  describe('Capacity Calculation Balance', () => {
    test('should validate construction capacity calculations', async () => {
      const scenario: BalanceTestScenario = {
        name: 'Construction Capacity Test',
        description: 'Test construction capacity calculations and balance',
        initialState: {
          resources: { credits: 25000 },
          technologies: new Map([
            ['energy', 2],
            ['cybernetics', 2]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 3, quantity: 3 },
            { key: 'robotic_factories' as BuildingKey, level: 2, quantity: 2 }
          ],
          empireAge: 6
        },
        expectations: [
          {
            type: 'capacity_calculation',
            metric: 'construction_capacity',
            operator: 'between',
            target: [80, 200],
            description: 'Construction capacity should be within expected range'
          },
          {
            type: 'resource_generation',
            metric: 'economic_efficiency',
            operator: '>',
            target: 0.4,
            description: 'Economic efficiency should be reasonable'
          }
        ],
        constraints: []
      };

      const result = await balanceEngine.runBalanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.economicMetrics.constructionCapacity).toBeGreaterThan(80);
      expect(result.metrics.economicMetrics.constructionCapacity).toBeLessThan(200);
      expect(result.metrics.economicMetrics.economicEfficiency).toBeGreaterThan(0.4);
    });

    test('should validate research capacity progression', async () => {
      const scenario: BalanceTestScenario = {
        name: 'Research Capacity Progression',
        description: 'Test research capacity growth with technology levels',
        initialState: {
          resources: { credits: 35000 },
          technologies: new Map([
            ['energy', 3],
            ['computer', 3],
            ['artificial_intelligence', 2]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 3, quantity: 4 },
            { key: 'research_labs' as BuildingKey, level: 3, quantity: 3 }
          ],
          empireAge: 8
        },
        expectations: [
          {
            type: 'capacity_calculation',
            metric: 'research_capacity',
            operator: '>=',
            target: 180,
            description: 'Should have high research capacity with tech bonuses'
          },
          {
            type: 'tech_progression',
            metric: 'tech_progression_rate',
            operator: '>',
            target: 0.4,
            description: 'Should have good tech progression rate'
          }
        ],
        constraints: [
          {
            type: 'min_viability',
            condition: 'tech_progression',
            threshold: 0.2,
            critical: true
          }
        ]
      };

      const result = await balanceEngine.runBalanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.economicMetrics.researchCapacity).toBeGreaterThan(180);
      expect(result.metrics.progressionMetrics.techProgressionRate).toBeGreaterThan(0.4);
    });

    test('should validate production capacity with military focus', async () => {
      const scenario: BalanceTestScenario = {
        name: 'Military Production Capacity',
        description: 'Test production capacity for military unit construction',
        initialState: {
          resources: { credits: 75000 },
          technologies: new Map([
            ['energy', 4],
            ['computer', 3],
            ['cybernetics', 3],
            ['stellar_drive', 2]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 4, quantity: 5 },
            { key: 'shipyards' as BuildingKey, level: 3, quantity: 3 },
            { key: 'robotic_factories' as BuildingKey, level: 2, quantity: 2 }
          ],
          empireAge: 20
        },
        expectations: [
          {
            type: 'capacity_calculation',
            metric: 'production_capacity',
            operator: 'between',
            target: [200, 400],
            description: 'Production capacity should support military focus'
          },
          {
            type: 'tech_progression',
            metric: 'strategic_options',
            operator: '>=',
            target: 4,
            description: 'Should have multiple strategic options available'
          }
        ],
        constraints: [
          {
            type: 'min_viability',
            condition: 'economic_growth',
            threshold: 800,
            critical: true
          }
        ]
      };

      const result = await balanceEngine.runBalanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.economicMetrics.productionCapacity).toBeGreaterThan(200);
      expect(result.metrics.economicMetrics.productionCapacity).toBeLessThan(400);
      expect(result.metrics.progressionMetrics.strategicOptions).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Technology Balance Testing', () => {
    test('should validate technology cost-benefit ratios', async () => {
      const scenario: BalanceTestScenario = {
        name: 'Technology ROI Analysis',
        description: 'Test technology return on investment calculations',
        initialState: {
          resources: { credits: 60000 },
          technologies: new Map([
            ['energy', 4],
            ['computer', 3],
            ['laser', 3],
            ['cybernetics', 2],
            ['artificial_intelligence', 2]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 4, quantity: 6 },
            { key: 'research_labs' as BuildingKey, level: 2, quantity: 3 }
          ],
          empireAge: 15
        },
        expectations: [
          {
            type: 'tech_progression',
            metric: 'tech_progression_rate',
            operator: 'between',
            target: [0.4, 1.2],
            description: 'Tech progression should be balanced'
          },
          {
            type: 'economic_equilibrium',
            metric: 'equilibrium_score',
            operator: '>=',
            target: 0.5,
            description: 'Should maintain good strategic balance'
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
      };

      const result = await balanceEngine.runBalanceScenario(scenario);
      
      expect(result.success).toBe(true);
      
      // Check technology ROI values
      const techROI = result.metrics.balanceMetrics.techReturnOnInvestment;
      expect(techROI.size).toBeGreaterThan(0);
      
      // Validate that no technology has extreme ROI values
      Array.from(techROI.values()).forEach(roi => {
        expect(roi).toBeGreaterThan(0);
        expect(roi).toBeLessThan(10); // Prevent overpowered technologies
      });
    });

    test('should validate technology prerequisites and dependencies', async () => {
      const scenario: BalanceTestScenario = {
        name: 'Technology Prerequisites Test',
        description: 'Test technology prerequisite balance and progression gates',
        initialState: {
          resources: { credits: 40000 },
          technologies: new Map([
            ['energy', 5],
            ['computer', 2] // Intentionally low computer tech
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 3, quantity: 5 },
            { key: 'research_labs' as BuildingKey, level: 2, quantity: 2 }
          ],
          empireAge: 12
        },
        expectations: [
          {
            type: 'tech_progression',
            metric: 'strategic_options',
            operator: '>=',
            target: 2,
            description: 'Should have some strategic options despite tech imbalance'
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
      };

      const result = await balanceEngine.runBalanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.progressionMetrics.strategicOptions).toBeGreaterThanOrEqual(2);
      
      // Should identify tech imbalance as a bottleneck
      expect(result.metrics.progressionMetrics.progressionBottlenecks.length).toBeGreaterThan(0);
    });
  });

  describe('Unit Effectiveness Balance', () => {
    test('should validate unit cost efficiency across unit types', async () => {
      const scenario: BalanceTestScenario = {
        name: 'Unit Cost Efficiency Analysis',
        description: 'Test unit cost-effectiveness across different unit types',
        initialState: {
          resources: { credits: 120000 },
          technologies: new Map([
            ['energy', 5],
            ['computer', 4],
            ['laser', 4],
            ['plasma', 3],
            ['missiles', 2],
            ['armour', 3],
            ['stellar_drive', 3]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 5, quantity: 8 },
            { key: 'shipyards' as BuildingKey, level: 4, quantity: 4 },
            { key: 'orbital_shipyards' as BuildingKey, level: 3, quantity: 2 }
          ],
          empireAge: 36
        },
        expectations: [
          {
            type: 'unit_effectiveness',
            metric: 'unit_efficiency_fighter',
            operator: 'between',
            target: [0.4, 1.5],
            description: 'Fighter efficiency should be balanced'
          },
          {
            type: 'unit_effectiveness',
            metric: 'unit_efficiency_corvette',
            operator: 'between',
            target: [0.3, 1.2],
            description: 'Corvette efficiency should be balanced'
          },
          {
            type: 'unit_effectiveness',
            metric: 'unit_efficiency_destroyer',
            operator: 'between',
            target: [0.25, 1.0],
            description: 'Destroyer efficiency should be balanced'
          }
        ],
        constraints: [
          {
            type: 'max_dominance',
            condition: 'unit_effectiveness',
            threshold: 2.0,
            critical: true
          }
        ]
      };

      const result = await balanceEngine.runBalanceScenario(scenario);
      
      expect(result.success).toBe(true);
      
      // Validate unit efficiency ranges
      const unitEfficiencies = result.metrics.balanceMetrics.unitCostEfficiency;
      
      const fighterEff = unitEfficiencies.get('fighter' as UnitKey) || 0;
      const corvetteEff = unitEfficiencies.get('corvette' as UnitKey) || 0;
      const destroyerEff = unitEfficiencies.get('destroyer' as UnitKey) || 0;
      
      expect(fighterEff).toBeGreaterThan(0.4);
      expect(fighterEff).toBeLessThan(1.5);
      
      expect(corvetteEff).toBeGreaterThan(0.3);
      expect(corvetteEff).toBeLessThan(1.2);
      
      expect(destroyerEff).toBeGreaterThan(0.25);
      expect(destroyerEff).toBeLessThan(1.0);
    });

    test('should validate technology effects on unit effectiveness', async () => {
      // Test with low tech levels
      const lowTechScenario: BalanceTestScenario = {
        name: 'Low Tech Unit Effectiveness',
        description: 'Test unit effectiveness with minimal technology',
        initialState: {
          resources: { credits: 50000 },
          technologies: new Map([
            ['energy', 2],
            ['computer', 1],
            ['laser', 1]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 3, quantity: 4 },
            { key: 'shipyards' as BuildingKey, level: 2, quantity: 2 }
          ],
          empireAge: 8
        },
        expectations: [
          {
            type: 'unit_effectiveness',
            metric: 'unit_efficiency_fighter',
            operator: '>',
            target: 0.2,
            description: 'Fighters should be minimally viable with low tech'
          }
        ],
        constraints: []
      };

      // Test with high tech levels
      const highTechScenario: BalanceTestScenario = {
        name: 'High Tech Unit Effectiveness',
        description: 'Test unit effectiveness with advanced technology',
        initialState: {
          resources: { credits: 100000 },
          technologies: new Map([
            ['energy', 6],
            ['computer', 5],
            ['laser', 5],
            ['plasma', 4],
            ['armour', 4]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 5, quantity: 6 },
            { key: 'shipyards' as BuildingKey, level: 4, quantity: 3 },
            { key: 'orbital_shipyards' as BuildingKey, level: 3, quantity: 2 }
          ],
          empireAge: 40
        },
        expectations: [
          {
            type: 'unit_effectiveness',
            metric: 'unit_efficiency_fighter',
            operator: '>',
            target: 0.6,
            description: 'Fighters should be highly effective with advanced tech'
          }
        ],
        constraints: [
          {
            type: 'max_dominance',
            condition: 'unit_effectiveness',
            threshold: 2.5,
            critical: true
          }
        ]
      };

      const lowTechResult = await balanceEngine.runBalanceScenario(lowTechScenario);
      const highTechResult = await balanceEngine.runBalanceScenario(highTechScenario);
      
      expect(lowTechResult.success).toBe(true);
      expect(highTechResult.success).toBe(true);
      
      // Compare fighter effectiveness between scenarios
      const lowTechFighterEff = lowTechResult.metrics.balanceMetrics.unitCostEfficiency.get('fighter' as UnitKey) || 0;
      const highTechFighterEff = highTechResult.metrics.balanceMetrics.unitCostEfficiency.get('fighter' as UnitKey) || 0;
      
      expect(lowTechFighterEff).toBeGreaterThan(0.2);
      expect(highTechFighterEff).toBeGreaterThan(0.6);
      expect(highTechFighterEff).toBeGreaterThan(lowTechFighterEff);
    });
  });

  describe('Economic Equilibrium Testing', () => {
    test('should validate economic efficiency across different empire strategies', async () => {
      const economicFocusScenario: BalanceTestScenario = {
        name: 'Economic Focus Strategy',
        description: 'Test pure economic development strategy',
        initialState: {
          resources: { credits: 80000 },
          technologies: new Map([
            ['energy', 4],
            ['cybernetics', 3],
            ['artificial_intelligence', 2]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 4, quantity: 8 },
            { key: 'economic_centers' as BuildingKey, level: 2, quantity: 3 },
            { key: 'metal_refineries' as BuildingKey, level: 3, quantity: 4 }
          ],
          empireAge: 24
        },
        expectations: [
          {
            type: 'resource_generation',
            metric: 'credits_per_hour',
            operator: '>=',
            target: 1200,
            description: 'Should generate high credits with economic focus'
          },
          {
            type: 'resource_generation',
            metric: 'economic_efficiency',
            operator: '>=',
            target: 0.8,
            description: 'Should have high economic efficiency'
          }
        ],
        constraints: [
          {
            type: 'min_viability',
            condition: 'economic_growth',
            threshold: 1000,
            critical: true
          }
        ]
      };

      const result = await balanceEngine.runBalanceScenario(economicFocusScenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.economicMetrics.creditsPerHour).toBeGreaterThan(1200);
      expect(result.metrics.economicMetrics.economicEfficiency).toBeGreaterThan(0.8);
    });

    test('should validate strategic balance score', async () => {
      const balancedScenario: BalanceTestScenario = {
        name: 'Balanced Strategy Test',
        description: 'Test balanced development across all areas',
        initialState: {
          resources: { credits: 90000 },
          technologies: new Map([
            ['energy', 4],
            ['computer', 3],
            ['laser', 3],
            ['cybernetics', 2],
            ['artificial_intelligence', 2],
            ['stellar_drive', 2]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 4, quantity: 5 },
            { key: 'research_labs' as BuildingKey, level: 3, quantity: 2 },
            { key: 'shipyards' as BuildingKey, level: 2, quantity: 2 },
            { key: 'robotic_factories' as BuildingKey, level: 2, quantity: 2 },
            { key: 'metal_refineries' as BuildingKey, level: 2, quantity: 2 }
          ],
          empireAge: 30
        },
        expectations: [
          BalanceAssertions.balanceEquilibrium(0.6),
          BalanceAssertions.strategicDiversity(5),
          {
            type: 'economic_equilibrium',
            metric: 'equilibrium_score',
            operator: 'between',
            target: [0.6, 0.9],
            description: 'Should maintain excellent strategic balance'
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
      };

      const result = await balanceEngine.runBalanceScenario(balancedScenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.balanceMetrics.equilibriumScore).toBeGreaterThan(0.6);
      expect(result.metrics.balanceMetrics.equilibriumScore).toBeLessThan(0.9);
      expect(result.metrics.progressionMetrics.strategicOptions).toBeGreaterThanOrEqual(5);
    });

    test('should identify and warn about unbalanced strategies', async () => {
      const unbalancedScenario: BalanceTestScenario = {
        name: 'Unbalanced Strategy Test',
        description: 'Test detection of unbalanced empire development',
        initialState: {
          resources: { credits: 70000 },
          technologies: new Map([
            ['laser', 6], // Heavily focused on one tech
            ['energy', 2]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 2, quantity: 3 },
            { key: 'shipyards' as BuildingKey, level: 5, quantity: 5 } // All military
          ],
          empireAge: 20
        },
        expectations: [
          {
            type: 'economic_equilibrium',
            metric: 'equilibrium_score',
            operator: '<',
            target: 0.5,
            description: 'Should detect poor strategic balance'
          }
        ],
        constraints: [
          {
            type: 'min_viability',
            condition: 'economic_growth',
            threshold: 200,
            critical: true
          }
        ]
      };

      const result = await balanceEngine.runBalanceScenario(unbalancedScenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.balanceMetrics.equilibriumScore).toBeLessThan(0.5);
      expect(result.warnings.length).toBeGreaterThan(0);
      
      // Should detect strategic imbalance
      const hasBalanceWarning = result.warnings.some(w => 
        w.includes('balance') || w.includes('specialized')
      );
      expect(hasBalanceWarning).toBe(true);
    });
  });

  describe('Edge Cases and Stress Testing', () => {
    test('should handle minimal resource scenarios', async () => {
      const minimalScenario: BalanceTestScenario = {
        name: 'Minimal Resources Test',
        description: 'Test balance with minimal starting resources',
        initialState: {
          resources: { credits: 1000 },
          technologies: new Map(),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 1, quantity: 1 }
          ],
          empireAge: 0.5
        },
        expectations: [
          {
            type: 'resource_generation',
            metric: 'credits_per_hour',
            operator: '>',
            target: 50,
            description: 'Should generate some credits even with minimal setup'
          }
        ],
        constraints: [
          {
            type: 'min_viability',
            condition: 'economic_growth',
            threshold: 20,
            critical: true
          }
        ]
      };

      const result = await balanceEngine.runBalanceScenario(minimalScenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.economicMetrics.creditsPerHour).toBeGreaterThan(50);
    });

    test('should handle maximum development scenarios', async () => {
      const maxDevScenario: BalanceTestScenario = {
        name: 'Maximum Development Test',
        description: 'Test balance with maximum development levels',
        initialState: {
          resources: { credits: 500000 },
          technologies: new Map([
            ['energy', 10],
            ['computer', 10],
            ['laser', 8],
            ['plasma', 6],
            ['ion', 4],
            ['missiles', 6],
            ['cybernetics', 8],
            ['artificial_intelligence', 6],
            ['stellar_drive', 8],
            ['armour', 8]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 10, quantity: 15 },
            { key: 'research_labs' as BuildingKey, level: 8, quantity: 8 },
            { key: 'shipyards' as BuildingKey, level: 8, quantity: 6 },
            { key: 'orbital_shipyards' as BuildingKey, level: 6, quantity: 4 },
            { key: 'robotic_factories' as BuildingKey, level: 8, quantity: 8 }
          ],
          empireAge: 168 // 1 week old
        },
        expectations: [
          {
            type: 'resource_generation',
            metric: 'credits_per_hour',
            operator: '>=',
            target: 5000,
            description: 'Should generate massive credits with max development'
          },
          {
            type: 'capacity_calculation',
            metric: 'production_capacity',
            operator: '>=',
            target: 1000,
            description: 'Should have enormous production capacity'
          }
        ],
        constraints: [
          {
            type: 'max_dominance',
            condition: 'unit_effectiveness',
            threshold: 5.0,
            critical: false
          }
        ]
      };

      const result = await balanceEngine.runBalanceScenario(maxDevScenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.economicMetrics.creditsPerHour).toBeGreaterThan(5000);
      expect(result.metrics.economicMetrics.productionCapacity).toBeGreaterThan(1000);
    });
  });

  describe('Performance and Timeout Validation', () => {
    test('should complete balance calculations within reasonable time', async () => {
      const complexScenario: BalanceTestScenario = {
        name: 'Performance Test Scenario',
        description: 'Test balance calculation performance with complex empire',
        initialState: {
          resources: { credits: 200000 },
          technologies: new Map([
            ['energy', 7],
            ['computer', 6],
            ['laser', 5],
            ['plasma', 4],
            ['cybernetics', 5],
            ['artificial_intelligence', 4],
            ['stellar_drive', 5]
          ]),
          buildings: [
            { key: 'urban_structures' as BuildingKey, level: 6, quantity: 10 },
            { key: 'research_labs' as BuildingKey, level: 4, quantity: 5 },
            { key: 'shipyards' as BuildingKey, level: 4, quantity: 4 },
            { key: 'robotic_factories' as BuildingKey, level: 4, quantity: 4 },
            { key: 'metal_refineries' as BuildingKey, level: 4, quantity: 3 }
          ],
          empireAge: 72
        },
        expectations: [
          {
            type: 'resource_generation',
            metric: 'credits_per_hour',
            operator: '>',
            target: 2000,
            description: 'Should handle complex calculations efficiently'
          }
        ],
        constraints: []
      };

      const startTime = Date.now();
      const result = await balanceEngine.runBalanceScenario(complexScenario);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.duration).toBeLessThan(5000);
    });
  });
});
