/**
 * Game Performance Testing Framework
 * 
 * This framework extends the existing Playwright performance testing with
 * game-specific metrics, server-side performance monitoring, and automated
 * performance regression detection for the Attrition MMO.
 */

import { test as base, expect, Page, Browser } from '@playwright/test';
import { performance, PerformanceObserver } from 'perf_hooks';
import mongoose from 'mongoose';
import { Empire } from '../models/Empire';
import { Building } from '../models/Building';
import { Location } from '../models/Location';
import { GameBalanceEngine } from './game-balance-framework';
import { CapacityService } from '../services/capacityService';
import { EconomyService } from '../services/economyService';

// ===========================
// Performance Testing Types
// ===========================

export interface GamePerformanceMetrics {
  serverMetrics: {
    responseTime: {
      average: number;
      p95: number;
      p99: number;
    };
    throughput: {
      requestsPerSecond: number;
      peakRPS: number;
    };
    resourceUsage: {
      memoryUsed: number;
      cpuUsage: number;
      gcTime: number;
    };
    databasePerformance: {
      queryTime: number;
      connectionPoolUsage: number;
      slowQueries: number;
    };
  };
  gameMetrics: {
    capacityCalculationTime: number;
    economyProcessingTime: number;
    empireUpdateTime: number;
    queueProcessingTime: number;
    combatResolutionTime: number;
  };
  clientMetrics: {
    loadTime: number;
    renderTime: number;
    interactionDelay: number;
    memoryUsage: number;
    networkLatency: number;
  };
  scalabilityMetrics: {
    concurrentUsers: number;
    maxSupportedUsers: number;
    degradationThreshold: number;
    performanceScore: number; // 0-100 overall score
  };
}

export interface PerformanceTestScenario {
  name: string;
  description: string;
  configuration: {
    empireCount: number;
    buildingsPerEmpire: number;
    simultaneousOperations: number;
    testDuration: number; // milliseconds
    loadPattern: 'constant' | 'ramp' | 'spike' | 'stress';
  };
  expectations: PerformanceExpectation[];
  thresholds: PerformanceThreshold[];
}

export interface PerformanceExpectation {
  metric: string;
  category: 'server' | 'game' | 'client' | 'scalability';
  operator: '<' | '<=' | '>' | '>=' | 'between';
  target: number | [number, number];
  critical: boolean; // if true, test fails if not met
  description: string;
}

export interface PerformanceThreshold {
  type: 'response_time' | 'memory_usage' | 'cpu_usage' | 'throughput' | 'error_rate';
  warning: number;
  critical: number;
  unit: 'ms' | 'mb' | 'percent' | 'rps' | 'count';
}

export interface PerformanceTestResult {
  scenarioName: string;
  success: boolean;
  duration: number;
  metrics: GamePerformanceMetrics;
  expectations: Array<{
    expectation: PerformanceExpectation;
    actualValue: number | [number, number];
    passed: boolean;
    threshold?: 'warning' | 'critical';
  }>;
  recommendations: string[];
  alerts: Array<{
    level: 'info' | 'warning' | 'error';
    message: string;
    metric: string;
    value: number;
  }>;
  regressions: Array<{
    metric: string;
    previousValue: number;
    currentValue: number;
    degradationPercent: number;
  }>;
}

// ================================
// Game Performance Testing Engine
// ================================

export class GamePerformanceEngine {
  private browser: Browser | null = null;
  private baselineMetrics: Map<string, GamePerformanceMetrics> = new Map();
  private performanceObserver: PerformanceObserver | null = null;
  private activeTests: Map<string, NodeJS.Timeout> = new Map();
  
  constructor() {
    // Initialize performance monitoring
    this.setupPerformanceMonitoring();
  }

