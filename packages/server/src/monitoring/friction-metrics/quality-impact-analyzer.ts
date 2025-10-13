/**
}
import { STATUS_CODES } from '@shared/constants/magic-numbers';
/**
}
import { DB_FIELDS } from '../../../constants/database-fields';
/**
 * Quality impact analyzer for development friction monitoring
 * Tracks how code quality issues affect development velocity and team productivity
 */

import {
  QualityImpactMetrics,
  FrictionIndicators,
  FrictionConfig,
  DevelopmentEvent,
  FrictionAlert,
  SeverityLevel
} from './types';
import { CodeMetrics } from '../../utils/codeMetrics/types';

export class QualityImpactAnalyzer {
  private config: FrictionConfig;
  private qualityHistory: CodeMetrics[] = [];
  private events: DevelopmentEvent[] = [];
  private alerts: FrictionAlert[] = [];

  constructor(config: FrictionConfig) {
    this.config = config;
  }

  /**
   * Analyze quality impact on development velocity
   */
  async analyzeQualityImpact(codeMetrics: CodeMetrics[]): Promise<QualityImpactMetrics> {
    this.qualityHistory = codeMetrics;

    const period = this.calculateAnalysisPeriod();

    // Parallel analysis for better performance
    const [
      refactoringMetrics,
      bugFixMetrics,
      technicalDebtMetrics,
      reviewEfficiencyMetrics
    ] = await Promise.all([
      this.analyzeRefactoringImpact(period),
      this.analyzeBugFixImpact(period),
      this.analyzeTechnicalDebtImpact(period),
      this.analyzeReviewEfficiencyImpact(period)
    ]);

    return {
      refactoringTime: refactoringMetrics,
      bugFixRate: bugFixMetrics,
      technicalDebt: technicalDebtMetrics,
      codeReviewEfficiency: reviewEfficiencyMetrics
    };
  }

  /**
   * Analyze refactoring time impact
   */
  private async analyzeRefactoringImpact(period: { start: Date; end: Date }) {
    // Analyze code smells that require refactoring
    const refactoringSmells = this.qualityHistory.flatMap(metrics =>
      metrics.smells.filter(smell =>
        smell.type === 'LongMethod' ||
        smell.type === 'LargeClass' ||
        smell.type === 'DuplicatedCode' ||
        smell.type === 'ServiceExtractionNeeded'
      )
    );

    // Estimate refactoring time based on smell severity and count
    const totalRefactoringTime = refactoringSmells.reduce((total, smell) => {
      const timeMultiplier = this.getRefactoringTimeMultiplier(smell.severity);
      return total + (timeMultiplier * 2); // Assume 2 hours base per smell
    }, 0);

    const totalDevTime = period.end.getTime() - period.start.getTime();
    const refactoringPercentage = totalDevTime > 0 ? (totalRefactoringTime / totalDevTime) * 100 : 0;

    // Calculate trend based on historical data
    const trend = this.calculateRefactoringTrend(refactoringPercentage);

    // Generate alerts if refactoring time is too high
    if (refactoringPercentage > this.config.thresholds.quality.maxRefactoringTime) {
      this.generateRefactoringAlert(refactoringPercentage);
    }

    return {
      total: totalRefactoringTime,
      percentage: refactoringPercentage,
      trend
    };
  }

  /**
   * Analyze bug fix rate impact
   */
  private async analyzeBugFixImpact(period: { start: Date; end: Date }) {
    // Look for critical and high severity smells that often indicate bugs
    const criticalSmells = this.qualityHistory.flatMap(metrics =>
      metrics.smells.filter(smell => smell.severity === 'critical' || smell.severity === 'high')
    );

    // Estimate bug fix rate based on critical issues
    const totalLines = this.qualityHistory.reduce((sum, metrics) => sum + metrics.metadata.linesOfCode, 0);
    const bugFixRate = totalLines > 0 ? (criticalSmells.length / totalLines) * 1000 : 0; // bugs per 1000 lines

    const trend = this.calculateBugFixTrend(bugFixRate);

    // Generate alerts if bug fix rate is too high
    if (bugFixRate > this.config.thresholds.quality.maxBugFixRate) {
      this.generateBugFixAlert(bugFixRate);
    }

    return {
      count: criticalSmells.length,
      rate: bugFixRate,
      trend
    };
  }

