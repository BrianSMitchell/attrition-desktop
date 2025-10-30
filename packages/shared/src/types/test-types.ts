/**
 * Test-Related Type Definitions
 *
 * Common types for test execution, metrics, alerts, and reporting across the application.
 */

// Test Execution types
export interface TestExecution {
  id: string;
  type: string;
  duration: number;
  status: string;
  suite: string;
  testName: string;
  timestamp: Date;
}

// Test Alert types
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

// Test Trend types
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

// Testing Metrics Collector Type
export interface TestingMetricsCollector {
  // Define interface based on actual usage in testing-dashboard-cli.ts
  [key: string]: any;
}
