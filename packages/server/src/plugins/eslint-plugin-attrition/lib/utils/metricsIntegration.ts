/**
 * @fileoverview Utilities for integrating ESLint plugin with Attrition metrics system
 * @author Attrition Development Team
 */

/**
 * Metric configuration interface
 */
interface MetricThresholds {
  complexity: {
    maxPerFunction: number;
    maxPerFile: number;
  };
  duplication: {
    minLines: number;
    similarityThreshold: number;
  };
  fileSize: {
    maxLines: number;
    maxFunctions: number;
  };
  coupling: {
    maxDependencies: number;
    featureEnvyThreshold: number;
  };
}

/**
 * Project-specific rules configuration
 */
interface ProjectRules {
  idConsistency: {
    targetScore: number;
    criticalViolations: string[];
  };
  logging: {
    maxConsoleStatements: number;
    allowInDevelopment: boolean;
  };
  legacyPatterns: {
    bannedPatterns: string[];
    migrationPhase: string;
  };
  serviceExtraction: {
    minServiceScore: number;
    maxRouteComplexity: number;
  };
}

/**
 * Analysis configuration interface
 */
interface AnalysisConfig {
  includePatterns: string[];
  excludePatterns: string[];
  maxFileSize: number;
  timeoutMs: number;
}

/**
 * Reporting configuration interface
 */
interface ReportingConfig {
  outputFormat: string;
  includeRecommendations: boolean;
  groupBy: string;
}

/**
 * Complete project configuration
 */
interface ProjectConfig {
  thresholds: MetricThresholds;
  projectRules: ProjectRules;
  analysis: AnalysisConfig;
  reporting: ReportingConfig;
}

/**
 * Pattern detection result
 */
interface PatternDetection {
  objectId: any[];
  uuid: any[];
}

/**
 * Migration analysis issue
 */
interface MigrationIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  patterns: any[];
}

/**
 * Complete migration analysis result
 */
interface MigrationAnalysis {
  filePath: string;
  idConsistency: number;
  legacyPatternScore: number;
  serviceExtractionScore: number;
  overallScore: number;
  isReadyForMigration: boolean;
  issues: MigrationIssue[];
}

/**
 * ESLint violation format
 */
interface FormattedViolation {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  line: number;
  column: number;
  source: string;
  recommendations: string[];
}

/**
 * Get project configuration from metrics system
 * @returns Project configuration object
 */
export function getProjectConfig(): ProjectConfig {
  try {
    // Import the metrics config from the existing system
    const { defaultMetricsConfig } = require('../../../utils/codeMetrics/config');
    return defaultMetricsConfig;
  } catch (error) {
    console.warn(
      'Could not load metrics config, using defaults:',
      error instanceof Error ? error.message : String(error)
    );
    return getDefaultConfig();
  }
}

/**
 * Get default configuration when metrics system is not available
 * @returns Default configuration object
 */
export function getDefaultConfig(): ProjectConfig {
  return {
    thresholds: {
      complexity: {
        maxPerFunction: 10,
        maxPerFile: 50
      },
      duplication: {
        minLines: 5,
        similarityThreshold: 80
      },
      fileSize: {
        maxLines: 300,
        maxFunctions: 20
      },
      coupling: {
        maxDependencies: 10,
        featureEnvyThreshold: 70
      }
    },
    projectRules: {
      idConsistency: {
        targetScore: 90,
        criticalViolations: [
          'mongoose\\.Types\\.ObjectId',
          'new ObjectId',
          'ObjectId\\('
        ]
      },
      logging: {
        maxConsoleStatements: 3,
        allowInDevelopment: true
      },
      legacyPatterns: {
        bannedPatterns: ['callback', 'var ', 'console\\.log'],
        migrationPhase: 'Phase 5'
      },
      serviceExtraction: {
        minServiceScore: 80,
        maxRouteComplexity: 15
      }
    },
    analysis: {
      includePatterns: ['**/*.ts', '**/*.js'],
      excludePatterns: ['node_modules/**', 'dist/**', '**/*.test.ts', '**/*.spec.ts'],
      maxFileSize: 1024 * 1024, // 1MB
      timeoutMs: 5000
    },
    reporting: {
      outputFormat: 'json',
      includeRecommendations: true,
      groupBy: 'file'
    }
  };
}

/**
 * Calculate consistency score for ID patterns
 * @param objectIdPatterns - Array of ObjectId pattern occurrences
 * @param uuidPatterns - Array of UUID pattern occurrences
 * @returns Consistency score (0-100)
 */