  /**
   * Analyze technical debt impact
   */
  private async analyzeTechnicalDebtImpact(period: { start: Date; end: Date }) {
    // Analyze legacy patterns and service extraction issues
    const legacyPatterns = this.qualityHistory.flatMap(metrics =>
      metrics.smells.filter(smell =>
        smell.type === 'LegacyPattern' ||
        smell.type === 'ServiceExtractionNeeded'
      )
    );

    const currentDebt = legacyPatterns.length;
    const previousSnapshot = this.getPreviousSnapshot();

    let debtChange = 0;
    if (previousSnapshot) {
      const previousDebt = previousSnapshot.smells.filter(smell =>
        smell.type === 'LegacyPattern' ||
        smell.type === 'ServiceExtractionNeeded'
      ).length;
      debtChange = currentDebt - previousDebt;
    }

    const debtRatio = debtChange !== 0 ? (debtChange / Math.abs(debtChange)) * (currentDebt / 100) : 0;
    const trend = this.calculateDebtTrend(debtRatio);

    // Generate alerts if technical debt ratio is concerning
    if (debtRatio > this.config.thresholds.quality.maxTechnicalDebtRatio) {
      this.generateTechnicalDebtAlert(debtRatio);
    }

    return {
      accumulation: debtChange > 0 ? debtChange : 0,
      reduction: debtChange < 0 ? Math.abs(debtChange) : 0,
      ratio: debtRatio,
      trend
    };
  }

  /**
   * Analyze code review efficiency impact
   */
  private async analyzeReviewEfficiencyImpact(period: { start: Date; end: Date }) {
    // Analyze review-related friction indicators
    const reviewComplexity = this.qualityHistory.flatMap(metrics =>
      metrics.smells.filter(smell =>
        smell.type === 'HighCoupling' ||
        smell.type === 'LongMethod' ||
        smell.type === 'LargeClass'
      )
    );

    // Estimate review time based on complexity
    const averageReviewTime = reviewComplexity.reduce((total, smell) => {
      const complexityMultiplier = this.getComplexityReviewMultiplier(smell.severity);
      return total + (complexityMultiplier * 0.5); // Assume 30 minutes base per complex smell
    }, 0);

    const averageComments = Math.max(1, reviewComplexity.length * 0.3); // Estimate comments
    const trend = this.calculateReviewEfficiencyTrend(averageReviewTime);

    return {
      averageReviewTime,
      averageComments,
      trend
    };
  }

  /**
   * Track friction indicators specific to project issues
   */
  async trackFrictionIndicators(): Promise<FrictionIndicators> {
    const period = this.calculateAnalysisPeriod();

    return {
      idConsistencyFriction: await this.trackIdConsistencyFriction(period),
      consoleLoggingOverhead: await this.trackLoggingOverhead(period),
      legacyPatternMaintenance: await this.trackLegacyPatternMaintenance(period),
      serviceExtractionBottlenecks: await this.trackServiceExtractionBottlenecks(period)
    };
  }

  /**
   * Track ID consistency friction (ObjectId vs UUID issues)
   */
  private async trackIdConsistencyFriction(period: { start: Date; end: Date }) {
    const idConsistencyIssues = this.qualityHistory.flatMap(metrics =>
      metrics.smells.filter(smell => smell.type === 'CriticalIdViolation')
    );

    const timeLost = idConsistencyIssues.length * 4; // Estimate 4 hours lost per ID issue
    const trend = this.calculateFrictionTrend(idConsistencyIssues.length);

    return {
      timeLost,
      occurrences: idConsistencyIssues.length,
      severity: this.getSeverityLevel(idConsistencyIssues.length),
      trend
    };
  }

