import { ENV_VARS } from '@game/shared';

/**
}
import { STATUS_CODES } from '@game/shared';
/**
}
import { DB_FIELDS } from '../../../constants/database-fields';
/**
 * Friction indicators tracking system
 * Monitors specific development friction points that impact team productivity
 */

import {
  FrictionIndicators,
  FrictionConfig,
  DevelopmentEvent,
  CodeLocation
} from './types';
import { CodeMetrics } from '../../utils/codeMetrics/types';

export class FrictionIndicatorsTracker {
  private config: FrictionConfig;
  private codeMetricsHistory: CodeMetrics[] = [];
  private frictionHistory: FrictionIndicators[] = [];
  private events: DevelopmentEvent[] = [];

  constructor(config: FrictionConfig) {
    this.config = config;
  }

  /**
   * Track all friction indicators for current codebase
   */
  async trackFrictionIndicators(codeMetrics: CodeMetrics[]): Promise<FrictionIndicators> {
    this.codeMetricsHistory = codeMetrics;
    const period = this.calculateTrackingPeriod();

    // Parallel tracking for better performance
    const [
      idConsistencyFriction,
      consoleLoggingOverhead,
      legacyPatternMaintenance,
      serviceExtractionBottlenecks
    ] = await Promise.all([
      this.trackIdConsistencyFriction(period),
      this.trackConsoleLoggingOverhead(period),
      this.trackLegacyPatternMaintenance(period),
      this.trackServiceExtractionBottlenecks(period)
    ]);

    const indicators: FrictionIndicators = {
      idConsistencyFriction,
      consoleLoggingOverhead,
      legacyPatternMaintenance,
      serviceExtractionBottlenecks
    };

    this.frictionHistory.push(indicators);

    // Keep only recent history (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    this.frictionHistory = this.frictionHistory.filter(f => {
      const avgTimestamp = new Date((f.idConsistencyFriction.timeLost + f.consoleLoggingOverhead.developmentSlowdown) / 2);
      return avgTimestamp > thirtyDaysAgo;
    });

    return indicators;
  }

  /**
   * Track ID consistency friction (ObjectId vs UUID issues)
   */
  private async trackIdConsistencyFriction(period: { start: Date; end: Date }) {
    const idIssues = this.codeMetricsHistory.flatMap(metrics =>
      metrics.smells.filter(smell =>
        smell.type === 'CriticalIdViolation' ||
        smell.category === 'Project Specific' && smell.description.includes('ObjectId')
      )
    );

    // Analyze ID-related files for conversion patterns
    const filesWithIdIssues = this.codeMetricsHistory.filter(metrics =>
      metrics.smells.some(smell => smell.type === 'CriticalIdViolation')
    );

    // Estimate time lost based on issue frequency and complexity
    const timeLost = this.estimateIdConsistencyTimeLoss(idIssues, filesWithIdIssues);

    // Calculate trend based on historical data
    const trend = this.calculateFrictionTrend(idIssues.length);

    // Determine severity
    const severity = this.determineIdConsistencySeverity(idIssues.length);

    // Record events for significant ID issues
    if (idIssues.length > 0) {
      this.recordFrictionEvent({
          type: 'code_smell_introduced',
          description: `ID consistency issues detected in ${idIssues.length} locations`,
          impact: {
            velocity: timeLost * 0.1, // 10% velocity impact
            quality: 15, // 15 point quality impact
            productivity: timeLost * 0.2 // 20% productivity impact
          },
          metadata: {
            issueCount: idIssues.length,
            affectedFiles: filesWithIdIssues.length,
            frictionType: 'id_consistency'
          }
        });
    }

    return {
      timeLost,
      occurrences: idIssues.length,
      severity,
      trend
    };
  }

  /**
   * Track console logging overhead
   */
  private async trackConsoleLoggingOverhead(period: { start: Date; end: Date }) {
    const loggingIssues = this.codeMetricsHistory.flatMap(metrics =>
      metrics.smells.filter(smell =>
        smell.type === 'ExcessiveLogging' ||
        smell.category === 'Project Specific' && smell.description.includes('console')
      )
    );

    // Estimate development slowdown from excessive logging
    const developmentSlowdown = this.estimateLoggingDevelopmentSlowdown(loggingIssues);

    // Estimate cleanup time for logging issues
    const cleanupTime = this.estimateLoggingCleanupTime(loggingIssues);

    const trend = this.calculateFrictionTrend(loggingIssues.length);

    // Record events for excessive logging
    if (loggingIssues.length > 5) { // Default threshold since projectRules might not exist in config
      this.recordFrictionEvent({
        type: 'code_smell_introduced',
        description: `Excessive console logging detected (${loggingIssues.length} instances)`,
        impact: {
          velocity: developmentSlowdown * 0.05, // 5% velocity impact
          quality: 5, // 5 point quality impact
          productivity: cleanupTime * 0.1 // 10% productivity impact
        },
        metadata: {
          loggingCount: loggingIssues.length,
          frictionType: 'console_logging'
        }
      });
    }

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
    const legacyIssues = this.codeMetricsHistory.flatMap(metrics =>
      metrics.smells.filter(smell => smell.type === 'LegacyPattern')
    );

    // Calculate maintenance burden
    const burden = this.estimateLegacyMaintenanceBurden(legacyIssues);

    // Estimate migration progress (files with vs without legacy patterns)
    const totalFiles = this.codeMetricsHistory.length;
    const filesWithLegacy = new Set(
      this.codeMetricsHistory
        .filter(metrics => metrics.smells.some(smell => smell.type === 'LegacyPattern'))
        .map(metrics => metrics.filePath)
    ).size;

    const migrationProgress = totalFiles > 0 ? ((totalFiles - filesWithLegacy) / totalFiles) * 100 : 100;

    // Estimate support cost
    const supportCost = burden * 50; // $50/hour estimated support cost

    const trend = this.calculateFrictionTrend(legacyIssues.length);

    // Record events for legacy pattern maintenance
    if (legacyIssues.length > 0) {
      this.recordFrictionEvent({
        type: 'migration_milestone',
        description: `Legacy pattern maintenance burden: ${legacyIssues.length} patterns detected`,
        impact: {
          velocity: burden * 0.15, // 15% velocity impact
          quality: 20, // 20 point quality impact
          productivity: burden * 0.25 // 25% productivity impact
        },
        metadata: {
          legacyCount: legacyIssues.length,
          migrationProgress,
          frictionType: 'legacy_patterns'
        }
      });
    }

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
    const extractionIssues = this.codeMetricsHistory.flatMap(metrics =>
      metrics.smells.filter(smell => smell.type === 'ServiceExtractionNeeded')
    );

    // Estimate delays from service extraction issues
    const delays = this.estimateServiceExtractionDelays(extractionIssues);

    // Calculate complexity score based on extraction issues
    const complexity = this.calculateExtractionComplexity(extractionIssues);

    // Estimate refactoring time
    const refactoringTime = delays * 0.5; // Half the delay time for actual refactoring

    const trend = this.calculateFrictionTrend(extractionIssues.length);

    // Record events for service extraction bottlenecks
    if (extractionIssues.length > 0) {
      this.recordFrictionEvent({
        type: 'migration_milestone',
        description: `Service extraction bottlenecks: ${extractionIssues.length} files need refactoring`,
        impact: {
          velocity: delays * 0.2, // 20% velocity impact
          quality: 25, // 25 point quality impact
          productivity: delays * 0.3 // 30% productivity impact
        },
        metadata: {
          extractionCount: extractionIssues.length,
          complexity,
          frictionType: 'service_extraction'
        }
      });
    }

    return {
      delays,
      complexity,
      refactoringTime,
      trend
    };
  }

  /**
   * Estimate time lost to ID consistency issues
   */
  private estimateIdConsistencyTimeLoss(idIssues: any[], filesWithIssues: CodeMetrics[]): number {
    // Base time per issue
    let timeLost = idIssues.length * 4; // 4 hours per ID issue

    // Additional time for files with multiple issues
    timeLost += filesWithIssues.length * 2; // 2 hours per affected file

    // Complexity multiplier based on codebase size
    const codebaseSize = this.codeMetricsHistory.reduce((sum, metrics) => sum + metrics.metadata.linesOfCode, 0);
    if (codebaseSize > 50000) {
      timeLost *= 1.5; // 50% more time for larger codebases
    }

    return timeLost;
  }

  /**
   * Estimate development slowdown from excessive logging
   */
  private estimateLoggingDevelopmentSlowdown(loggingIssues: any[]): number {
    // Base slowdown per logging issue
    const baseSlowdown = loggingIssues.length * 2; // 2 hours per logging issue

    // Additional slowdown for development environment
    const isDevelopment = process.env[ENV_VARS.NODE_ENV] !== 'production';
    const developmentMultiplier = isDevelopment ? 1.2 : 1.0;

    return baseSlowdown * developmentMultiplier;
  }

  /**
   * Estimate cleanup time for logging issues
   */
  private estimateLoggingCleanupTime(loggingIssues: any[]): number {
    // Time to identify and remove inappropriate logging
    return loggingIssues.length * 1; // 1 hour per logging issue cleanup
  }

  /**
   * Estimate legacy pattern maintenance burden
   */
  private estimateLegacyMaintenanceBurden(legacyIssues: any[]): number {
    // Base maintenance time per legacy pattern
    let burden = legacyIssues.length * 3; // 3 hours per legacy pattern

    // Additional burden for patterns in critical paths
    const criticalPatterns = legacyIssues.filter(issue =>
      issue.description.includes('mongoose') ||
      issue.description.includes('ObjectId')
    );

    burden += criticalPatterns.length * 2; // 2 extra hours for critical patterns

    return burden;
  }

  /**
   * Estimate delays from service extraction issues
   */
  private estimateServiceExtractionDelays(extractionIssues: any[]): number {
    // Base delay per extraction issue
    let delays = extractionIssues.length * 8; // 8 hours per extraction issue

    // Additional delays for complex files
    const complexFiles = extractionIssues.filter(issue =>
      issue.additionalData && issue.additionalData.complexity > 70
    );

    delays += complexFiles.length * 4; // 4 extra hours for complex files

    return delays;
  }

  /**
   * Calculate service extraction complexity
   */
  private calculateExtractionComplexity(extractionIssues: any[]): number {
    if (extractionIssues.length === 0) return STATUS_CODES.SUCCESS;

    // Base complexity
    let complexity = extractionIssues.length * 10;

    // Increase complexity for files with mixed concerns
    const highComplexityFiles = extractionIssues.filter(issue =>
      issue.additionalData && issue.additionalData.mixedConcerns > 3
    );

    complexity += highComplexityFiles.length * 15;

    return Math.min(100, complexity);
  }

  /**
   * Determine ID consistency severity
   */
  private determineIdConsistencySeverity(issueCount: number): 'critical' | 'high' | 'medium' | 'low' {
    if (issueCount > 20) return 'critical';
    if (issueCount > 10) return 'high';
    if (issueCount > 5) return 'medium';
    return 'low';
  }

  /**
   * Calculate friction trend based on issue count
   */
  private calculateFrictionTrend(issueCount: number): 'increasing' | 'decreasing' | 'stable' {
    const recentHistory = this.frictionHistory.slice(-5); // Last 5 measurements

    if (recentHistory.length < 2) return 'stable';

    // Compare with recent average
    const recentAverage = recentHistory.reduce((sum, friction) => {
      return sum + friction.idConsistencyFriction.occurrences +
             friction.consoleLoggingOverhead.occurrences +
             friction.legacyPatternMaintenance.burden +
             friction.serviceExtractionBottlenecks.delays;
    }, 0) / recentHistory.length;

    const threshold = recentAverage * 0.1; // 10% threshold for trend detection

    if (issueCount > recentAverage + threshold) return 'increasing';
    if (issueCount < recentAverage - threshold) return 'decreasing';
    return 'stable';
  }

  /**
   * Record friction-related development event
   */
  private recordFrictionEvent(event: Omit<DevelopmentEvent, DB_FIELDS.BUILDINGS.ID | 'timestamp'>): void {
    const fullEvent: DevelopmentEvent = {
      id: `friction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...event,
      timestamp: new Date()
    };

    this.events.push(fullEvent);
  }

  /**
   * Calculate overall friction score (0-100, lower is better)
   */
  calculateOverallFrictionScore(indicators: FrictionIndicators): number {
    const idScore = Math.max(0, 100 - (indicators.idConsistencyFriction.timeLost * 2));
    const loggingScore = Math.max(0, 100 - (indicators.consoleLoggingOverhead.developmentSlowdown * 3));
    const legacyScore = Math.max(0, 100 - (indicators.legacyPatternMaintenance.burden * 1.5));
    const extractionScore = Math.max(0, 100 - (indicators.serviceExtractionBottlenecks.delays * 0.5));

    return Math.round((idScore + loggingScore + legacyScore + extractionScore) / 4);
  }

  /**
   * Get friction health status
   */
  getFrictionHealth(indicators: FrictionIndicators): 'healthy' | 'warning' | 'critical' {
    const score = this.calculateOverallFrictionScore(indicators);

    if (score >= 80) return 'healthy';
    if (score >= 60) return 'warning';
    return 'critical';
  }

  /**
   * Get recent friction events
   */
  getRecentFrictionEvents(hours: number = 24): DevelopmentEvent[] {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.events.filter(event => event.timestamp > cutoffTime);
  }

  /**
   * Get friction trends over time
   */
  getFrictionTrends(): Array<{
    timestamp: Date;
    idConsistency: number;
    loggingOverhead: number;
    legacyMaintenance: number;
    serviceExtraction: number;
  }> {
    return this.frictionHistory.map((indicators, index) => ({
      timestamp: new Date(Date.now() - (this.frictionHistory.length - index) * 24 * 60 * 60 * 1000),
      idConsistency: indicators.idConsistencyFriction.occurrences,
      loggingOverhead: indicators.consoleLoggingOverhead.occurrences,
      legacyMaintenance: indicators.legacyPatternMaintenance.burden,
      serviceExtraction: indicators.serviceExtractionBottlenecks.delays
    }));
  }

  /**
   * Generate friction reduction recommendations
   */
  generateFrictionRecommendations(indicators: FrictionIndicators): string[] {
    const recommendations: string[] = [];

    // ID consistency recommendations
    if (indicators.idConsistencyFriction.severity === 'critical' || indicators.idConsistencyFriction.severity === 'high') {
      recommendations.push(
        'Prioritize UUID migration - schedule dedicated time for ObjectId to UUID conversion'
      );
      recommendations.push(
        'Implement automated ID consistency checks in CI/CD pipeline'
      );
    }

    // Logging overhead recommendations
    if (indicators.consoleLoggingOverhead.developmentSlowdown > 10) {
      recommendations.push(
        'Implement proper logging service to replace console statements'
      );
      recommendations.push(
        'Add ESLint rules to prevent console statements in production code'
      );
    }

    // Legacy pattern recommendations
    if (indicators.legacyPatternMaintenance.burden > 20) {
      recommendations.push(
        'Accelerate Supabase migration - focus on high-impact legacy patterns first'
      );
      recommendations.push(
        'Create migration guide and automated migration scripts'
      );
    }

    // Service extraction recommendations
    if (indicators.serviceExtractionBottlenecks.complexity > 70) {
      recommendations.push(
        'Apply service extraction pattern to reduce mixed concerns in route handlers'
      );
      recommendations.push(
        'Schedule refactoring sprints for complex files with high extraction complexity'
      );
    }

    return recommendations;
  }

  /**
   * Helper method to calculate tracking period
   */
  private calculateTrackingPeriod(): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date(end.getTime() - (24 * 60 * 60 * 1000)); // Last 24 hours
    return { start, end };
  }
}