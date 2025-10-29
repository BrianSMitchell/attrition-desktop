/**
export const analyzer = new AttritionMetricsAnalyzer();
import { STATUS_CODES } from '@game/shared';
/**
 * Main entry point for Code Metrics and Threshold Management System
 *
 * Exports all public APIs for analyzing code quality in the Attrition codebase
 */

// Core classes
export { MetricsCollector } from './metricsCollector';
export { ThresholdManager } from './thresholdManager';

// Configuration and types
export type {
  CodeMetrics,
  CodeSmell,
  MetricsScores,
  ProjectSpecificMetrics,
  FileAnalysisResult,
  AnalysisResults,
  ThresholdViolation,
  SuppressionRule,
  MetricsConfig,
  ConfigValidation,
  ComplexityThresholds,
  DuplicationThresholds,
  FileSizeThresholds,
  CouplingThresholds,
  ProjectRules,
  CodeLocation,
  SeverityLevel,
  FunctionComplexity,
  DuplicationMatch,
  CouplingAnalysis,
  LegacyPattern,
  ServiceExtractionAnalysis,
  MetricsComparison
} from './types';

// Configuration functions and defaults
export {
  defaultMetricsConfig,
  environmentConfigs,
  getConfigForEnvironment,
  validateConfig,
  mergeWithDefaults,
  getConfigFromEnvironment,
  metricsConfig
} from './config';

// Convenience functions for common use cases
import { MetricsCollector } from './metricsCollector';
import { ThresholdManager } from './thresholdManager';
import { defaultMetricsConfig } from './config';

/**
 * Analyze a single file with default configuration
 */
export async function analyzeFile(filePath: string) {
  const collector = new MetricsCollector(defaultMetricsConfig);
  return await collector.analyzeFile(filePath);
}

/**
 * Analyze multiple files with default configuration
 */
export async function analyzeFiles(filePaths: string[]) {
  const collector = new MetricsCollector(defaultMetricsConfig);
  const results = [];

  for (const filePath of filePaths) {
    const result = await collector.analyzeFile(filePath);
    results.push(result);
  }

  return results;
}

/**
 * Evaluate metrics against thresholds with default configuration
 */
export function evaluateThresholds(metrics: any) {
  const manager = new ThresholdManager(defaultMetricsConfig);
  return manager.evaluateMetrics(metrics);
}

/**
 * Generate recommendations for a metrics result
 */
export function generateRecommendations(metrics: any) {
  const manager = new ThresholdManager(defaultMetricsConfig);
  return manager.generateRecommendations(metrics);
}

/**
 * Get threshold summary for reporting
 */
export function getThresholdSummary() {
  const manager = new ThresholdManager(defaultMetricsConfig);
  return manager.getThresholdSummary();
}

/**
 * Validate current configuration
 */
export function validateCurrentConfig() {
  const manager = new ThresholdManager(defaultMetricsConfig);
  return manager.validateThresholds();
}

/**
 * Batch analysis class for analyzing multiple files efficiently
 */
export class BatchMetricsAnalyzer {
  private collector: MetricsCollector;
  private manager: ThresholdManager;

  constructor(config = defaultMetricsConfig) {
    this.collector = new MetricsCollector(config);
    this.manager = new ThresholdManager(config);
  }

  /**
   * Analyze multiple files and return comprehensive results
   */
  async analyzeBatch(filePaths: string[]) {
    const analysisResults = [];
    const thresholdViolations = [];
    let totalScore = 0;
    let successfulFiles = 0;

    for (const filePath of filePaths) {
      const result = await this.collector.analyzeFile(filePath);

      if (result.success && result.metrics) {
        const violations = this.manager.evaluateMetrics(result.metrics);
        thresholdViolations.push(...violations);

        totalScore += this.manager.calculateOverallScore(result.metrics);
        successfulFiles++;

        analysisResults.push({
          ...result,
          violations,
          recommendations: this.manager.generateRecommendations(result.metrics)
        });
      } else {
        analysisResults.push(result);
      }
    }

    const averageScore = successfulFiles > 0 ? totalScore / successfulFiles : 0;

    return {
      timestamp: new Date(),
      summary: {
        totalFiles: filePaths.length,
        successfulFiles,
        failedFiles: filePaths.length - successfulFiles,
        totalSmells: thresholdViolations.length,
        averageScore: Math.round(averageScore)
      },
      files: analysisResults,
      violations: thresholdViolations,
      recommendations: this.generateBatchRecommendations(analysisResults),
      thresholdSummary: this.manager.getThresholdSummary()
    };
  }