  /**
   * Track console logging overhead
   */
  private async trackLoggingOverhead(period: { start: Date; end: Date }) {
    const loggingIssues = this.qualityHistory.flatMap(metrics =>
      metrics.smells.filter(smell => smell.type === 'ExcessiveLogging')
    );

    const developmentSlowdown = loggingIssues.length * 2; // Estimate 2 hours lost per logging issue
    const cleanupTime = loggingIssues.length * 1; // Estimate 1 hour cleanup per issue
    const trend = this.calculateFrictionTrend(loggingIssues.length);

    return {
      developmentSlowdown,
      cleanupTime,
      occurrences: loggingIssues.length,
      trend
    };
  }

  /**
   * Track legacy pattern maintenance burden
   */
  private async trackLegacyPatternMaintenance(period: { start: Date; end: Date }) {
    const legacyIssues = this.qualityHistory.flatMap(metrics =>
      metrics.smells.filter(smell => smell.type === 'LegacyPattern')
    );

    const burden = legacyIssues.length * 3; // Estimate 3 hours maintenance per legacy issue
    const migrationProgress = Math.max(0, 100 - (legacyIssues.length / 10)); // Estimate progress
    const supportCost = burden * 50; // Estimate $50/hour support cost
    const trend = this.calculateFrictionTrend(legacyIssues.length);

    return {
      burden,
      migrationProgress,
      supportCost,
      trend
    };
  }

  /**
   * Track service extraction bottlenecks
   */
  private async trackServiceExtractionBottlenecks(period: { start: Date; end: Date }) {
    const extractionIssues = this.qualityHistory.flatMap(metrics =>
      metrics.smells.filter(smell => smell.type === 'ServiceExtractionNeeded')
    );

    const delays = extractionIssues.length * 8; // Estimate 8 hours delay per extraction issue
    const complexity = Math.min(100, extractionIssues.length * 10); // Scale complexity
    const refactoringTime = delays * 0.5; // Estimate refactoring time
    const trend = this.calculateFrictionTrend(extractionIssues.length);

    return {
      delays,
      complexity,
      refactoringTime,
      trend
    };
  }

  /**
   * Record development events for correlation analysis
   */
  recordDevelopmentEvent(event: Omit<DevelopmentEvent, DB_FIELDS.BUILDINGS.ID>): void {
    const fullEvent: DevelopmentEvent = {
      ...event,
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.events.push(fullEvent);

    // Generate alerts for significant events
    if (event.type === 'code_smell_introduced' || event.type === 'bottleneck_resolved') {
      this.generateEventBasedAlert(fullEvent);
    }
  }

  /**
   * Get friction alerts
   */
  getActiveAlerts(): FrictionAlert[] {
    const now = new Date();
    return this.alerts.filter(alert => !alert.expiresAt || alert.expiresAt > now);
  }

  /**
   * Calculate overall quality impact score
   */
  calculateQualityImpactScore(qualityImpact: QualityImpactMetrics): number {
    const refactoringScore = Math.max(0, 100 - (qualityImpact.refactoringTime.percentage * 2));
    const bugFixScore = Math.max(0, 100 - (qualityImpact.bugFixRate.rate * 10));
    const debtScore = Math.max(0, 100 - (Math.abs(qualityImpact.technicalDebt.ratio) * 100));
    const reviewScore = Math.max(0, 100 - (qualityImpact.codeReviewEfficiency.averageReviewTime * 5));

    return Math.round((refactoringScore + bugFixScore + debtScore + reviewScore) / 4);
  }

  /**
   * Helper methods
   */
  private calculateAnalysisPeriod(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
    return { start, end };
  }

  private getPreviousSnapshot(): CodeMetrics | null {
    return this.qualityHistory.length > 1 ? this.qualityHistory[this.qualityHistory.length - 2] : null;
  }

  private getRefactoringTimeMultiplier(severity: SeverityLevel): number {
    switch (severity) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return STATUS_CODES.ERROR;
      default: return STATUS_CODES.ERROR;
    }
  }