export function calculateIdConsistencyScore(objectIdPatterns: any[], uuidPatterns: any[]): number {
  const total = objectIdPatterns.length + uuidPatterns.length;
  if (total === 0) return 100;

  const uuidRatio = uuidPatterns.length / total;
  return Math.round(uuidRatio * 100);
}

/**
 * Analyze file patterns for migration readiness
 * @param filePath - Path to the file being analyzed
 * @param patterns - Detected patterns in the file
 * @returns Migration analysis result
 */
export function analyzeMigrationReadiness(
  filePath: string,
  patterns: PatternDetection
): MigrationAnalysis {
  const config = getProjectConfig();
  const rules = config.projectRules;

  const analysis: MigrationAnalysis = {
    filePath,
    idConsistency: calculateIdConsistencyScore(patterns.objectId, patterns.uuid),
    legacyPatternScore: calculateLegacyPatternScore(patterns),
    serviceExtractionScore: calculateServiceExtractionScore(patterns),
    overallScore: 0,
    isReadyForMigration: false,
    issues: []
  };

  // Check ID consistency against target
  if (analysis.idConsistency < rules.idConsistency.targetScore) {
    analysis.issues.push({
      type: 'id-consistency',
      severity: 'high',
      message: `ID consistency score ${analysis.idConsistency}% below target ${rules.idConsistency.targetScore}%`,
      patterns: patterns.objectId.length > 0 ? patterns.objectId : []
    });
  }

  // Calculate overall migration readiness score
  analysis.overallScore = Math.round(
    (analysis.idConsistency + analysis.legacyPatternScore + analysis.serviceExtractionScore) / 3
  );

  analysis.isReadyForMigration = analysis.overallScore >= 85;

  return analysis;
}

/**
 * Calculate legacy pattern score
 * @param patterns - Detected patterns in the file
 * @returns Legacy pattern score (0-100)
 */
export function calculateLegacyPatternScore(patterns: PatternDetection): number {
  const config = getProjectConfig();
  const bannedPatterns = config.projectRules.legacyPatterns.bannedPatterns;

  let violations = 0;
  const totalPatterns = patterns.objectId.length + patterns.uuid.length;

  if (totalPatterns === 0) return 100;

  // Check for banned patterns in the code
  for (const pattern of bannedPatterns) {
    const regex = new RegExp(pattern, 'g');
    // This would need to be implemented with actual AST analysis
    // For now, return a placeholder score
  }

  const violationRatio = violations / totalPatterns;
  return Math.round(Math.max(0, 1 - violationRatio) * 100);
}

/**
 * Calculate service extraction score
 * @param patterns - Detected patterns in the file
 * @returns Service extraction score (0-100)
 */
export function calculateServiceExtractionScore(patterns: PatternDetection): number {
  // This would analyze route complexity and service extraction patterns
  // For now, return a placeholder score
  return 85;
}

/**
 * Generate recommendations for file improvement
 * @param analysis - Migration analysis result
 * @returns Array of recommendation strings
 */
export function generateRecommendations(analysis: MigrationAnalysis): string[] {
  const recommendations: string[] = [];

  if (analysis.idConsistency < 90) {
    recommendations.push(
      `Improve UUID consistency: Currently ${analysis.idConsistency}% - target 90%+`
    );
  }

  if (analysis.legacyPatternScore < 80) {
    recommendations.push(
      `Address legacy patterns: Currently ${analysis.legacyPatternScore}% compliance - target 90%+`
    );
  }

  if (analysis.serviceExtractionScore < 80) {
    recommendations.push(
      `Apply service extraction pattern: Currently ${analysis.serviceExtractionScore}% - target 80%+`
    );
  }

  if (analysis.overallScore >= 90) {
    recommendations.push('Ready for next migration phase');
  } else if (analysis.overallScore >= 75) {
    recommendations.push('Nearly ready for next migration phase - address remaining issues');
  } else {
    recommendations.push('Additional work needed before proceeding to next migration phase');
  }

  return recommendations;
}

/**
 * Format violation for reporting
 * @param violation - Violation object from analysis
 * @param ruleName - Name of the ESLint rule
 * @returns Formatted violation for ESLint reporting
 */
export function formatViolationForReporting(
  violation: any,
  ruleName: string
): FormattedViolation {
  return {
    rule: ruleName,
    severity: violation.severity === 'high' ? 'error' : 'warning',
    message: violation.message,
    line: violation.line || 1,
    column: violation.column || 0,
    source: violation.source || '',
    recommendations: violation.recommendations || []
  };
}