  private generateBatchRecommendations(results: any[]) {
    const recommendations = new Map<string, number>();

    for (const result of results) {
      if (result.recommendations) {
        for (const rec of result.recommendations) {
          recommendations.set(rec, (recommendations.get(rec) || 0) + 1);
        }
      }
    }

    return Array.from(recommendations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 recommendations
      .map(([recommendation, count]) => `${recommendation} (${count} files)`);
  }
}

/**
 * Quick analysis function for single file with all results
 */
export async function quickAnalyze(filePath: string) {
  const analyzer = new BatchMetricsAnalyzer();
  const results = await analyzer.analyzeBatch([filePath]);
  return results.files[0];
}

/**
 * Project-specific analysis for Attrition codebase
 */
export class AttritionMetricsAnalyzer extends BatchMetricsAnalyzer {
  constructor() {
    // Use Attrition-specific configuration
    const attritionConfig = {
      ...defaultMetricsConfig,
      projectRules: {
        ...defaultMetricsConfig.projectRules,
        legacyPatterns: {
          ...defaultMetricsConfig.projectRules.legacyPatterns,
          migrationPhase: 'Phase 5' // Current migration phase
        }
      }
    };

    super(attritionConfig);
  }

  /**
   * Analyze routes for migration readiness
   */
  async analyzeRoutes(routeFiles: string[]) {
    const results = await this.analyzeBatch(routeFiles);

    // Add migration-specific insights
    const migrationInsights = {
      uuidConsistency: this.calculateMigrationMetric(results.files, 'idConsistency'),
      legacyPatternUsage: this.calculateMigrationMetric(results.files, 'legacyPatterns'),
      serviceExtractionReadiness: this.calculateMigrationMetric(results.files, 'serviceExtraction'),
      overallMigrationScore: 0
    };

    migrationInsights.overallMigrationScore = Math.round(
      (migrationInsights.uuidConsistency +
       migrationInsights.legacyPatternUsage +
       migrationInsights.serviceExtractionReadiness) / 3
    );

    return {
      ...results,
      migrationInsights,
      migrationPhase: 'Phase 5',
      recommendations: this.generateMigrationRecommendations(results.files, migrationInsights)
    };
  }

  private calculateMigrationMetric(files: any[], metric: string) {
    const validFiles = files.filter(f => f.metrics?.projectSpecific?.[metric] !== undefined);
    if (validFiles.length === 0) return STATUS_CODES.SUCCESS;

    const total = validFiles.reduce((sum, f) => sum + f.metrics.projectSpecific[metric], 0);
    return Math.round(total / validFiles.length);
  }

  private generateMigrationRecommendations(files: any[], insights: any) {
    const recommendations = [];

    if (insights.uuidConsistency < 80) {
      recommendations.push(`Improve UUID consistency: Currently ${insights.uuidConsistency}% - target 90%+`);
    }

    if (insights.legacyPatternUsage < 80) {
      recommendations.push(`Address legacy patterns: Currently ${insights.legacyPatternUsage}% compliance - target 90%+`);
    }

    if (insights.serviceExtractionReadiness < 80) {
      recommendations.push(`Apply service extraction pattern: Currently ${insights.serviceExtractionReadiness}% - target 80%+`);
    }

    if (insights.overallMigrationScore >= 90) {
      recommendations.push('Ready for next migration phase');
    } else if (insights.overallMigrationScore >= 75) {
      recommendations.push('Nearly ready for next migration phase - address remaining issues');
    } else {
      recommendations.push('Additional work needed before proceeding to next migration phase');
    }

    return recommendations;
  }
}

/**
 * Export default analyzer for convenience
 */
export const analyzer = new AttritionMetricsAnalyzer();