  private getComplexityReviewMultiplier(severity: SeverityLevel): number {
    switch (severity) {
      case 'critical': return 3;
      case 'high': return 2.5;
      case 'medium': return 2;
      case 'low': return STATUS_CODES.ERROR;
      default: return STATUS_CODES.ERROR;
    }
  }

  private calculateRefactoringTrend(percentage: number): 'increasing' | 'decreasing' | 'stable' {
    return this.calculateFrictionTrend(percentage);
  }

  private calculateBugFixTrend(rate: number): 'increasing' | 'decreasing' | 'stable' {
    return this.calculateFrictionTrend(rate);
  }

  private calculateDebtTrend(ratio: number): 'increasing' | 'decreasing' | 'stable' {
    return this.calculateFrictionTrend(Math.abs(ratio));
  }

  private calculateReviewEfficiencyTrend(averageTime: number): 'improving' | 'degrading' | 'stable' {
    if (averageTime < 2) return 'improving';
    if (averageTime > 4) return 'degrading';
    return 'stable';
  }

  private calculateFrictionTrend(value: number): 'increasing' | 'decreasing' | 'stable' {
    if (value > 10) return 'increasing';
    if (value < 2) return 'decreasing';
    return 'stable';
  }

  private getSeverityLevel(count: number): SeverityLevel {
    if (count > 10) return 'critical';
    if (count > 5) return 'high';
    if (count > 2) return 'medium';
    return 'low';
  }

  private generateRefactoringAlert(percentage: number): void {
    this.alerts.push({
      id: `alert_refactoring_${Date.now()}`,
      type: 'quality_degradation',
      severity: percentage > 50 ? 'critical' : percentage > 25 ? 'high' : 'medium',
      message: `Refactoring time (${percentage.toFixed(1)}%) exceeds healthy threshold (${this.config.thresholds.quality.maxRefactoringTime}%)`,
      metric: 'refactoring_percentage',
      currentValue: percentage,
      threshold: this.config.thresholds.quality.maxRefactoringTime,
      trend: 'increasing',
      recommendations: [
        'Prioritize automated refactoring tools',
        'Schedule dedicated refactoring sprints',
        'Consider code modernization initiatives'
      ],
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
  }

  private generateBugFixAlert(rate: number): void {
    this.alerts.push({
      id: `alert_bugfix_${Date.now()}`,
      type: 'quality_degradation',
      severity: rate > 20 ? 'critical' : rate > 10 ? 'high' : 'medium',
      message: `Bug fix rate (${rate.toFixed(1)} per 1000 lines) indicates quality issues`,
      metric: 'bug_fix_rate',
      currentValue: rate,
      threshold: this.config.thresholds.quality.maxBugFixRate,
      trend: 'increasing',
      recommendations: [
        'Implement automated testing',
        'Conduct code review training',
        'Establish quality gates in CI/CD'
      ],
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  }

  private generateTechnicalDebtAlert(ratio: number): void {
    this.alerts.push({
      id: `alert_debt_${Date.now()}`,
      type: 'quality_degradation',
      severity: ratio > 2 ? 'critical' : ratio > 1 ? 'high' : 'medium',
      message: `Technical debt ratio (${ratio.toFixed(2)}) indicates growing maintenance burden`,
      metric: 'technical_debt_ratio',
      currentValue: ratio,
      threshold: this.config.thresholds.quality.maxTechnicalDebtRatio,
      trend: 'increasing',
      recommendations: [
        'Schedule regular debt reduction sprints',
        'Implement technical debt tracking',
        'Prioritize legacy code migration'
      ],
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
  }

  private generateEventBasedAlert(event: DevelopmentEvent): void {
    this.alerts.push({
      id: `alert_event_${event.id}`,
      type: 'bottleneck_detected',
      severity: 'medium',
      message: `Development event detected: ${event.description}`,
      metric: event.type,
      currentValue: event.impact.velocity,
      threshold: 5, // 5 hour impact threshold
      trend: 'stable',
      recommendations: [
        'Review development process for optimization opportunities',
        'Consider automation for repetitive tasks'
      ],
      timestamp: new Date(),
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours
    });
  }
}