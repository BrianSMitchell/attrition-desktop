/**
 * Testing Metrics Collection Framework
 * 
 * This framework provides comprehensive metrics collection, analysis, and reporting
 * for all aspects of the testing infrastructure including coverage, performance,
 * reliability, and trend analysis for the Attrition MMO testing pipeline.
 */

import { DB_FIELDS, DIRECTORY_PATHS, STATUS_CODES } from '@game/shared';

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ===========================
// Testing Metrics Types
// ===========================

export interface TestExecution {
  id: string;
  timestamp: Date;
  type: 'unit' | 'integration' | 'e2e' | 'game' | 'multiplayer' | 'balance' | 'performance';
  duration: number; // milliseconds
  status: 'passed' | 'failed' | 'skipped';
  suite: string;
  testName: string;
  error?: string;
  metadata?: Record<string, any>;
}

export interface CoverageMetrics {
  timestamp: Date;
  type: 'statement' | 'branch' | 'function' | 'line';
  total: number;
  covered: number;
  percentage: number;
  uncoveredFiles: string[];
  criticalFilesCoverage: Record<string, number>;
}

export interface PerformanceMetrics {
  timestamp: Date;
  testType: string;
  operation: string;
  duration: number;
  memoryUsage: number;
  cpuUsage?: number;
  throughput?: number;
  errorRate: number;
  regressionScore: number; // -1 to 1, where negative indicates degradation
}

export interface TestHealthMetrics {
  timestamp: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  flakyTests: string[]; // Tests that intermittently fail
  slowTests: Array<{ name: string; avgDuration: number }>;
  coverageScore: number;
  performanceScore: number;
  reliabilityScore: number; // Based on flaky test rate
  overallHealthScore: number; // Composite score 0-100
}

export interface TestTrend {
  period: string; // daily, weekly, monthly
  metrics: {
    executionTime: Array<{ date: string; value: number }>;
    successRate: Array<{ date: string; value: number }>;
    coverage: Array<{ date: string; value: number }>;
    performance: Array<{ date: string; value: number }>;
    reliability: Array<{ date: string; value: number }>;
  };
  alerts: TestAlert[];
}

export interface TestAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: 'coverage_drop' | 'performance_regression' | 'reliability_decline' | 'build_failure' | 'flaky_test';
  message: string;
  details: Record<string, any>;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface DashboardConfig {
  metricsRetentionDays: number;
  alertThresholds: {
    coverageMinimum: number;
    performanceRegressionThreshold: number;
    flakyTestThreshold: number;
    failureRateThreshold: number;
  };
  reportingConfig: {
    dailyReportEnabled: boolean;
    weeklyReportEnabled: boolean;
    slackWebhookUrl?: string;
    emailRecipients?: string[];
  };
}

// ================================
// Testing Metrics Collector
// ================================

export class TestingMetricsCollector {
  private metricsDir: string;
  private config: DashboardConfig;
  private executions: TestExecution[] = [];
  private alerts: TestAlert[] = [];

  constructor(config: Partial<DashboardConfig> = {}) {
    this.metricsDir = join(process.cwd(), 'test-metrics');
    this.config = {
      metricsRetentionDays: 90,
      alertThresholds: {
        coverageMinimum: 80,
        performanceRegressionThreshold: 15, // 15% degradation
        flakyTestThreshold: 5, // 5% flaky test rate
        failureRateThreshold: 10 // 10% failure rate
      },
      reportingConfig: {
        dailyReportEnabled: true,
        weeklyReportEnabled: true
      },
      ...config
    };

    this.ensureDirectoryExists();
    this.loadExistingData();
  }

  private ensureDirectoryExists(): void {
    if (!existsSync(this.metricsDir)) {
      mkdirSync(this.metricsDir, { recursive: true });
    }
    
    ['executions', DIRECTORY_PATHS.COVERAGE, 'performance', 'health', 'alerts'].forEach(subDir => {
      const dirPath = join(this.metricsDir, subDir);
      if (!existsSync(dirPath)) {
        mkdirSync(dirPath, { recursive: true });
      }
    });
  }