  /**
   * Initialize performance monitoring and baseline collection
   */
  private setupPerformanceMonitoring(): void {
    this.performanceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      // Process performance entries for server-side metrics
      entries.forEach(entry => {
        if (entry.entryType === 'measure') {
          // Custom game performance measures
          console.log(`Performance: ${entry.name} took ${entry.duration}ms`);
        }
      });
    });
    
    this.performanceObserver.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
  }

  /**
   * Set up test environment and create test data
   */
  async setupTestEnvironment(scenario: PerformanceTestScenario): Promise<{
    empires: string[];
    locations: string[];
  }> {
    console.log(`[PerfTest] Setting up environment for ${scenario.name}`);
    
    const empires: string[] = [];
    const locations: string[] = [];

    // Create test empires and data based on scenario configuration
    for (let i = 0; i < scenario.configuration.empireCount; i++) {
      const empireId = new mongoose.Types.ObjectId().toString();
      const locationCoord = `PERF:${scenario.name}:${i}:${Date.now()}`;

      // Create test empire
      const empire = new Empire({
        _id: empireId,
        userId: `perf-test-${scenario.name}-${i}`,
        name: `Performance Test Empire ${i}`,
        territories: [locationCoord],
        baseCount: 1,
        hasDeletedBase: false,
        resources: {
          credits: 100000 + (i * 10000),
          energy: 50000 + (i * 5000)
        },
        techLevels: new Map([
          ['energy', Math.min(5, Math.floor(i / 2) + 1)],
          ['computer', Math.min(4, Math.floor(i / 3) + 1)],
          ['cybernetics', Math.min(3, Math.floor(i / 4) + 1)]
        ]),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await empire.save();

      // Create test location
      const location = new Location({
        coord: locationCoord,
        owner: empire.userId,
        name: `Performance Test Location ${i}`,
        createdAt: new Date(),
        result: {
          yields: { metal: 3 + (i % 3) },
          fertility: 2 + (i % 2)
        },
        positionBase: {
          solarEnergy: 4 + (i % 2)
        }
      });

      await location.save();

      // Create test buildings
      const buildingTypes = ['urban_structures', 'research_labs', 'shipyards', 'robotic_factories', 'metal_refineries'];
      for (let j = 0; j < scenario.configuration.buildingsPerEmpire; j++) {
        const buildingType = buildingTypes[j % buildingTypes.length];
        const building = new Building({
          empireId: new mongoose.Types.ObjectId(empireId),
          locationCoord: locationCoord,
          catalogKey: buildingType,
          buildingKey: buildingType,
          level: Math.min(5, Math.floor(j / 2) + 1),
          isActive: true,
          identityKey: `${empireId}:${locationCoord}:${buildingType}:${j}`,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        await building.save();
      }

      empires.push(empireId);
      locations.push(locationCoord);
    }

    console.log(`[PerfTest] Created ${empires.length} test empires with ${scenario.configuration.buildingsPerEmpire} buildings each`);
    return { empires, locations };
  }

  /**
   * Run a comprehensive performance test scenario
   */
  async runPerformanceScenario(scenario: PerformanceTestScenario): Promise<PerformanceTestResult> {
    const startTime = Date.now();
    console.log(`[PerfTest] Running scenario: ${scenario.name}`);

    try {
      // Setup test environment
      const { empires, locations } = await this.setupTestEnvironment(scenario);

      // Initialize metrics collection
      const metricsCollector = new PerformanceMetricsCollector();

      // Execute performance test based on load pattern
      const metrics = await this.executeLoadTest(scenario, empires, locations, metricsCollector);

      // Evaluate expectations
      const expectationResults = this.evaluateExpectations(scenario.expectations, metrics);

      // Check thresholds and generate alerts
      const alerts = this.checkThresholds(scenario.thresholds, metrics);

      // Detect regressions against baseline
      const regressions = this.detectRegressions(scenario.name, metrics);

      // Generate recommendations
      const recommendations = this.generatePerformanceRecommendations(metrics, expectationResults, alerts);

      // Determine overall success
      const success = expectationResults.every(r => r.passed || !r.expectation.critical) &&
                     alerts.filter(a => a.level === 'error').length === 0;

      const result: PerformanceTestResult = {
        scenarioName: scenario.name,
        success,
        duration: Date.now() - startTime,
        metrics,
        expectations: expectationResults,
        recommendations,
        alerts,
        regressions
      };

      // Store baseline metrics for future regression detection
      this.baselineMetrics.set(scenario.name, metrics);

      return result;

    } catch (error) {
      console.error(`[PerfTest] Error in scenario ${scenario.name}:`, error);
      return this.createFailureResult(scenario.name, startTime, error);
    } finally {
      // Cleanup test data
      await this.cleanupTestEnvironment(scenario.name);
    }
  }

  /**
   * Execute load test based on configuration
   */
  private async executeLoadTest(
    scenario: PerformanceTestScenario,
    empires: string[],
    locations: string[],
    metricsCollector: PerformanceMetricsCollector
  ): Promise<GamePerformanceMetrics> {
    console.log(`[PerfTest] Executing ${scenario.configuration.loadPattern} load test`);

    // Start metrics collection
    metricsCollector.startCollection();

    // Execute operations based on load pattern
    switch (scenario.configuration.loadPattern) {
      case 'constant':
        await this.executeConstantLoad(scenario, empires, locations);
        break;
      case 'ramp':
        await this.executeRampLoad(scenario, empires, locations);
        break;
      case 'spike':
        await this.executeSpikeLoad(scenario, empires, locations);
        break;
      case 'stress':
        await this.executeStressLoad(scenario, empires, locations);
        break;
    }

    // Stop metrics collection and return results
    const metrics = await metricsCollector.stopCollectionAndGetMetrics();
    return metrics;
  }

  /**
   * Execute constant load test
   */
  private async executeConstantLoad(
    scenario: PerformanceTestScenario,
    empires: string[],
    locations: string[]
  ): Promise<void> {
    const operations = this.generateGameOperations(empires, locations, scenario.configuration.simultaneousOperations);
    const operationInterval = scenario.configuration.testDuration / operations.length;

    for (const operation of operations) {
      await this.executeGameOperation(operation);
      await this.sleep(operationInterval);
    }
  }

  /**
   * Execute ramp load test (gradually increase load)
   */
  private async executeRampLoad(
    scenario: PerformanceTestScenario,
    empires: string[],
    locations: string[]
  ): Promise<void> {
    const totalOperations = scenario.configuration.simultaneousOperations * 3; // Ramp to 3x normal
    const operations = this.generateGameOperations(empires, locations, totalOperations);
    const rampDuration = scenario.configuration.testDuration;
    
    for (let i = 0; i < operations.length; i++) {
      // Gradually decrease delay to increase load
      const progress = i / operations.length;
      const delay = Math.max(10, rampDuration / totalOperations * (1 - progress));
      
      await this.executeGameOperation(operations[i]);
      await this.sleep(delay);
    }
  }

  /**
   * Execute spike load test (sudden load increase)
   */
  private async executeSpikeLoad(
    scenario: PerformanceTestScenario,
    empires: string[],
    locations: string[]
  ): Promise<void> {
    const normalLoad = scenario.configuration.simultaneousOperations;
    const spikeLoad = normalLoad * 5; // 5x spike
    
    // Normal load for 1/3 of the time
    const normalOperations = this.generateGameOperations(empires, locations, normalLoad);
    for (const operation of normalOperations.slice(0, normalOperations.length / 3)) {
      await this.executeGameOperation(operation);
      await this.sleep(50);
    }

    // Spike load for 1/3 of the time
    const spikeOperations = this.generateGameOperations(empires, locations, spikeLoad);
    const promises: Promise<void>[] = [];
    for (const operation of spikeOperations) {
      promises.push(this.executeGameOperation(operation));
      if (promises.length >= 10) {
        await Promise.all(promises.splice(0, 10));
      }
    }
    await Promise.all(promises);

    // Return to normal load
    for (const operation of normalOperations.slice(-normalOperations.length / 3)) {
      await this.executeGameOperation(operation);
      await this.sleep(50);
    }
  }

  /**
   * Execute stress load test (maximum sustainable load)
   */
  private async executeStressLoad(
    scenario: PerformanceTestScenario,
    empires: string[],
    locations: string[]
  ): Promise<void> {
    const maxLoad = scenario.configuration.simultaneousOperations * 10;
    const operations = this.generateGameOperations(empires, locations, maxLoad);
    
    // Execute all operations with minimal delay
    const promises: Promise<void>[] = [];
    for (const operation of operations) {
      promises.push(this.executeGameOperation(operation));
      
      // Process in batches to avoid overwhelming the system
      if (promises.length >= 20) {
        await Promise.all(promises.splice(0, 20));
      }
    }
    
    // Wait for remaining operations
    await Promise.all(promises);
  }

  /**
   * Generate game operations for testing
   */
  private generateGameOperations(
    empires: string[],
    locations: string[],
    count: number
  ): GameOperation[] {
    const operations: GameOperation[] = [];
    const operationTypes: GameOperationType[] = [
      'capacity_calculation',
      'economy_processing',
      'empire_update',
      'building_construction',
      'technology_research'
    ];

    for (let i = 0; i < count; i++) {
      const empireIndex = i % empires.length;
      const operationType = operationTypes[i % operationTypes.length];
      
      operations.push({
        type: operationType,
        empireId: empires[empireIndex],
        locationCoord: locations[empireIndex],
        parameters: this.generateOperationParameters(operationType, i)
      });
    }

    return operations;
  }

  /**
   * Generate parameters for different operation types
   */
  private generateOperationParameters(type: GameOperationType, index: number): any {
    switch (type) {
      case 'capacity_calculation':
        return { includeAll: true };
      case 'economy_processing':
        return { updateQueues: true };
      case 'empire_update':
        return { fullSync: index % 10 === 0 };
      case 'building_construction':
        return { 
          buildingType: ['urban_structures', 'research_labs', 'shipyards'][index % 3],
          level: Math.min(5, (index % 5) + 1)
        };
      case 'technology_research':
        return {
          techType: ['energy', 'computer', 'laser', 'cybernetics'][index % 4],
          targetLevel: Math.min(10, (index % 3) + 1)
        };
      default:
        return {};
    }
  }

  /**
   * Execute a single game operation and measure performance
   */
  private async executeGameOperation(operation: GameOperation): Promise<void> {
    const startMark = `${operation.type}-${operation.empireId}-start`;
    const endMark = `${operation.type}-${operation.empireId}-end`;
    const measureName = `${operation.type}-${operation.empireId}`;

    performance.mark(startMark);

    try {
      switch (operation.type) {
        case 'capacity_calculation':
          await CapacityService.getBaseCapacities(operation.empireId, operation.locationCoord);
          break;
        case 'economy_processing':
          await EconomyService.computeEmpireEconomy(operation.empireId);
          break;
        case 'empire_update':
          const empire = await Empire.findById(operation.empireId);
          if (empire) {
            empire.updatedAt = new Date();
            await empire.save();
          }
          break;
        case 'building_construction':
          // Simulate building construction calculation
          const buildings = await Building.find({
            empireId: new mongoose.Types.ObjectId(operation.empireId)
          });
          // Process building effects (simplified)
          buildings.forEach(building => {
            const effect = building.level * 10; // Simple calculation
          });
          break;
        case 'technology_research':
          // Simulate technology research calculation
          const researchEmpire = await Empire.findById(operation.empireId);
          if (researchEmpire?.techLevels) {
            const currentLevel = researchEmpire.techLevels.get(operation.parameters.techType) || 0;
            const cost = Math.pow(currentLevel + 1, 2) * 100; // Simplified cost calculation
          }
          break;
      }
    } catch (error) {
      console.error(`[PerfTest] Error executing ${operation.type}:`, error);
    }

    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);
  }

  /**
   * Evaluate performance expectations
   */
  private evaluateExpectations(
    expectations: PerformanceExpectation[],
    metrics: GamePerformanceMetrics
  ): Array<{
    expectation: PerformanceExpectation;
    actualValue: number | [number, number];
    passed: boolean;
    threshold?: 'warning' | 'critical';
  }> {
    return expectations.map(expectation => {
      const actualValue = this.extractMetricValue(expectation.metric, expectation.category, metrics);
      const passed = this.evaluateMetricExpectation(expectation, actualValue);
      
      return {
        expectation,
        actualValue,
        passed,
        threshold: passed ? undefined : (expectation.critical ? 'critical' : 'warning')
      };
    });
  }

  /**
   * Extract metric value from performance metrics
   */
  private extractMetricValue(
    metric: string,
    category: 'server' | 'game' | 'client' | 'scalability',
    metrics: GamePerformanceMetrics
  ): number {
    const categoryMetrics = metrics[`${category}Metrics`];
    
    // Handle nested metric paths (e.g., 'responseTime.average')
    const pathParts = metric.split('.');
    let value: any = categoryMetrics;
    
    for (const part of pathParts) {
      value = value?.[part];
    }
    
    return typeof value === 'number' ? value : 0;
  }

  /**
   * Evaluate metric expectation
   */
  private evaluateMetricExpectation(
    expectation: PerformanceExpectation,
    actualValue: number
  ): boolean {
    if (Array.isArray(expectation.target)) {
      const [min, max] = expectation.target;
      return actualValue >= min && actualValue <= max;
    }

    const target = expectation.target;
    switch (expectation.operator) {
      case '<': return actualValue < target;
      case '<=': return actualValue <= target;
      case '>': return actualValue > target;
      case '>=': return actualValue >= target;
      default: return false;
    }
  }

  /**
   * Check performance thresholds and generate alerts
   */
  private checkThresholds(
    thresholds: PerformanceThreshold[],
    metrics: GamePerformanceMetrics
  ): Array<{
    level: 'info' | 'warning' | 'error';
    message: string;
    metric: string;
    value: number;
  }> {
    const alerts: Array<{
      level: 'info' | 'warning' | 'error';
      message: string;
      metric: string;
      value: number;
    }> = [];

    // Check server response time thresholds
    const avgResponseTime = metrics.serverMetrics.responseTime.average;
    const responseThreshold = thresholds.find(t => t.type === 'response_time');
    if (responseThreshold) {
      if (avgResponseTime > responseThreshold.critical) {
        alerts.push({
          level: 'error',
          message: `Response time critically high: ${avgResponseTime}${responseThreshold.unit}`,
          metric: 'response_time',
          value: avgResponseTime
        });
      } else if (avgResponseTime > responseThreshold.warning) {
        alerts.push({
          level: 'warning',
          message: `Response time above warning threshold: ${avgResponseTime}${responseThreshold.unit}`,
          metric: 'response_time',
          value: avgResponseTime
        });
      }
    }

    // Check memory usage thresholds
    const memoryUsage = metrics.serverMetrics.resourceUsage.memoryUsed;
    const memoryThreshold = thresholds.find(t => t.type === 'memory_usage');
    if (memoryThreshold) {
      if (memoryUsage > memoryThreshold.critical) {
        alerts.push({
          level: 'error',
          message: `Memory usage critically high: ${memoryUsage}${memoryThreshold.unit}`,
          metric: 'memory_usage',
          value: memoryUsage
        });
      } else if (memoryUsage > memoryThreshold.warning) {
        alerts.push({
          level: 'warning',
          message: `Memory usage above warning threshold: ${memoryUsage}${memoryThreshold.unit}`,
          metric: 'memory_usage',
          value: memoryUsage
        });
      }
    }

    // Check CPU usage thresholds
    const cpuUsage = metrics.serverMetrics.resourceUsage.cpuUsage;
    const cpuThreshold = thresholds.find(t => t.type === 'cpu_usage');
    if (cpuThreshold) {
      if (cpuUsage > cpuThreshold.critical) {
        alerts.push({
          level: 'error',
          message: `CPU usage critically high: ${cpuUsage}${cpuThreshold.unit}`,
          metric: 'cpu_usage',
          value: cpuUsage
        });
      } else if (cpuUsage > cpuThreshold.warning) {
        alerts.push({
          level: 'warning',
          message: `CPU usage above warning threshold: ${cpuUsage}${cpuThreshold.unit}`,
          metric: 'cpu_usage',
          value: cpuUsage
        });
      }
    }

    return alerts;
  }

  /**
   * Detect performance regressions against baseline
   */
  private detectRegressions(
    scenarioName: string,
    currentMetrics: GamePerformanceMetrics
  ): Array<{
    metric: string;
    previousValue: number;
    currentValue: number;
    degradationPercent: number;
  }> {
    const regressions: Array<{
      metric: string;
      previousValue: number;
      currentValue: number;
      degradationPercent: number;
    }> = [];

    const baseline = this.baselineMetrics.get(scenarioName);
    if (!baseline) {
      return regressions; // No baseline to compare against
    }

    // Check key performance metrics for regressions
    const checks = [
      {
        metric: 'server.responseTime.average',
        current: currentMetrics.serverMetrics.responseTime.average,
        baseline: baseline.serverMetrics.responseTime.average,
        lowerIsBetter: true
      },
      {
        metric: 'game.capacityCalculationTime',
        current: currentMetrics.gameMetrics.capacityCalculationTime,
        baseline: baseline.gameMetrics.capacityCalculationTime,
        lowerIsBetter: true
      },
      {
        metric: 'server.throughput.requestsPerSecond',
        current: currentMetrics.serverMetrics.throughput.requestsPerSecond,
        baseline: baseline.serverMetrics.throughput.requestsPerSecond,
        lowerIsBetter: false
      }
    ];

    checks.forEach(check => {
      if (check.baseline > 0) {
        const change = (check.current - check.baseline) / check.baseline * 100;
        
        // Consider it a regression if performance degraded by more than 15%
        const isRegression = check.lowerIsBetter ? change > 15 : change < -15;
        
        if (isRegression) {
          regressions.push({
            metric: check.metric,
            previousValue: check.baseline,
            currentValue: check.current,
            degradationPercent: Math.abs(change)
          });
        }
      }
    });

    return regressions;
  }

  /**
   * Generate performance recommendations
   */
  private generatePerformanceRecommendations(
    metrics: GamePerformanceMetrics,
    expectationResults: any[],
    alerts: any[]
  ): string[] {
    const recommendations: string[] = [];

    // High response time recommendations
    if (metrics.serverMetrics.responseTime.average > 1000) {
      recommendations.push('Consider optimizing database queries and adding caching layers');
    }

    // High memory usage recommendations
    if (metrics.serverMetrics.resourceUsage.memoryUsed > 1000) {
      recommendations.push('Monitor for memory leaks and consider implementing object pooling');
    }

    // Slow game operation recommendations
    if (metrics.gameMetrics.capacityCalculationTime > 100) {
      recommendations.push('Optimize capacity calculation algorithms and consider caching results');
    }

    // Failed expectations recommendations
    const failedCriticalExpectations = expectationResults.filter(r => !r.passed && r.expectation.critical);
    if (failedCriticalExpectations.length > 0) {
      recommendations.push(`Address ${failedCriticalExpectations.length} critical performance issues`);
    }

    // Alert-based recommendations
    const errorAlerts = alerts.filter(a => a.level === 'error');
    if (errorAlerts.length > 0) {
      recommendations.push('Immediate attention required for critical performance alerts');
    }

    return recommendations;
  }

  /**
   * Create failure result for error cases
   */
  private createFailureResult(
    scenarioName: string,
    startTime: number,
    error: any
  ): PerformanceTestResult {
    return {
      scenarioName,
      success: false,
      duration: Date.now() - startTime,
      metrics: this.getEmptyMetrics(),
      expectations: [],
      recommendations: [`Test failed with error: ${error.message || error}`],
      alerts: [{
        level: 'error',
        message: `Test execution failed: ${error.message || error}`,
        metric: 'test_execution',
        value: 0
      }],
      regressions: []
    };
  }

  /**
   * Get empty metrics structure
   */
  private getEmptyMetrics(): GamePerformanceMetrics {
    return {
      serverMetrics: {
        responseTime: { average: 0, p95: 0, p99: 0 },
        throughput: { requestsPerSecond: 0, peakRPS: 0 },
        resourceUsage: { memoryUsed: 0, cpuUsage: 0, gcTime: 0 },
        databasePerformance: { queryTime: 0, connectionPoolUsage: 0, slowQueries: 0 }
      },
      gameMetrics: {
        capacityCalculationTime: 0,
        economyProcessingTime: 0,
        empireUpdateTime: 0,
        queueProcessingTime: 0,
        combatResolutionTime: 0
      },
      clientMetrics: {
        loadTime: 0,
        renderTime: 0,
        interactionDelay: 0,
        memoryUsage: 0,
        networkLatency: 0
      },
      scalabilityMetrics: {
        concurrentUsers: 0,
        maxSupportedUsers: 0,
        degradationThreshold: 0,
        performanceScore: 0
      }
    };
  }

  /**
   * Clean up test environment
   */
  private async cleanupTestEnvironment(scenarioName: string): Promise<void> {
    console.log(`[PerfTest] Cleaning up test environment for ${scenarioName}`);

    try {
      await Promise.all([
        Empire.deleteMany({ userId: { $regex: new RegExp(`perf-test-${scenarioName}`) } }),
        Building.deleteMany({ locationCoord: { $regex: new RegExp(`PERF:${scenarioName}:`) } }),
        Location.deleteMany({ coord: { $regex: new RegExp(`PERF:${scenarioName}:`) } })
      ]);
    } catch (error) {
      console.error('[PerfTest] Error during cleanup:', error);
    }
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up performance monitoring
   */
  async cleanup(): Promise<void> {
    this.performanceObserver?.disconnect();
    
    // Clear any active test timeouts
    this.activeTests.forEach(timeout => clearTimeout(timeout));
    this.activeTests.clear();
  }
}

// ============================
// Performance Metrics Collector
// ============================

class PerformanceMetricsCollector {
  private startTime: number = 0;
  private responseTimes: number[] = [];
  private memorySnapshots: number[] = [];
  private cpuSnapshots: number[] = [];

  startCollection(): void {
    this.startTime = Date.now();
    this.responseTimes = [];
    this.memorySnapshots = [];
    this.cpuSnapshots = [];

    // Start collecting system metrics
    this.collectSystemMetrics();
  }

  private collectSystemMetrics(): void {
    const interval = setInterval(() => {
      // Collect memory usage
      const memUsage = process.memoryUsage();
      this.memorySnapshots.push(memUsage.heapUsed / 1024 / 1024); // Convert to MB

      // Collect CPU usage (simplified)
      const cpuUsage = process.cpuUsage();
      this.cpuSnapshots.push(cpuUsage.user + cpuUsage.system);
    }, 1000); // Collect every second

    // Stop collection after a reasonable time
    setTimeout(() => {
      clearInterval(interval);
    }, 60000); // Stop after 1 minute
  }

  async stopCollectionAndGetMetrics(): Promise<GamePerformanceMetrics> {
    const endTime = Date.now();
    const duration = endTime - this.startTime;

    // Calculate statistics from collected data
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    const avgMemoryUsage = this.memorySnapshots.length > 0
      ? this.memorySnapshots.reduce((sum, mem) => sum + mem, 0) / this.memorySnapshots.length
      : 0;

    const avgCpuUsage = this.cpuSnapshots.length > 0
      ? this.cpuSnapshots.reduce((sum, cpu) => sum + cpu, 0) / this.cpuSnapshots.length / 1000000 // Convert to seconds
      : 0;

    // Calculate game-specific metrics from performance marks
    const gameMetrics = this.calculateGameMetrics();

    return {
      serverMetrics: {
        responseTime: {
          average: avgResponseTime,
          p95: this.calculatePercentile(this.responseTimes, 95),
          p99: this.calculatePercentile(this.responseTimes, 99)
        },
        throughput: {
          requestsPerSecond: this.responseTimes.length / (duration / 1000),
          peakRPS: Math.max(10, this.responseTimes.length / (duration / 1000) * 1.5)
        },
        resourceUsage: {
          memoryUsed: avgMemoryUsage,
          cpuUsage: avgCpuUsage * 100, // Convert to percentage
          gcTime: 0 // Simplified
        },
        databasePerformance: {
          queryTime: avgResponseTime * 0.6, // Assume 60% of response time is DB
          connectionPoolUsage: Math.min(95, avgMemoryUsage / 10), // Simplified
          slowQueries: this.responseTimes.filter(t => t > 1000).length
        }
      },
      gameMetrics,
      clientMetrics: {
        loadTime: 0, // Would be collected from browser
        renderTime: 0, // Would be collected from browser
        interactionDelay: avgResponseTime,
        memoryUsage: 0, // Would be collected from browser
        networkLatency: avgResponseTime * 0.2 // Simplified
      },
      scalabilityMetrics: {
        concurrentUsers: this.estimateConcurrentUsers(),
        maxSupportedUsers: this.estimateMaxUsers(),
        degradationThreshold: avgResponseTime > 500 ? avgResponseTime : 0,
        performanceScore: this.calculatePerformanceScore(avgResponseTime, avgMemoryUsage)
      }
    };
  }

  private calculateGameMetrics() {
    // Extract game-specific timing from performance marks
    const measures = performance.getEntriesByType('measure');
    const gameMetrics = {
      capacityCalculationTime: 0,
      economyProcessingTime: 0,
      empireUpdateTime: 0,
      queueProcessingTime: 0,
      combatResolutionTime: 0
    };

    measures.forEach(measure => {
      if (measure.name.includes('capacity_calculation')) {
        gameMetrics.capacityCalculationTime = Math.max(gameMetrics.capacityCalculationTime, measure.duration);
      } else if (measure.name.includes('economy_processing')) {
        gameMetrics.economyProcessingTime = Math.max(gameMetrics.economyProcessingTime, measure.duration);
      } else if (measure.name.includes('empire_update')) {
        gameMetrics.empireUpdateTime = Math.max(gameMetrics.empireUpdateTime, measure.duration);
      }
    });

    return gameMetrics;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private estimateConcurrentUsers(): number {
    // Simplified estimation based on request rate
    return Math.max(1, this.responseTimes.length / 10);
  }

  private estimateMaxUsers(): number {
    // Simplified estimation based on current performance
    const avgResponse = this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length;
    return avgResponse < 500 ? 1000 : Math.max(100, 500000 / avgResponse);
  }

  private calculatePerformanceScore(responseTime: number, memoryUsage: number): number {
    // Calculate score out of 100
    let score = 100;
    
    // Deduct for high response time
    if (responseTime > 100) score -= Math.min(30, (responseTime - 100) / 50);
    
    // Deduct for high memory usage
    if (memoryUsage > 500) score -= Math.min(20, (memoryUsage - 500) / 100);
    
    return Math.max(0, Math.min(100, score));
  }
}

// ==================
// Helper Types
// ==================

type GameOperationType = 
  | 'capacity_calculation'
  | 'economy_processing'
  | 'empire_update'
  | 'building_construction'
  | 'technology_research';

interface GameOperation {
  type: GameOperationType;
  empireId: string;
  locationCoord: string;
  parameters: any;
}

// ==================
// Helper Functions
// ==================

/**
 * Create standard performance test scenarios
 */
export function createStandardPerformanceScenarios(): PerformanceTestScenario[] {
  return [
    {
      name: 'Basic Load Test',
      description: 'Test basic game operations under normal load',
      configuration: {
        empireCount: 10,
        buildingsPerEmpire: 5,
        simultaneousOperations: 50,
        testDuration: 30000, // 30 seconds
        loadPattern: 'constant'
      },
      expectations: [
        {
          metric: 'responseTime.average',
          category: 'server',
          operator: '<',
          target: 500,
          critical: true,
          description: 'Average response time should be under 500ms'
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
    },

    {
      name: 'Capacity Calculation Performance',
      description: 'Test performance of capacity calculation system',
      configuration: {
        empireCount: 25,
        buildingsPerEmpire: 10,
        simultaneousOperations: 100,
        testDuration: 20000,
        loadPattern: 'ramp'
      },
      expectations: [
        {
          metric: 'capacityCalculationTime',
          category: 'game',
          operator: '<',
          target: 100,
          critical: true,
          description: 'Capacity calculations should complete within 100ms'
        }
      ],
      thresholds: [
        {
          type: 'response_time',
          warning: 200,
          critical: 500,
          unit: 'ms'
        }
      ]
    },

    {
      name: 'Stress Test',
      description: 'Test system behavior under extreme load',
      configuration: {
        empireCount: 50,
        buildingsPerEmpire: 15,
        simultaneousOperations: 200,
        testDuration: 45000,
        loadPattern: 'stress'
      },
      expectations: [
        {
          metric: 'responseTime.average',
          category: 'server',
          operator: '<',
          target: 2000,
          critical: true,
          description: 'System should remain responsive under stress'
        }
      ],
      thresholds: [
        {
          type: 'response_time',
          warning: 1000,
          critical: 3000,
          unit: 'ms'
        },
        {
          type: 'memory_usage',
          warning: 1000,
          critical: 2000,
          unit: 'mb'
        }
      ]
    }
  ];
}
