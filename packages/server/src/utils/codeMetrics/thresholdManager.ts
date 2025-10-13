/**
 * Threshold management system for code quality metrics
 * Evaluates metrics against configurable thresholds and provides actionable feedback
 */

import {
  CodeMetrics,
  ThresholdViolation,
  SeverityLevel,
  MetricsScores,
  ProjectSpecificMetrics,
  SuppressionRule,
  ConfigValidation
} from './types';
import { MetricsConfig } from './types';

/**
 * Threshold management class for evaluating code quality against standards
 */
export class ThresholdManager {
  private config: MetricsConfig;
  private suppressions: SuppressionRule[] = [];

  constructor(config: MetricsConfig) {
    this.config = config;
  }

  /**
   * Evaluate metrics against all configured thresholds
   */
  evaluateMetrics(metrics: CodeMetrics): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];

    // Evaluate core metrics
    violations.push(...this.evaluateCoreThresholds(metrics));

    // Evaluate project-specific thresholds
    violations.push(...this.evaluateProjectThresholds(metrics));

    // Apply suppressions
    const filteredViolations = this.applySuppressions(violations, metrics.filePath);

    return filteredViolations;
  }

  /**
   * Evaluate core metrics against thresholds
   */
  private evaluateCoreThresholds(metrics: CodeMetrics): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];

    // Complexity thresholds
    if (metrics.scores.complexity < this.config.thresholds.complexity.maxPerFunction) {
      violations.push({
        filePath: metrics.filePath,
        metric: 'complexity',
        currentValue: metrics.scores.complexity,
        threshold: this.config.thresholds.complexity.maxPerFunction,
        severity: this.classifyComplexitySeverity(metrics.scores.complexity),
        description: `Cyclomatic complexity score ${metrics.scores.complexity} below expected threshold ${this.config.thresholds.complexity.maxPerFunction}`,
        location: { line: 1, column: 1 }
      });
    }

    // Duplication thresholds
    if (metrics.scores.duplication < this.config.thresholds.duplication.similarityThreshold) {
      violations.push({
        filePath: metrics.filePath,
        metric: 'duplication',
        currentValue: metrics.scores.duplication,
        threshold: this.config.thresholds.duplication.similarityThreshold,
        severity: this.classifyDuplicationSeverity(metrics.scores.duplication),
        description: `Code duplication score ${metrics.scores.duplication}% below acceptable threshold ${this.config.thresholds.duplication.similarityThreshold}%`,
        location: { line: 1, column: 1 }
      });
    }

    // File size thresholds
    if (metrics.metadata.linesOfCode > this.config.thresholds.fileSize.maxLines) {
      violations.push({
        filePath: metrics.filePath,
        metric: 'maintainability',
        currentValue: metrics.metadata.linesOfCode,
        threshold: this.config.thresholds.fileSize.maxLines,
        severity: this.classifyFileSizeSeverity(metrics.metadata.linesOfCode),
        description: `File has ${metrics.metadata.linesOfCode} lines, exceeding maximum of ${this.config.thresholds.fileSize.maxLines}`,
        location: { line: metrics.metadata.linesOfCode, column: 1 }
      });
    }

    // Coupling thresholds
    if (metrics.scores.coupling > this.config.thresholds.coupling.maxDependencies * 10) {
      violations.push({
        filePath: metrics.filePath,
        metric: 'coupling',
        currentValue: metrics.scores.coupling,
        threshold: this.config.thresholds.coupling.maxDependencies * 10,
        severity: this.classifyCouplingSeverity(metrics.scores.coupling),
        description: `High coupling score ${metrics.scores.coupling}% indicates excessive dependencies`,
        location: { line: 1, column: 1 }
      });
    }

    return violations;
  }

  /**
   * Evaluate project-specific metrics against thresholds
   */
  private evaluateProjectThresholds(metrics: CodeMetrics): ThresholdViolation[] {
    const violations: ThresholdViolation[] = [];

    // ID consistency threshold
    if (metrics.projectSpecific.idConsistency < this.config.projectRules.idConsistency.targetScore) {
      violations.push({
        filePath: metrics.filePath,
        metric: 'idConsistency',
        currentValue: metrics.projectSpecific.idConsistency,
        threshold: this.config.projectRules.idConsistency.targetScore,
        severity: this.classifyIdConsistencySeverity(metrics.projectSpecific.idConsistency),
        description: `ID consistency ${metrics.projectSpecific.idConsistency}% below target ${this.config.projectRules.idConsistency.targetScore}%`,
        location: { line: 1, column: 1 }
      });
    }

    // Logging threshold
    if (!this.config.projectRules.logging.allowInDevelopment && metrics.projectSpecific.loggingScore < 80) {
      violations.push({
        filePath: metrics.filePath,
        metric: 'loggingScore',
        currentValue: metrics.projectSpecific.loggingScore,
        threshold: 80,
        severity: this.classifyLoggingSeverity(metrics.projectSpecific.loggingScore),
        description: `Excessive console logging detected (score: ${metrics.projectSpecific.loggingScore}%)`,
        location: { line: 1, column: 1 }
      });
    }

    // Legacy patterns threshold
    if (metrics.projectSpecific.legacyPatterns < 90) {
      violations.push({
        filePath: metrics.filePath,
        metric: 'legacyPatterns',
        currentValue: metrics.projectSpecific.legacyPatterns,
        threshold: 90,
        severity: this.classifyLegacyPatternSeverity(metrics.projectSpecific.legacyPatterns),
        description: `Legacy code patterns detected (score: ${metrics.projectSpecific.legacyPatterns}%)`,
        location: { line: 1, column: 1 }
      });
    }

    // Service extraction threshold
    if (metrics.projectSpecific.serviceExtraction < this.config.projectRules.serviceExtraction.minServiceScore) {
      violations.push({
        filePath: metrics.filePath,
        metric: 'serviceExtraction',
        currentValue: metrics.projectSpecific.serviceExtraction,
        threshold: this.config.projectRules.serviceExtraction.minServiceScore,
        severity: this.classifyServiceExtractionSeverity(metrics.projectSpecific.serviceExtraction),
        description: `Service extraction score ${metrics.projectSpecific.serviceExtraction}% below minimum ${this.config.projectRules.serviceExtraction.minServiceScore}%`,
        location: { line: 1, column: 1 }
      });
    }

    return violations;
  }

  /**
   * Apply suppression rules to filter out allowed violations
   */
  private applySuppressions(violations: ThresholdViolation[], filePath: string): ThresholdViolation[] {
    return violations.filter(violation => {
      return !this.suppressions.some(suppression => {
        const pattern = new RegExp(suppression.pattern.replace(/\*/g, '.*'));
        return pattern.test(filePath) && suppression.rule === violation.metric;
      });
    });
  }

  /**
   * Add a suppression rule for project-specific exceptions
   */
  addSuppression(suppression: SuppressionRule): void {
    this.suppressions.push(suppression);
  }

  /**
   * Remove a suppression rule by ID
   */
  removeSuppression(id: string): boolean {
    const index = this.suppressions.findIndex(s => s.id === id);
    if (index >= 0) {
      this.suppressions.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all active suppression rules
   */
  getSuppressions(): SuppressionRule[] {
    return [...this.suppressions];
  }

  /**
   * Generate recommendations for fixing threshold violations
   */
  generateRecommendations(metrics: CodeMetrics): string[] {
    const recommendations: string[] = [];

    // Core metric recommendations
    if (metrics.scores.complexity < 70) {
      recommendations.push('Consider extracting complex functions into smaller, focused functions');
    }

    if (metrics.scores.duplication < 80) {
      recommendations.push('Extract duplicated code into shared utility functions or services');
    }

    if (metrics.scores.coupling > 60) {
      recommendations.push('Reduce coupling by applying dependency injection or facade patterns');
    }

    // Project-specific recommendations
    if (metrics.projectSpecific.idConsistency < this.config.projectRules.idConsistency.targetScore) {
      recommendations.push(`Migrate from ObjectId to UUID for ${100 - metrics.projectSpecific.idConsistency}% of identifiers`);
    }

    if (metrics.projectSpecific.loggingScore < 80 && !this.config.projectRules.logging.allowInDevelopment) {
      recommendations.push('Replace console statements with proper logging service');
    }

    if (metrics.projectSpecific.legacyPatterns < 90) {
      recommendations.push(`Update legacy patterns for ${this.config.projectRules.legacyPatterns.migrationPhase} migration phase`);
    }

    if (metrics.projectSpecific.serviceExtraction < this.config.projectRules.serviceExtraction.minServiceScore) {
      recommendations.push('Apply service extraction pattern to separate business logic from HTTP concerns');
    }

    return recommendations;
  }

  /**
   * Calculate overall code quality score
   */
  calculateOverallScore(metrics: CodeMetrics): number {
    const weights = {
      overall: 0.2,
      complexity: 0.2,
      duplication: 0.15,
      coupling: 0.15,
      maintainability: 0.1,
      idConsistency: 0.1,
      loggingScore: 0.05,
      legacyPatterns: 0.1,
      serviceExtraction: 0.05
    };

    const score = (
      metrics.scores.overall * weights.overall +
      metrics.scores.complexity * weights.complexity +
      metrics.scores.duplication * weights.duplication +
      metrics.scores.coupling * weights.coupling +
      metrics.scores.maintainability * weights.maintainability +
      metrics.projectSpecific.idConsistency * weights.idConsistency +
      metrics.projectSpecific.loggingScore * weights.loggingScore +
      metrics.projectSpecific.legacyPatterns * weights.legacyPatterns +
      metrics.projectSpecific.serviceExtraction * weights.serviceExtraction
    );

    return Math.round(score);
  }

  /**
   * Get severity classification for violations
   */
  private classifyComplexitySeverity(score: number): SeverityLevel {
    if (score < 30) return 'critical';
    if (score < 50) return 'high';
    if (score < 70) return 'medium';
    return 'low';
  }

  private classifyDuplicationSeverity(score: number): SeverityLevel {
    if (score < 40) return 'critical';
    if (score < 60) return 'high';
    if (score < 80) return 'medium';
    return 'low';
  }

  private classifyFileSizeSeverity(lines: number): SeverityLevel {
    if (lines > this.config.thresholds.fileSize.maxLines * 2) return 'critical';
    if (lines > this.config.thresholds.fileSize.maxLines * 1.5) return 'high';
    if (lines > this.config.thresholds.fileSize.maxLines) return 'medium';
    return 'low';
  }

  private classifyCouplingSeverity(score: number): SeverityLevel {
    if (score > 80) return 'critical';
    if (score > 70) return 'high';
    if (score > 60) return 'medium';
    return 'low';
  }

  private classifyIdConsistencySeverity(score: number): SeverityLevel {
    if (score < 50) return 'critical';
    if (score < this.config.projectRules.idConsistency.targetScore - 20) return 'high';
    if (score < this.config.projectRules.idConsistency.targetScore - 10) return 'medium';
    return 'low';
  }

  private classifyLoggingSeverity(score: number): SeverityLevel {
    if (score < 30) return 'critical';
    if (score < 50) return 'high';
    if (score < 70) return 'medium';
    return 'low';
  }

  private classifyLegacyPatternSeverity(score: number): SeverityLevel {
    if (score < 40) return 'critical';
    if (score < 60) return 'high';
    if (score < 80) return 'medium';
    return 'low';
  }

  private classifyServiceExtractionSeverity(score: number): SeverityLevel {
    if (score < 40) return 'critical';
    if (score < 60) return 'high';
    if (score < 80) return 'medium';
    return 'low';
  }

  /**
   * Validate threshold configuration
   */
  validateThresholds(): ConfigValidation {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    const thresholds = this.config.thresholds;

    // Validate complexity thresholds
    if (thresholds.complexity.maxPerFunction < 1 || thresholds.complexity.maxPerFunction > 50) {
      errors.push('Complexity maxPerFunction must be between 1-50');
    }

    // Validate duplication thresholds
    if (thresholds.duplication.similarityThreshold < 50 || thresholds.duplication.similarityThreshold > 100) {
      errors.push('Duplication similarity threshold must be between 50-100');
    }

    // Validate file size thresholds
    if (thresholds.fileSize.maxLines < 100 || thresholds.fileSize.maxLines > 2000) {
      warnings.push('File size maxLines should typically be between 100-2000');
    }

    // Validate coupling thresholds
    if (thresholds.coupling.maxDependencies < 5 || thresholds.coupling.maxDependencies > 50) {
      warnings.push('Coupling maxDependencies should typically be between 5-50');
    }

    // Validate project rules
    if (this.config.projectRules.idConsistency.targetScore < 0 || this.config.projectRules.idConsistency.targetScore > 100) {
      errors.push('ID consistency target score must be between 0-100');
    }

    if (this.config.projectRules.serviceExtraction.minServiceScore < 0 || this.config.projectRules.serviceExtraction.minServiceScore > 100) {
      errors.push('Service extraction minimum score must be between 0-100');
    }

    // Suggestions
    if (thresholds.complexity.maxPerFunction > 15) {
      suggestions.push('Consider lowering complexity threshold for stricter code quality');
    }

    if (this.config.projectRules.logging.maxConsoleStatements > 10) {
      suggestions.push('Consider reducing max console statements for cleaner logging');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions
    };
  }

  /**
   * Get threshold summary for reporting
   */
  getThresholdSummary(): Record<string, { threshold: number; description: string }> {
    return {
      complexity: {
        threshold: this.config.thresholds.complexity.maxPerFunction,
        description: 'Maximum cyclomatic complexity per function'
      },
      duplication: {
        threshold: this.config.thresholds.duplication.similarityThreshold,
        description: 'Minimum similarity percentage for duplication detection'
      },
      fileSize: {
        threshold: this.config.thresholds.fileSize.maxLines,
        description: 'Maximum lines of code per file'
      },
      coupling: {
        threshold: this.config.thresholds.coupling.maxDependencies,
        description: 'Maximum external dependencies'
      },
      idConsistency: {
        threshold: this.config.projectRules.idConsistency.targetScore,
        description: 'Target UUID consistency percentage'
      },
      logging: {
        threshold: this.config.projectRules.logging.maxConsoleStatements,
        description: 'Maximum console statements per file'
      },
      legacyPatterns: {
        threshold: 90,
        description: 'Minimum score for legacy pattern compliance'
      },
      serviceExtraction: {
        threshold: this.config.projectRules.serviceExtraction.minServiceScore,
        description: 'Minimum service extraction score'
      }
    };
  }

  /**
   * Export current configuration for backup or sharing
   */
  exportConfig(): MetricsConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Import configuration from backup or external source
   */
  importConfig(config: MetricsConfig): boolean {
    try {
      const validation = this.validateThresholds();
      if (validation.isValid) {
        this.config = JSON.parse(JSON.stringify(config));
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}