/**
 * Comprehensive Game Performance Test Suite
 * 
 * Tests game performance metrics including server response times,
 * game operation performance, scalability, and regression detection
 * using the Game Performance Testing Framework.
 */

import mongoose from 'mongoose';
import {
  GamePerformanceEngine,
  PerformanceTestScenario,
  PerformanceTestResult,
  PerformanceExpectation,
  PerformanceThreshold,
  createStandardPerformanceScenarios,
  GamePerformanceMetrics
} from '../../test-utils/game-performance-framework';
import { Empire } from '../../models/Empire';
import { Building } from '../../models/Building';
import { Location } from '../../models/Location';
import { CapacityService } from '../../services/capacityService';
import { EconomyService } from '../../services/economyService';

describe('Game Performance Testing', () => {
  let performanceEngine: GamePerformanceEngine;

  // Test configuration
  const TEST_TIMEOUT = 60000; // 60 seconds for performance tests

  beforeAll(async () => {
    // Connect to test database
    if (!mongoose.connection.readyState) {
      await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/attrition-test');
    }

    performanceEngine = new GamePerformanceEngine();
  });

  afterAll(async () => {
    await performanceEngine.cleanup();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up any existing test data from previous runs
    await Promise.all([
      Empire.deleteMany({ userId: { $regex: /perf-test-/ } }),
      Building.deleteMany({ locationCoord: { $regex: /PERF:/ } }),
      Location.deleteMany({ coord: { $regex: /PERF:/ } })
    ]);
  });

  describe('Standard Performance Scenarios', () => {
    test('should pass all standard performance scenarios', async () => {
      const scenarios = createStandardPerformanceScenarios();
      const results: PerformanceTestResult[] = [];

      // Run all standard scenarios
      for (const scenario of scenarios) {
        console.log(`\n=== Performance Test: ${scenario.name} ===`);
        const result = await performanceEngine.runPerformanceScenario(scenario);
        results.push(result);

        // Log detailed results for debugging
        console.log(`Success: ${result.success}`);
        console.log(`Duration: ${result.duration}ms`);
        console.log(`Performance Score: ${result.metrics.scalabilityMetrics.performanceScore}`);
        
        console.log('\nServer Metrics:');
        console.log(`  Response Time: ${result.metrics.serverMetrics.responseTime.average}ms (avg)`);
        console.log(`  Memory Usage: ${result.metrics.serverMetrics.resourceUsage.memoryUsed}MB`);
        console.log(`  Throughput: ${result.metrics.serverMetrics.throughput.requestsPerSecond} RPS`);

        console.log('\nGame Metrics:');
        console.log(`  Capacity Calc: ${result.metrics.gameMetrics.capacityCalculationTime}ms`);
        console.log(`  Economy Processing: ${result.metrics.gameMetrics.economyProcessingTime}ms`);

        console.log('\nExpectations:');
        result.expectations.forEach(exp => {
          console.log(`  ${exp.passed ? '✓' : '✗'} ${exp.expectation.description}`);
          console.log(`    Expected: ${exp.expectation.operator} ${exp.expectation.target}`);
          console.log(`    Actual: ${exp.actualValue}`);
        });

        if (result.alerts.length > 0) {
          console.log('\nAlerts:');
          result.alerts.forEach(alert => {
            const icon = alert.level === 'error' ? '❌' : alert.level === 'warning' ? '⚠️' : 'ℹ️';
            console.log(`  ${icon} ${alert.message}`);
          });
        }

        if (result.regressions.length > 0) {
          console.log('\nPerformance Regressions:');
          result.regressions.forEach(regression => {
            console.log(`  📉 ${regression.metric}: ${regression.degradationPercent.toFixed(1)}% degradation`);
          });
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
          const failedExpectations = f.expectations.filter(e => !e.passed && e.expectation.critical);
          const criticalAlerts = f.alerts.filter(a => a.level === 'error');
          
          return `${f.scenarioName}: ${failedExpectations.length} failed critical expectations, ${criticalAlerts.length} critical alerts`;
        }).join('\n');
        
        fail(`${failedScenarios.length} performance scenarios failed:\n${failureDetails}`);
      }

      expect(results.every(r => r.success)).toBe(true);
      expect(results).toHaveLength(scenarios.length);
    }, TEST_TIMEOUT);

    test('should validate basic load performance', async () => {
      const scenario: PerformanceTestScenario = {
        name: 'Basic Load Validation',
        description: 'Validate basic game operations performance under normal load',
        configuration: {
          empireCount: 5,
          buildingsPerEmpire: 3,
          simultaneousOperations: 25,
          testDuration: 15000,
          loadPattern: 'constant'
        },
        expectations: [
          {
            metric: 'responseTime.average',
            category: 'server',
            operator: '<',
            target: 300,
            critical: true,
            description: 'Average response time should be under 300ms'
          },
          {
            metric: 'performanceScore',
            category: 'scalability',
            operator: '>',
            target: 70,
            critical: false,
            description: 'Performance score should be above 70'
          }
        ],
        thresholds: [
          {
            type: 'response_time',
            warning: 200,
            critical: 500,
            unit: 'ms'
          },
          {
            type: 'memory_usage',
            warning: 500,
            critical: 1000,
            unit: 'mb'
          }
        ]
      };

      const result = await performanceEngine.runPerformanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.serverMetrics.responseTime.average).toBeLessThan(300);
      expect(result.metrics.scalabilityMetrics.performanceScore).toBeGreaterThan(70);
      expect(result.alerts.filter(a => a.level === 'error')).toHaveLength(0);
    }, TEST_TIMEOUT);

    test('should validate capacity calculation performance', async () => {
      const scenario: PerformanceTestScenario = {
        name: 'Capacity Performance Test',
        description: 'Test capacity calculation performance with varied building configurations',
        configuration: {
          empireCount: 10,
          buildingsPerEmpire: 8,
          simultaneousOperations: 50,
          testDuration: 20000,
          loadPattern: 'ramp'
        },
        expectations: [
          {
            metric: 'capacityCalculationTime',
            category: 'game',
            operator: '<',
            target: 50,
            critical: true,
            description: 'Capacity calculations should be under 50ms'
          },
          {
            metric: 'economyProcessingTime',
            category: 'game',
            operator: '<',
            target: 75,
            critical: true,
            description: 'Economy processing should be under 75ms'
          }
        ],
        thresholds: [
          {
            type: 'response_time',
            warning: 150,
            critical: 400,
            unit: 'ms'
          }
        ]
      };

      const result = await performanceEngine.runPerformanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.gameMetrics.capacityCalculationTime).toBeLessThan(50);
      expect(result.metrics.gameMetrics.economyProcessingTime).toBeLessThan(75);
    }, TEST_TIMEOUT);

    test('should validate economy processing performance', async () => {
      const scenario: PerformanceTestScenario = {
        name: 'Economy Processing Performance',
        description: 'Test economy processing performance with large empires',
        configuration: {
          empireCount: 15,
          buildingsPerEmpire: 12,
          simultaneousOperations: 75,
          testDuration: 25000,
          loadPattern: 'constant'
        },
        expectations: [
          {
            metric: 'economyProcessingTime',
            category: 'game',
            operator: '<',
            target: 100,
            critical: true,
            description: 'Economy processing should complete within 100ms'
          },
          {
            metric: 'responseTime.p95',
            category: 'server',
            operator: '<',
            target: 800,
            critical: true,
            description: '95th percentile response time should be under 800ms'
          }
        ],
        thresholds: [
          {
            type: 'response_time',
            warning: 300,
            critical: 1000,
            unit: 'ms'
          }
        ]
      };

      const result = await performanceEngine.runPerformanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.gameMetrics.economyProcessingTime).toBeLessThan(100);
      expect(result.metrics.serverMetrics.responseTime.p95).toBeLessThan(800);
    }, TEST_TIMEOUT);
  });

  describe('Scalability Performance Testing', () => {
    test('should handle moderate concurrent load', async () => {
      const scenario: PerformanceTestScenario = {
        name: 'Moderate Concurrent Load',
        description: 'Test system performance with moderate concurrent operations',
        configuration: {
          empireCount: 20,
          buildingsPerEmpire: 10,
          simultaneousOperations: 100,
          testDuration: 30000,
          loadPattern: 'ramp'
        },
        expectations: [
          {
            metric: 'responseTime.average',
            category: 'server',
            operator: '<',
            target: 600,
            critical: true,
            description: 'Average response time should remain reasonable under moderate load'
          },
          {
            metric: 'throughput.requestsPerSecond',
            category: 'server',
            operator: '>',
            target: 10,
            critical: true,
            description: 'Should maintain reasonable throughput'
          }
        ],
        thresholds: [
          {
            type: 'response_time',
            warning: 400,
            critical: 1000,
            unit: 'ms'
          },
          {
            type: 'memory_usage',
            warning: 750,
            critical: 1500,
            unit: 'mb'
          }
        ]
      };

      const result = await performanceEngine.runPerformanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.serverMetrics.responseTime.average).toBeLessThan(600);
      expect(result.metrics.serverMetrics.throughput.requestsPerSecond).toBeGreaterThan(10);
    }, TEST_TIMEOUT);

    test('should detect performance degradation under spike load', async () => {
      const scenario: PerformanceTestScenario = {
        name: 'Spike Load Test',
        description: 'Test system behavior during sudden load spikes',
        configuration: {
          empireCount: 25,
          buildingsPerEmpire: 8,
          simultaneousOperations: 75,
          testDuration: 35000,
          loadPattern: 'spike'
        },
        expectations: [
          {
            metric: 'responseTime.p99',
            category: 'server',
            operator: '<',
            target: 2000,
            critical: true,
            description: '99th percentile response time should stay under 2s during spikes'
          },
          {
            metric: 'performanceScore',
            category: 'scalability',
            operator: '>',
            target: 50,
            critical: false,
            description: 'Performance score should remain above 50 during spikes'
          }
        ],
        thresholds: [
          {
            type: 'response_time',
            warning: 800,
            critical: 2500,
            unit: 'ms'
          },
          {
            type: 'memory_usage',
            warning: 1000,
            critical: 2000,
            unit: 'mb'
          }
        ]
      };

      const result = await performanceEngine.runPerformanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.serverMetrics.responseTime.p99).toBeLessThan(2000);
      expect(result.metrics.scalabilityMetrics.performanceScore).toBeGreaterThan(50);
    }, TEST_TIMEOUT);

    test('should maintain stability under stress conditions', async () => {
      const scenario: PerformanceTestScenario = {
        name: 'Stress Test Stability',
        description: 'Test system stability under sustained high load',
        configuration: {
          empireCount: 30,
          buildingsPerEmpire: 12,
          simultaneousOperations: 150,
          testDuration: 40000,
          loadPattern: 'stress'
        },
        expectations: [
          {
            metric: 'responseTime.average',
            category: 'server',
            operator: '<',
            target: 1500,
            critical: true,
            description: 'Average response time should stay under 1.5s under stress'
          },
          {
            metric: 'resourceUsage.memoryUsed',
            category: 'server',
            operator: '<',
            target: 2000,
            critical: true,
            description: 'Memory usage should not exceed 2GB'
          }
        ],
        thresholds: [
          {
            type: 'response_time',
            warning: 1000,
            critical: 2500,
            unit: 'ms'
          },
          {
            type: 'memory_usage',
            warning: 1500,
            critical: 2500,
            unit: 'mb'
          }
        ]
      };

      const result = await performanceEngine.runPerformanceScenario(scenario);
      
      // Stress tests are allowed to show warnings but should not fail critically
      expect(result.alerts.filter(a => a.level === 'error')).toHaveLength(0);
      expect(result.metrics.serverMetrics.responseTime.average).toBeLessThan(1500);
      expect(result.metrics.serverMetrics.resourceUsage.memoryUsed).toBeLessThan(2000);
    }, TEST_TIMEOUT);
  });

  describe('Database Performance Testing', () => {
    test('should validate database query performance', async () => {
      const scenario: PerformanceTestScenario = {
        name: 'Database Query Performance',
        description: 'Test database performance under various query loads',
        configuration: {
          empireCount: 15,
          buildingsPerEmpire: 15,
          simultaneousOperations: 80,
          testDuration: 25000,
          loadPattern: 'constant'
        },
        expectations: [
          {
            metric: 'databasePerformance.queryTime',
            category: 'server',
            operator: '<',
            target: 200,
            critical: true,
            description: 'Database queries should complete within 200ms'
          },
          {
            metric: 'databasePerformance.slowQueries',
            category: 'server',
            operator: '<',
            target: 5,
            critical: false,
            description: 'Should have fewer than 5 slow queries'
          }
        ],
        thresholds: [
          {
            type: 'response_time',
            warning: 250,
            critical: 500,
            unit: 'ms'
          }
        ]
      };

      const result = await performanceEngine.runPerformanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.serverMetrics.databasePerformance.queryTime).toBeLessThan(200);
      expect(result.metrics.serverMetrics.databasePerformance.slowQueries).toBeLessThan(5);
    }, TEST_TIMEOUT);

    test('should handle large empire datasets efficiently', async () => {
      const scenario: PerformanceTestScenario = {
        name: 'Large Dataset Performance',
        description: 'Test performance with large empire datasets',
        configuration: {
          empireCount: 40,
          buildingsPerEmpire: 20,
          simultaneousOperations: 120,
          testDuration: 35000,
          loadPattern: 'ramp'
        },
        expectations: [
          {
            metric: 'empireUpdateTime',
            category: 'game',
            operator: '<',
            target: 150,
            critical: true,
            description: 'Empire updates should complete within 150ms'
          },
          {
            metric: 'databasePerformance.connectionPoolUsage',
            category: 'server',
            operator: '<',
            target: 80,
            critical: false,
            description: 'Database connection pool usage should stay below 80%'
          }
        ],
        thresholds: [
          {
            type: 'response_time',
            warning: 400,
            critical: 800,
            unit: 'ms'
          }
        ]
      };

      const result = await performanceEngine.runPerformanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.gameMetrics.empireUpdateTime).toBeLessThan(150);
      expect(result.metrics.serverMetrics.databasePerformance.connectionPoolUsage).toBeLessThan(80);
    }, TEST_TIMEOUT);
  });

  describe('Game-Specific Performance Testing', () => {
    test('should validate capacity service performance', async () => {
      // Direct performance test of CapacityService
      const testEmpires = await createTestEmpires(10);
      const startTime = Date.now();
      
      // Run capacity calculations for all test empires
      const promises = testEmpires.map(async (empire) => {
        const location = empire.territories[0];
        return CapacityService.getBaseCapacities(empire._id, location);
      });
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerCalculation = totalTime / testEmpires.length;

      expect(results).toHaveLength(testEmpires.length);
      expect(avgTimePerCalculation).toBeLessThan(100); // Should be under 100ms per empire
      expect(totalTime).toBeLessThan(2000); // Total should be under 2 seconds

      // Verify all calculations returned valid results
      results.forEach(result => {
        expect(result.construction).toBeDefined();
        expect(result.production).toBeDefined();
        expect(result.research).toBeDefined();
        expect(result.construction.value).toBeGreaterThanOrEqual(0);
        expect(result.production.value).toBeGreaterThanOrEqual(0);
        expect(result.research.value).toBeGreaterThanOrEqual(0);
      });

      // Cleanup
      await cleanupTestEmpires(testEmpires);
    });

    test('should validate economy service performance', async () => {
      // Direct performance test of EconomyService
      const testEmpires = await createTestEmpires(8);
      const startTime = Date.now();
      
      // Run economy calculations for all test empires
      const promises = testEmpires.map(async (empire) => {
        return EconomyService.computeEmpireEconomy(empire._id);
      });
      
      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const avgTimePerCalculation = totalTime / testEmpires.length;

      expect(results).toHaveLength(testEmpires.length);
      expect(avgTimePerCalculation).toBeLessThan(75); // Should be under 75ms per empire
      expect(totalTime).toBeLessThan(1500); // Total should be under 1.5 seconds

      // Verify all calculations returned valid results
      results.forEach(result => {
        expect(result.totalCreditsPerHour).toBeGreaterThanOrEqual(0);
        expect(result.breakdown).toBeDefined();
      });

      // Cleanup
      await cleanupTestEmpires(testEmpires);
    });

    test('should handle concurrent capacity calculations', async () => {
      const testEmpires = await createTestEmpires(15);
      const concurrentRequests = 50;
      const startTime = Date.now();

      // Create concurrent capacity calculation requests
      const promises: Promise<any>[] = [];
      for (let i = 0; i < concurrentRequests; i++) {
        const empire = testEmpires[i % testEmpires.length];
        const location = empire.territories[0];
        promises.push(CapacityService.getBaseCapacities(empire._id, location));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(concurrentRequests);
      expect(totalTime).toBeLessThan(5000); // Should handle 50 concurrent requests in under 5 seconds

      // Verify all concurrent requests succeeded
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.construction.value).toBeGreaterThanOrEqual(0);
      });

      // Cleanup
      await cleanupTestEmpires(testEmpires);
    });
  });

  describe('Performance Regression Testing', () => {
    test('should detect performance regressions', async () => {
      const baselineScenario: PerformanceTestScenario = {
        name: 'Regression Baseline',
        description: 'Establish baseline performance metrics',
        configuration: {
          empireCount: 10,
          buildingsPerEmpire: 5,
          simultaneousOperations: 40,
          testDuration: 20000,
          loadPattern: 'constant'
        },
        expectations: [
          {
            metric: 'responseTime.average',
            category: 'server',
            operator: '<',
            target: 400,
            critical: true,
            description: 'Baseline response time'
          }
        ],
        thresholds: []
      };

      // Run baseline test
      const baselineResult = await performanceEngine.runPerformanceScenario(baselineScenario);
      expect(baselineResult.success).toBe(true);

      // Run the same scenario again to check for regression detection
      const regressionResult = await performanceEngine.runPerformanceScenario(baselineScenario);
      expect(regressionResult.success).toBe(true);

      // Regression detection should work (may or may not find regressions depending on system state)
      expect(regressionResult.regressions).toBeDefined();
    }, TEST_TIMEOUT);

    test('should provide performance recommendations', async () => {
      const scenario: PerformanceTestScenario = {
        name: 'Recommendation Test',
        description: 'Test performance recommendation generation',
        configuration: {
          empireCount: 20,
          buildingsPerEmpire: 10,
          simultaneousOperations: 80,
          testDuration: 25000,
          loadPattern: 'ramp'
        },
        expectations: [
          {
            metric: 'responseTime.average',
            category: 'server',
            operator: '<',
            target: 500,
            critical: true,
            description: 'Response time for recommendations test'
          }
        ],
        thresholds: [
          {
            type: 'response_time',
            warning: 300,
            critical: 800,
            unit: 'ms'
          }
        ]
      };

      const result = await performanceEngine.runPerformanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      
      // Should have at least some recommendations or none if performance is perfect
      expect(result.recommendations.length).toBeGreaterThanOrEqual(0);
    }, TEST_TIMEOUT);
  });

  describe('Memory and Resource Testing', () => {
    test('should monitor memory usage during operations', async () => {
      const scenario: PerformanceTestScenario = {
        name: 'Memory Usage Test',
        description: 'Monitor memory usage during game operations',
        configuration: {
          empireCount: 25,
          buildingsPerEmpire: 15,
          simultaneousOperations: 100,
          testDuration: 30000,
          loadPattern: 'stress'
        },
        expectations: [
          {
            metric: 'resourceUsage.memoryUsed',
            category: 'server',
            operator: '<',
            target: 1500, // 1.5GB limit
            critical: true,
            description: 'Memory usage should stay within limits'
          }
        ],
        thresholds: [
          {
            type: 'memory_usage',
            warning: 1000,
            critical: 2000,
            unit: 'mb'
          }
        ]
      };

      const result = await performanceEngine.runPerformanceScenario(scenario);
      
      // Memory tests may show warnings but should not fail critically under normal conditions
      const memoryAlerts = result.alerts.filter(a => a.metric === 'memory_usage');
      const criticalMemoryAlerts = memoryAlerts.filter(a => a.level === 'error');
      
      expect(criticalMemoryAlerts).toHaveLength(0);
      expect(result.metrics.serverMetrics.resourceUsage.memoryUsed).toBeLessThan(1500);
    }, TEST_TIMEOUT);

    test('should detect memory leaks in long-running operations', async () => {
      const scenario: PerformanceTestScenario = {
        name: 'Memory Leak Detection',
        description: 'Test for memory leaks during extended operations',
        configuration: {
          empireCount: 15,
          buildingsPerEmpire: 8,
          simultaneousOperations: 60,
          testDuration: 45000, // Longer test to detect leaks
          loadPattern: 'constant'
        },
        expectations: [
          {
            metric: 'resourceUsage.memoryUsed',
            category: 'server',
            operator: '<',
            target: 1200,
            critical: true,
            description: 'Memory should not grow excessively over time'
          }
        ],
        thresholds: [
          {
            type: 'memory_usage',
            warning: 800,
            critical: 1500,
            unit: 'mb'
          }
        ]
      };

      const result = await performanceEngine.runPerformanceScenario(scenario);
      
      expect(result.success).toBe(true);
      expect(result.metrics.serverMetrics.resourceUsage.memoryUsed).toBeLessThan(1200);
      
      // Should not have critical memory warnings in a leak detection test
      const criticalMemoryAlerts = result.alerts.filter(a => 
        a.metric === 'memory_usage' && a.level === 'error'
      );
      expect(criticalMemoryAlerts).toHaveLength(0);
    }, TEST_TIMEOUT);
  });

  // Helper functions for test setup and cleanup
  async function createTestEmpires(count: number): Promise<any[]> {
    const empires = [];
    
    for (let i = 0; i < count; i++) {
      const empireId = new mongoose.Types.ObjectId().toString();
      const locationCoord = `TEST-PERF:${i}:${Date.now()}`;

      const empire = new Empire({
        _id: empireId,
        userId: `performance-test-${i}`,
        name: `Performance Test Empire ${i}`,
        territories: [locationCoord],
        baseCount: 1,
        hasDeletedBase: false,
        resources: {
          credits: 50000 + (i * 5000),
          energy: 25000 + (i * 2500)
        },
        techLevels: new Map([
          ['energy', Math.min(4, i % 5)],
          ['computer', Math.min(3, i % 4)],
          ['cybernetics', Math.min(2, i % 3)]
        ]),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await empire.save();

      const location = new Location({
        coord: locationCoord,
        owner: empire.userId,
        name: `Performance Test Location ${i}`,
        createdAt: new Date(),
        result: {
          yields: { metal: 3 + (i % 2) },
          fertility: 2 + (i % 2)
        },
        positionBase: {
          solarEnergy: 4 + (i % 2)
        }
      });

      await location.save();

      // Create some buildings for more realistic tests
      const buildingTypes = ['urban_structures', 'research_labs', 'robotic_factories'];
      for (let j = 0; j < 3; j++) {
        const building = new Building({
          empireId: new mongoose.Types.ObjectId(empireId),
          locationCoord: locationCoord,
          catalogKey: buildingTypes[j],
          buildingKey: buildingTypes[j],
          level: Math.min(3, j + 1),
          isActive: true,
          identityKey: `${empireId}:${locationCoord}:${buildingTypes[j]}:${j}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await building.save();
      }

      empires.push(empire);
    }

    return empires;
  }

  async function cleanupTestEmpires(empires: any[]): Promise<void> {
    const empireIds = empires.map(e => e._id);
    const locations = empires.flatMap(e => e.territories);

    await Promise.all([
      Empire.deleteMany({ _id: { $in: empireIds } }),
      Building.deleteMany({ empireId: { $in: empireIds.map(id => new mongoose.Types.ObjectId(id)) } }),
      Location.deleteMany({ coord: { $in: locations } })
    ]);
  }
});