  private loadExistingData(): void {
    try {
      const executionsFile = join(this.metricsDir, 'executions', 'latest.json');
      if (existsSync(executionsFile)) {
        const data = JSON.parse(readFileSync(executionsFile, 'utf-8'));
        this.executions = data.map((e: any) => ({ ...e, timestamp: new Date(e.timestamp) }));
      }

      const alertsFile = join(this.metricsDir, 'alerts', 'active.json');
      if (existsSync(alertsFile)) {
        const data = JSON.parse(readFileSync(alertsFile, 'utf-8'));
        this.alerts = data.map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) }));
      }
    } catch (error) {
      console.warn('Failed to load existing metrics data:', error);
    }
  }

  /**
   * Record a test execution
   */
  recordTestExecution(execution: Omit<TestExecution, 'id' | 'timestamp'>): void {
    const testExecution: TestExecution = {
      ...execution,
      id: this.generateId(),
      timestamp: new Date()
    };

    this.executions.push(testExecution);
    this.cleanupOldExecutions();
    this.saveExecutions();
    this.checkForAlerts(testExecution);
  }

  /**
   * Record coverage metrics
   */
  recordCoverageMetrics(coverage: Omit<CoverageMetrics, 'timestamp'>): void {
    const metrics: CoverageMetrics = {
      ...coverage,
      timestamp: new Date()
    };

    const coverageFile = join(this.metricsDir, DIRECTORY_PATHS.COVERAGE, `${this.getDateString()}.json`);
    this.appendToFile(coverageFile, metrics);

    // Check for coverage alerts
    if (coverage.percentage < this.config.alertThresholds.coverageMinimum) {
      this.createAlert({
        severity: 'warning',
        type: 'coverage_drop',
        message: `Code coverage dropped to ${coverage.percentage}% (below ${this.config.alertThresholds.coverageMinimum}% threshold)`,
        details: { coverage: coverage.percentage, threshold: this.config.alertThresholds.coverageMinimum }
      });
    }
  }

  /**
   * Record performance metrics
   */
  recordPerformanceMetrics(performance: Omit<PerformanceMetrics, 'timestamp'>): void {
    const metrics: PerformanceMetrics = {
      ...performance,
      timestamp: new Date()
    };

    const performanceFile = join(this.metricsDir, 'performance', `${this.getDateString()}.json`);
    this.appendToFile(performanceFile, metrics);

    // Check for performance regression
    if (performance.regressionScore < -this.config.alertThresholds.performanceRegressionThreshold / 100) {
      this.createAlert({
        severity: 'error',
        type: 'performance_regression',
        message: `Performance regression detected in ${performance.operation}: ${Math.abs(performance.regressionScore * 100).toFixed(1)}% degradation`,
        details: { 
          operation: performance.operation, 
          regressionScore: performance.regressionScore,
          duration: performance.duration 
        }
      });
    }
  }

  /**
   * Calculate and record health metrics
   */
  calculateHealthMetrics(): TestHealthMetrics {
    const recentExecutions = this.getRecentExecutions(24); // Last 24 hours
    const totalTests = recentExecutions.length;
    const passedTests = recentExecutions.filter(e => e.status === 'passed').length;
    const failedTests = recentExecutions.filter(e => e.status === 'failed').length;
    const skippedTests = recentExecutions.filter(e => e.status === 'skipped').length;

    const flakyTests = this.identifyFlakyTests(recentExecutions);
    const slowTests = this.identifySlowTests(recentExecutions);

    // Calculate scores
    const coverageScore = this.getLatestCoverageScore();
    const performanceScore = this.getLatestPerformanceScore();
    const reliabilityScore = this.calculateReliabilityScore(flakyTests.length, totalTests);
    const overallHealthScore = this.calculateOverallHealthScore(
      coverageScore,
      performanceScore,
      reliabilityScore,
      totalTests > 0 ? (passedTests / totalTests) * 100 : 0
    );

    const healthMetrics: TestHealthMetrics = {
      timestamp: new Date(),
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      flakyTests: flakyTests.map(t => t.name),
      slowTests: slowTests.map(t => ({ name: t.name, avgDuration: t.avgDuration })),
      coverageScore,
      performanceScore,
      reliabilityScore,
      overallHealthScore
    };

    const healthFile = join(this.metricsDir, 'health', `${this.getDateString()}.json`);
    this.appendToFile(healthFile, healthMetrics);

    return healthMetrics;
  }

  /**
   * Generate test trends for dashboard visualization
   */
  generateTestTrends(period: 'daily' | 'weekly' | 'monthly' = 'daily'): TestTrend {
    const days = period === 'daily' ? 7 : period === 'weekly' ? 30 : 90;
    const executions = this.getRecentExecutions(days * 24);
    
    const trends: TestTrend = {
      period,
      metrics: {
        executionTime: this.calculateExecutionTimeTrend(executions, days),
        successRate: this.calculateSuccessRateTrend(executions, days),
        coverage: this.calculateCoverageTrend(days),
        performance: this.calculatePerformanceTrend(days),
        reliability: this.calculateReliabilityTrend(executions, days)
      },
      alerts: this.getActiveAlerts()
    };

    const trendsFile = join(this.metricsDir, `trends-${period}.json`);
    writeFileSync(trendsFile, JSON.stringify(trends, null, 2));

    return trends;
  }

  /**
   * Generate comprehensive dashboard data
   */
  generateDashboardData(): {
    health: TestHealthMetrics;
    trends: TestTrend;
    coverage: CoverageMetrics[];
    performance: PerformanceMetrics[];
    alerts: TestAlert[];
    summary: {
      testsToday: number;
      successRateToday: number;
      avgExecutionTime: number;
      criticalAlerts: number;
    };
  } {
    const health = this.calculateHealthMetrics();
    const trends = this.generateTestTrends('daily');
    const todayExecutions = this.getRecentExecutions(24);
    
    return {
      health,
      trends,
      coverage: this.getLatestCoverageMetrics(),
      performance: this.getLatestPerformanceMetrics(),
      alerts: this.getActiveAlerts(),
      summary: {
        testsToday: todayExecutions.length,
        successRateToday: todayExecutions.length > 0 
          ? (todayExecutions.filter(e => e.status === 'passed').length / todayExecutions.length) * 100 
          : 0,
        avgExecutionTime: todayExecutions.length > 0 
          ? todayExecutions.reduce((sum, e) => sum + e.duration, 0) / todayExecutions.length 
          : 0,
        criticalAlerts: this.alerts.filter(a => !a.acknowledged && (a.severity === 'error' || a.severity === 'critical')).length
      }
    };
  }

  /**
   * Export metrics for external systems (Grafana, DataDog, etc.)
   */
  exportMetrics(format: 'prometheus' | 'json' | 'csv'): string {
    const dashboardData = this.generateDashboardData();
    
    switch (format) {
      case 'prometheus':
        return this.exportPrometheusMetrics(dashboardData);
      case 'csv':
        return this.exportCSVMetrics(dashboardData);
      case 'json':
      default:
        return JSON.stringify(dashboardData, null, 2);
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDateString(): string {
    return new Date().toISOString().split('T')[0];
  }

  private saveExecutions(): void {
    const executionsFile = join(this.metricsDir, 'executions', 'latest.json');
    writeFileSync(executionsFile, JSON.stringify(this.executions, null, 2));
  }

  private appendToFile(filePath: string, data: any): void {
    let existingData: any[] = [];
    if (existsSync(filePath)) {
      try {
        existingData = JSON.parse(readFileSync(filePath, 'utf-8'));
        if (!Array.isArray(existingData)) {
          existingData = [existingData];
        }
      } catch (error) {
        console.warn(`Failed to read existing data from ${filePath}:`, error);
      }
    }
    
    existingData.push(data);
    writeFileSync(filePath, JSON.stringify(existingData, null, 2));
  }

  private cleanupOldExecutions(): void {
    const cutoff = Date.now() - (this.config.metricsRetentionDays * 24 * 60 * 60 * 1000);
    this.executions = this.executions.filter(e => e.timestamp.getTime() > cutoff);
  }

  private getRecentExecutions(hours: number): TestExecution[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.executions.filter(e => e.timestamp.getTime() > cutoff);
  }

  private checkForAlerts(execution: TestExecution): void {
    // Check for build failures
    if (execution.status === 'failed' && execution.type === 'integration') {
      this.createAlert({
        severity: 'error',
        type: 'build_failure',
        message: `Integration test failed: ${execution.testName}`,
        details: { suite: execution.suite, error: execution.error }
      });
    }

    // Check for failure rate threshold
    const recentExecutions = this.getRecentExecutions(1); // Last hour
    if (recentExecutions.length >= 10) {
      const failureRate = (recentExecutions.filter(e => e.status === 'failed').length / recentExecutions.length) * 100;
      if (failureRate > this.config.alertThresholds.failureRateThreshold) {
        this.createAlert({
          severity: 'warning',
          type: 'reliability_decline',
          message: `High failure rate detected: ${failureRate.toFixed(1)}%`,
          details: { failureRate, threshold: this.config.alertThresholds.failureRateThreshold }
        });
      }
    }
  }

  private createAlert(alert: Omit<TestAlert, 'id' | 'timestamp' | 'acknowledged'>): void {
    const newAlert: TestAlert = {
      ...alert,
      id: this.generateId(),
      timestamp: new Date(),
      acknowledged: false
    };

    this.alerts.push(newAlert);
    this.saveAlerts();
  }

  private saveAlerts(): void {
    const alertsFile = join(this.metricsDir, 'alerts', 'active.json');
    const activeAlerts = this.alerts.filter(a => !a.acknowledged);
    writeFileSync(alertsFile, JSON.stringify(activeAlerts, null, 2));
  }

  private getActiveAlerts(): TestAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }

  private identifyFlakyTests(executions: TestExecution[]): Array<{ name: string; failures: number; total: number }> {
    const testStats = new Map<string, { failures: number; total: number }>();
    
    executions.forEach(e => {
      const key = `${e.suite}:${e.testName}`;
      const stats = testStats.get(key) || { failures: 0, total: 0 };
      stats.total++;
      if (e.status === 'failed') stats.failures++;
      testStats.set(key, stats);
    });

    const flakyTests: Array<{ name: string; failures: number; total: number }> = [];
    testStats.forEach((stats, name) => {
      if (stats.total >= 5 && (stats.failures / stats.total) > 0.1 && (stats.failures / stats.total) < 0.9) {
        flakyTests.push({ name, ...stats });
      }
    });

    return flakyTests.sort((a, b) => (b.failures / b.total) - (a.failures / a.total));
  }

  private identifySlowTests(executions: TestExecution[]): Array<{ name: string; avgDuration: number }> {
    const testDurations = new Map<string, number[]>();
    
    executions.forEach(e => {
      const key = `${e.suite}:${e.testName}`;
      const durations = testDurations.get(key) || [];
      durations.push(e.duration);
      testDurations.set(key, durations);
    });

    const slowTests: Array<{ name: string; avgDuration: number }> = [];
    testDurations.forEach((durations, name) => {
      const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
      if (avgDuration > 5000) { // Tests taking more than 5 seconds
        slowTests.push({ name, avgDuration });
      }
    });

    return slowTests.sort((a, b) => b.avgDuration - a.avgDuration).slice(0, 10);
  }

  private getLatestCoverageScore(): number {
    try {
      const today = this.getDateString();
      const coverageFile = join(this.metricsDir, DIRECTORY_PATHS.COVERAGE, `${today}.json`);
      if (existsSync(coverageFile)) {
        const data = JSON.parse(readFileSync(coverageFile, 'utf-8'));
        const latestCoverage = Array.isArray(data) ? data[data.length - 1] : data;
        return latestCoverage.percentage || 0;
      }
    } catch (error) {
      console.warn('Failed to get latest coverage score:', error);
    }
    return STATUS_CODES.SUCCESS;
  }

  private getLatestPerformanceScore(): number {
    try {
      const today = this.getDateString();
      const performanceFile = join(this.metricsDir, 'performance', `${today}.json`);
      if (existsSync(performanceFile)) {
        const data = JSON.parse(readFileSync(performanceFile, 'utf-8'));
        const performances = Array.isArray(data) ? data : [data];
        const avgRegressionScore = performances.reduce((sum, p) => sum + (p.regressionScore || 0), 0) / performances.length;
        return Math.max(0, (1 + avgRegressionScore) * 100); // Convert to 0-100 scale
      }
    } catch (error) {
      console.warn('Failed to get latest performance score:', error);
    }
    return 100; // Default to good performance
  }

  private calculateReliabilityScore(flakyTestCount: number, totalTests: number): number {
    if (totalTests === 0) return 100;
    const flakyRate = flakyTestCount / totalTests;
    return Math.max(0, (1 - flakyRate) * 100);
  }

  private calculateOverallHealthScore(coverage: number, performance: number, reliability: number, successRate: number): number {
    // Weighted average of different health factors
    return Math.round(
      (coverage * 0.25) + 
      (performance * 0.25) + 
      (reliability * 0.25) + 
      (successRate * 0.25)
    );
  }

  // Trend calculation methods
  private calculateExecutionTimeTrend(executions: TestExecution[], days: number): Array<{ date: string; value: number }> {
    const dailyTimes = new Map<string, number[]>();
    
    executions.forEach(e => {
      const date = e.timestamp.toISOString().split('T')[0];
      const times = dailyTimes.get(date) || [];
      times.push(e.duration);
      dailyTimes.set(date, times);
    });

    const trend: Array<{ date: string; value: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const times = dailyTimes.get(dateStr) || [];
      const avgTime = times.length > 0 ? times.reduce((sum, t) => sum + t, 0) / times.length : 0;
      
      trend.push({ date: dateStr, value: avgTime });
    }

    return trend;
  }

  private calculateSuccessRateTrend(executions: TestExecution[], days: number): Array<{ date: string; value: number }> {
    const dailyResults = new Map<string, { passed: number; total: number }>();
    
    executions.forEach(e => {
      const date = e.timestamp.toISOString().split('T')[0];
      const results = dailyResults.get(date) || { passed: 0, total: 0 };
      results.total++;
      if (e.status === 'passed') results.passed++;
      dailyResults.set(date, results);
    });

    const trend: Array<{ date: string; value: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const results = dailyResults.get(dateStr) || { passed: 0, total: 0 };
      const successRate = results.total > 0 ? (results.passed / results.total) * 100 : 0;
      
      trend.push({ date: dateStr, value: successRate });
    }

    return trend;
  }

  private calculateCoverageTrend(days: number): Array<{ date: string; value: number }> {
    const trend: Array<{ date: string; value: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const coverageFile = join(this.metricsDir, DIRECTORY_PATHS.COVERAGE, `${dateStr}.json`);
        let coverage = 0;
        
        if (existsSync(coverageFile)) {
          const data = JSON.parse(readFileSync(coverageFile, 'utf-8'));
          const latestCoverage = Array.isArray(data) ? data[data.length - 1] : data;
          coverage = latestCoverage.percentage || 0;
        }
        
        trend.push({ date: dateStr, value: coverage });
      } catch (error) {
        trend.push({ date: dateStr, value: 0 });
      }
    }

    return trend;
  }

  private calculatePerformanceTrend(days: number): Array<{ date: string; value: number }> {
    const trend: Array<{ date: string; value: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      try {
        const performanceFile = join(this.metricsDir, 'performance', `${dateStr}.json`);
        let performanceScore = 100;
        
        if (existsSync(performanceFile)) {
          const data = JSON.parse(readFileSync(performanceFile, 'utf-8'));
          const performances = Array.isArray(data) ? data : [data];
          const avgRegressionScore = performances.reduce((sum, p) => sum + (p.regressionScore || 0), 0) / performances.length;
          performanceScore = Math.max(0, (1 + avgRegressionScore) * 100);
        }
        
        trend.push({ date: dateStr, value: performanceScore });
      } catch (error) {
        trend.push({ date: dateStr, value: 100 });
      }
    }

    return trend;
  }

  private calculateReliabilityTrend(executions: TestExecution[], days: number): Array<{ date: string; value: number }> {
    const trend: Array<{ date: string; value: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayExecutions = executions.filter(e => e.timestamp.toISOString().split('T')[0] === dateStr);
      const flakyTests = this.identifyFlakyTests(dayExecutions);
      const reliabilityScore = this.calculateReliabilityScore(flakyTests.length, dayExecutions.length);
      
      trend.push({ date: dateStr, value: reliabilityScore });
    }

    return trend;
  }

  private getLatestCoverageMetrics(): CoverageMetrics[] {
    try {
      const today = this.getDateString();
      const coverageFile = join(this.metricsDir, DIRECTORY_PATHS.COVERAGE, `${today}.json`);
      if (existsSync(coverageFile)) {
        const data = JSON.parse(readFileSync(coverageFile, 'utf-8'));
        return Array.isArray(data) ? data : [data];
      }
    } catch (error) {
      console.warn('Failed to get coverage metrics:', error);
    }
    return [];
  }

  private getLatestPerformanceMetrics(): PerformanceMetrics[] {
    try {
      const today = this.getDateString();
      const performanceFile = join(this.metricsDir, 'performance', `${today}.json`);
      if (existsSync(performanceFile)) {
        const data = JSON.parse(readFileSync(performanceFile, 'utf-8'));
        return Array.isArray(data) ? data : [data];
      }
    } catch (error) {
      console.warn('Failed to get performance metrics:', error);
    }
    return [];
  }

  private exportPrometheusMetrics(data: any): string {
    let output = '';
    
    // Test execution metrics
    output += `# HELP test_executions_total Total number of test executions\n`;
    output += `# TYPE test_executions_total counter\n`;
    output += `test_executions_total ${data.summary.testsToday}\n\n`;
    
    // Success rate
    output += `# HELP test_success_rate Test success rate percentage\n`;
    output += `# TYPE test_success_rate gauge\n`;
    output += `test_success_rate ${data.summary.successRateToday}\n\n`;
    
    // Coverage
    output += `# HELP test_coverage_percentage Code coverage percentage\n`;
    output += `# TYPE test_coverage_percentage gauge\n`;
    output += `test_coverage_percentage ${data.health.coverageScore}\n\n`;
    
    // Health score
    output += `# HELP test_health_score Overall test health score\n`;
    output += `# TYPE test_health_score gauge\n`;
    output += `test_health_score ${data.health.overallHealthScore}\n\n`;
    
    // Active alerts
    output += `# HELP test_active_alerts Number of active test alerts\n`;
    output += `# TYPE test_active_alerts gauge\n`;
    output += `test_active_alerts ${data.alerts.length}\n\n`;
    
    return output;
  }

  private exportCSVMetrics(data: any): string {
    const csvLines = [
      'timestamp,metric_type,metric_name,value',
      `${new Date().toISOString()},summary,tests_today,${data.summary.testsToday}`,
      `${new Date().toISOString()},summary,success_rate_today,${data.summary.successRateToday}`,
      `${new Date().toISOString()},summary,avg_execution_time,${data.summary.avgExecutionTime}`,
      `${new Date().toISOString()},health,coverage_score,${data.health.coverageScore}`,
      `${new Date().toISOString()},health,performance_score,${data.health.performanceScore}`,
      `${new Date().toISOString()},health,reliability_score,${data.health.reliabilityScore}`,
      `${new Date().toISOString()},health,overall_health_score,${data.health.overallHealthScore}`,
      `${new Date().toISOString()},alerts,active_alerts,${data.alerts.length}`
    ];
    
    return csvLines.join('\n');
  }
}

// Export singleton instance
export const testingMetrics = new TestingMetricsCollector();
