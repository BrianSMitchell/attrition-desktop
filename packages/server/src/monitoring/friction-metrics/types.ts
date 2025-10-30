/**
 * Development friction monitoring types
 * Extends code metrics system to track development velocity and productivity impact
 */

import { CodeMetrics, CodeLocation, SeverityLevel } from '../../utils/codeMetrics/types';

// Core friction metrics interface
export interface FrictionMetrics {
  timestamp: Date;
  period: {
    start: Date;
    end: Date;
    duration: number; // in milliseconds
  };
  velocity: DevelopmentVelocity;
  qualityImpact: QualityImpactMetrics;
  teamProductivity: TeamProductivityMetrics;
  systemPerformance: SystemPerformanceMetrics;
  correlations: FrictionCorrelations;
  predictions: FrictionPredictions;
}

// Development velocity tracking
export interface DevelopmentVelocity {
  prThroughput: {
    count: number;
    target: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  cycleTime: {
    average: number; // in hours
    median: number; // in hours
    target: number; // target in hours (<24)
    trend: 'improving' | 'degrading' | 'stable';
  };
  deploymentFrequency: {
    count: number;
    target: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  featureDeliverySpeed: {
    average: number; // in days
    trend: 'improving' | 'degrading' | 'stable';
  };
}

// Code quality impact on development
export interface QualityImpactMetrics {
  refactoringTime: {
    total: number; // in hours
    percentage: number; // percentage of total dev time
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  bugFixRate: {
    count: number;
    rate: number; // bugs per 1000 lines of code
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  technicalDebt: {
    accumulation: number; // rate of debt increase
    reduction: number; // rate of debt decrease
    ratio: number; // new debt vs. debt reduction
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  codeReviewEfficiency: {
    averageReviewTime: number; // in hours
    averageComments: number;
    trend: 'improving' | 'degrading' | 'stable';
  };
}

// Team productivity measurements
export interface TeamProductivityMetrics {
  onboardingTime: {
    average: number; // in days for new developers
    trend: 'improving' | 'degrading' | 'stable';
  };
  dailyActiveDevelopers: {
    count: number;
    engagement: number; // 0-100 percentage
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  knowledgeSharing: {
    codeReviews: number;
    documentation: number;
    mentorship: number;
    trend: 'improving' | 'degrading' | 'stable';
  };
  issueResolution: {
    averageTime: number; // in hours
    backlogSize: number;
    trend: 'improving' | 'degrading' | 'stable';
  };
}

// System performance indicators
export interface SystemPerformanceMetrics {
  buildTimes: {
    average: number; // in seconds
    trend: 'improving' | 'degrading' | 'stable';
    target: number; // target build time
  };
  testExecution: {
    duration: number; // in seconds
    successRate: number; // percentage
    trend: 'improving' | 'degrading' | 'stable';
  };
  deploymentSuccess: {
    rate: number; // percentage
    rollbackCount: number;
    trend: 'improving' | 'degrading' | 'stable';
  };
  qualityGates: {
    passRate: number; // percentage
    averagePasses: number;
    trend: 'improving' | 'degrading' | 'stable';
  };
}

// Friction-specific indicators
export interface FrictionIndicators {
  idConsistencyFriction: {
    timeLost: number; // estimated hours lost to ID conversion issues
    occurrences: number;
    severity: SeverityLevel;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  consoleLoggingOverhead: {
    developmentSlowdown: number; // estimated productivity impact
    cleanupTime: number; // time spent cleaning up logging
    occurrences: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  legacyPatternMaintenance: {
    burden: number; // estimated maintenance overhead
    migrationProgress: number; // 0-100 percentage complete
    supportCost: number; // estimated support cost
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  serviceExtractionBottlenecks: {
    delays: number; // estimated delay in hours
    complexity: number; // 0-100 complexity score
    refactoringTime: number; // time spent on extraction
    trend: 'increasing' | 'decreasing' | 'stable';
  };
}

// Statistical correlations between quality and velocity
export interface FrictionCorrelations {
  qualityVelocityCorrelation: {
    coefficient: number; // -1 to 1 correlation coefficient
    strength: 'strong' | 'moderate' | 'weak' | 'none';
    significance: number; // p-value
  };
  technicalDebtImpact: {
    correlation: number;
    impact: 'high' | 'medium' | 'low';
    confidence: number; // 0-100 confidence level
  };
  migrationFriction: {
    correlation: number;
    affectedMetrics: string[];
    trend: 'improving' | 'degrading' | 'stable';
  };
  teamLearningCurve: {
    correlation: number;
    onboardingImpact: number;
    complexityEffect: number;
  };
}

// Predictive insights based on current trends
export interface FrictionPredictions {
  developmentVelocity: {
    forecast: number; // predicted velocity in 30 days
    confidence: number; // 0-100 confidence level
    riskFactors: string[];
  };
  qualityTrends: {
    forecast: number; // predicted quality score in 30 days
    confidence: number;
    interventionNeeded: boolean;
  };
  teamProductivity: {
    forecast: number; // predicted productivity in 30 days
    confidence: number;
    bottlenecks: string[];
  };
  frictionAlerts: {
    upcoming: FrictionAlert[];
    severity: 'low' | 'medium' | 'high' | 'critical';
  };
}

// Individual friction alerts
export interface FrictionAlert {
  id: string;
  type: 'velocity_decline' | 'quality_degradation' | 'productivity_drop' | 'bottleneck_detected';
  severity: SeverityLevel;
  message: string;
  location?: CodeLocation;
  metric: string;
  currentValue: number;
  threshold: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  recommendations: string[];
  timestamp: Date;
  expiresAt?: Date;
}

// Git analytics for friction tracking
export interface GitAnalytics {
  prMetrics: {
    size: number; // average PR size in lines
    reviewTime: number; // average review time in hours
    mergeFrequency: number; // PRs merged per day
    churn: number; // code churn percentage
  };
  commitPatterns: {
    frequency: number; // commits per day
    size: number; // average commit size
    authorship: number; // unique contributors
    hotspots: string[]; // files with high change frequency
  };
  branchActivity: {
    activeBranches: number;
    mergeConflicts: number;
    staleBranches: number;
    trend: 'improving' | 'degrading' | 'stable';
  };
}

// CI/CD metrics for friction tracking
export interface CiCdMetrics {
  buildPerformance: {
    successRate: number; // percentage
    averageDuration: number; // in seconds
    failureRate: number; // failures per day
    trend: 'improving' | 'degrading' | 'stable';
  };
  testMetrics: {
    coverage: number; // percentage
    executionTime: number; // in seconds
    flakyTests: number; // count of flaky tests
    trend: 'improving' | 'degrading' | 'stable';
  };
  deploymentMetrics: {
    successRate: number; // percentage
    rollbackRate: number; // rollbacks per deployment
    downtime: number; // minutes of downtime
    trend: 'improving' | 'degrading' | 'stable';
  };
}

// Development event tracking
export interface DevelopmentEvent {
  id: string;
  type: 'code_smell_introduced' | 'refactoring_completed' | 'migration_milestone' | 'quality_gate_passed' | 'bottleneck_resolved';
  timestamp: Date;
  filePath?: string;
  location?: CodeLocation;
  description: string;
  impact: {
    velocity: number; // estimated velocity impact
    quality: number; // estimated quality impact
    productivity: number; // estimated productivity impact
  };
  metadata: Record<string, any>;
}

// Friction monitoring configuration
export interface FrictionConfig {
  collection: {
    interval: number; // collection interval in milliseconds
    retention: number; // data retention in days
    batchSize: number; // batch size for processing
  };
  thresholds: {
    velocity: {
      minPrThroughput: number;
      maxCycleTime: number; // maximum acceptable cycle time in hours
      minDeploymentFrequency: number;
    };
    quality: {
      maxRefactoringTime: number; // max percentage of time on refactoring
      maxBugFixRate: number; // max bugs per 1000 lines
      maxTechnicalDebtRatio: number;
    };
    performance: {
      maxBuildTime: number; // max build time in seconds
      minTestSuccessRate: number; // minimum test success rate percentage
      minDeploymentSuccessRate: number; // minimum deployment success rate
    };
  };
  alerting: {
    enabled: boolean;
    channels: string[]; // notification channels
    cooldown: number; // cooldown period in minutes
  };
}

// Friction analysis results
export interface FrictionAnalysis {
  overall: {
    score: number; // 0-100 friction score (lower is better)
    level: 'low' | 'medium' | 'high' | 'critical';
    trend: 'improving' | 'degrading' | 'stable';
  };
  categories: {
    velocity: FrictionCategoryAnalysis;
    quality: FrictionCategoryAnalysis;
    productivity: FrictionCategoryAnalysis;
    performance: FrictionCategoryAnalysis;
  };
  insights: FrictionInsight[];
  recommendations: FrictionRecommendation[];
}

// Individual category analysis
export interface FrictionCategoryAnalysis {
  score: number; // 0-100 (lower is better)
  trend: 'improving' | 'degrading' | 'stable';
  keyMetrics: Array<{
    name: string;
    value: number;
    target: number;
    status: 'good' | 'warning' | 'critical';
  }>;
  topIssues: string[];
}

// Actionable insights from friction analysis
export interface FrictionInsight {
  id: string;
  type: 'correlation' | 'trend' | 'anomaly' | 'bottleneck';
  category: 'velocity' | 'quality' | 'productivity' | 'performance';
  severity: SeverityLevel;
  title: string;
  description: string;
  evidence: string[];
  impact: {
    estimated: number; // estimated impact on development
    confidence: number; // confidence in the insight
  };
  actionable: boolean;
  recommendations: string[];
}

// Specific recommendations for reducing friction
export interface FrictionRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'velocity' | 'quality' | 'productivity' | 'performance';
  title: string;
  description: string;
  effort: 'low' | 'medium' | 'high'; // estimated implementation effort
  impact: 'low' | 'medium' | 'high'; // expected impact on friction
  timeframe: 'immediate' | 'short' | 'medium' | 'long'; // implementation timeframe
  steps: string[];
  metrics: string[]; // metrics that should improve
}

// Historical friction data for trend analysis
export interface FrictionHistory {
  period: {
    start: Date;
    end: Date;
  };
  snapshots: FrictionMetrics[];
  trends: {
    velocity: Array<{ date: Date; value: number }>;
    quality: Array<{ date: Date; value: number }>;
    productivity: Array<{ date: Date; value: number }>;
    performance: Array<{ date: Date; value: number }>;
  };
  milestones: Array<{
    date: Date;
    event: string;
    impact: string;
  }>;
}

// Re-export types imported from utils/codeMetrics/types for local consumption
export type { CodeLocation, SeverityLevel };
