/**
 * @fileoverview Utilities for integrating ESLint plugin with Attrition metrics system
 * @author Attrition Development Team
 */

"use strict";

/**
 * Get project configuration from metrics system
 * @returns {Object} Project configuration object
 */
function getProjectConfig() {
  try {
    // Import the metrics config from the existing system
    const { defaultMetricsConfig } = require('../../../utils/codeMetrics/config');
    return defaultMetricsConfig;
  } catch (error) {
    console.warn('Could not load metrics config, using defaults:', error.message);
    return getDefaultConfig();
  }
}

/**
 * Get default configuration when metrics system is not available
 * @returns {Object} Default configuration object
 */
function getDefaultConfig() {
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
          "mongoose\\.Types\\.ObjectId",
          "new ObjectId",
          "ObjectId\\("
        ]
      },
      logging: {
        maxConsoleStatements: 3,
        allowInDevelopment: true
      },
      legacyPatterns: {
        bannedPatterns: [
          "callback",
          "var ",
          "console\\.log"
        ],
        migrationPhase: "Phase 5"
      },
      serviceExtraction: {
        minServiceScore: 80,
        maxRouteComplexity: 15
      }
    },
    analysis: {
      includePatterns: ["**/*.ts", "**/*.js"],
      excludePatterns: ["node_modules/**", "dist/**", "**/*.test.ts", "**/*.spec.ts"],
      maxFileSize: 1024 * 1024, // 1MB
      timeoutMs: 5000
    },
    reporting: {
      outputFormat: "json",
      includeRecommendations: true,
      groupBy: "file"
    }
  };
}

/**
 * Calculate consistency score for ID patterns
 * @param {Array} objectIdPatterns - Array of ObjectId pattern occurrences
 * @param {Array} uuidPatterns - Array of UUID pattern occurrences
 * @returns {number} Consistency score (0-100)
 */
function calculateIdConsistencyScore(objectIdPatterns, uuidPatterns) {
  const total = objectIdPatterns.length + uuidPatterns.length;
  if (total === 0) return 100;

  const uuidRatio = uuidPatterns.length / total;
  return Math.round(uuidRatio * 100);
}

/**
 * Analyze file patterns for migration readiness
 * @param {string} filePath - Path to the file being analyzed
 * @param {Object} patterns - Detected patterns in the file
 * @returns {Object} Migration analysis result
 */
function analyzeMigrationReadiness(filePath, patterns) {
  const config = getProjectConfig();
  const rules = config.projectRules;

  const analysis = {
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
 * @param {Object} patterns - Detected patterns in the file
 * @returns {number} Legacy pattern score (0-100)
 */
function calculateLegacyPatternScore(patterns) {
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
  return Math.round(Math.max(0, (1 - violationRatio)) * 100);
}

/**
 * Calculate service extraction score
 * @param {Object} patterns - Detected patterns in the file
 * @returns {number} Service extraction score (0-100)
 */
function calculateServiceExtractionScore(patterns) {
  // This would analyze route complexity and service extraction patterns
  // For now, return a placeholder score
  return 85;
}

/**
 * Generate recommendations for file improvement
 * @param {Object} analysis - Migration analysis result
 * @returns {Array} Array of recommendation strings
 */
function generateRecommendations(analysis) {
  const recommendations = [];

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
 * @param {Object} violation - Violation object from analysis
 * @param {string} ruleName - Name of the ESLint rule
 * @returns {Object} Formatted violation for ESLint reporting
 */
function formatViolationForReporting(violation, ruleName) {
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

module.exports = {
  getProjectConfig,
  getDefaultConfig,
  calculateIdConsistencyScore,
  analyzeMigrationReadiness,
  calculateLegacyPatternScore,
  calculateServiceExtractionScore,
  generateRecommendations,
  formatViolationForReporting
};