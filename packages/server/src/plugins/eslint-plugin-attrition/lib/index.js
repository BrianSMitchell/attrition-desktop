import { FILE_EXTENSIONS } from '../../../shared/src/constants/file-paths';

/**
 * @fileoverview Main entry point for Attrition ESLint plugin
 * @author Attrition Development Team
 */

"use strict";

// Import all rules
const idConsistency = require('./rules/id-consistency');
const noExcessiveLogging = require('./rules/no-excessive-logging');
const noLegacyDatabaseChecks = require('./rules/no-legacy-database-checks');
const serviceExtractionRequired = require('./rules/service-extraction-required');
const maxComplexity = require('./rules/max-complexity');

// Import utilities
const { getProjectConfig } = require('./utils/metricsIntegration');

/**
 * Attrition ESLint Plugin
 * Provides custom rules for maintaining code quality in the Attrition game codebase
 */
const plugin = {
  meta: {
    name: '@attrition/code-smell-detector',
    version: '1.0.0'
  },

  rules: {
    'id-consistency': idConsistency,
    'no-excessive-logging': noExcessiveLogging,
    'no-legacy-database-checks': noLegacyDatabaseChecks,
    'service-extraction-required': serviceExtractionRequired,
    'max-complexity': maxComplexity
  },

  /**
   * Plugin configuration for different environments
   */
  configs: {
    // Recommended configuration for development
    recommended: {
      plugins: ['@attrition/code-smell-detector'],
      rules: {
        '@attrition/code-smell-detector/id-consistency': 'error',
        '@attrition/code-smell-detector/no-excessive-logging': 'warn',
        '@attrition/code-smell-detector/no-legacy-database-checks': 'error',
        '@attrition/code-smell-detector/service-extraction-required': 'warn',
        '@attrition/code-smell-detector/max-complexity': 'warn'
      }
    },

    // Strict configuration for production
    strict: {
      plugins: ['@attrition/code-smell-detector'],
      rules: {
        '@attrition/code-smell-detector/id-consistency': 'error',
        '@attrition/code-smell-detector/no-excessive-logging': 'error',
        '@attrition/code-smell-detector/no-legacy-database-checks': 'error',
        '@attrition/code-smell-detector/service-extraction-required': 'error',
        '@attrition/code-smell-detector/max-complexity': 'error'
      }
    },

    // Relaxed configuration for legacy code migration
    migration: {
      plugins: ['@attrition/code-smell-detector'],
      rules: {
        '@attrition/code-smell-detector/id-consistency': 'warn',
        '@attrition/code-smell-detector/no-excessive-logging': 'warn',
        '@attrition/code-smell-detector/no-legacy-database-checks': 'off', // Disabled during migration
        '@attrition/code-smell-detector/service-extraction-required': 'warn',
        '@attrition/code-smell-detector/max-complexity': 'warn'
      }
    },

    // CI/CD configuration for automated checks
    ci: {
      plugins: ['@attrition/code-smell-detector'],
      rules: {
        '@attrition/code-smell-detector/id-consistency': 'error',
        '@attrition/code-smell-detector/no-excessive-logging': 'error',
        '@attrition/code-smell-detector/no-legacy-database-checks': 'error',
        '@attrition/code-smell-detector/service-extraction-required': 'error',
        '@attrition/code-smell-detector/max-complexity': 'error'
      }
    }
  },

  /**
   * Utility functions for external use
   */
  utils: {
    getProjectConfig,
    analyzeFile: async function(filePath) {
      try {
        // Use dynamic import for TypeScript files
        const { MetricsCollector } = await import('../../utils/codeMetrics/metricsCollector.js');
        const config = getProjectConfig();
        const collector = new MetricsCollector(config);
        return await collector.analyzeFile(filePath);
      } catch (error) {
        console.warn('Could not load MetricsCollector:', error.message);
        return { success: false, error: 'MetricsCollector not available' };
      }
    },

    analyzeBatch: async function(filePaths) {
      try {
        // Use dynamic import for TypeScript files
        const { BatchMetricsAnalyzer } = await import('../../utils/codeMetrics/index.js');
        const config = getProjectConfig();
        const analyzer = new BatchMetricsAnalyzer(config);
        return await analyzer.analyzeBatch(filePaths);
      } catch (error) {
        console.warn('Could not load BatchMetricsAnalyzer:', error.message);
        return { success: false, error: 'BatchMetricsAnalyzer not available' };
      }
    }
  },

  /**
   * Processor for handling different file types
   */
  processors: {
    FILE_EXTENSIONS.TYPESCRIPT: {
      preprocess: function(text, filename) {
        // Return array of code blocks to lint
        return [{ text, filename }];
      },

      postprocess: function(messages, filename) {
        // Return final messages
        return messages[0];
      }
    },

    FILE_EXTENSIONS.JAVASCRIPT: {
      preprocess: function(text, filename) {
        return [{ text, filename }];
      },

      postprocess: function(messages, filename) {
        return messages[0];
      }
    }
  }
};

/**
 * Legacy support for direct rule imports
 */
plugin.rules['id-consistency'] = idConsistency;
plugin.rules['no-excessive-logging'] = noExcessiveLogging;
plugin.rules['no-legacy-database-checks'] = noLegacyDatabaseChecks;
plugin.rules['service-extraction-required'] = serviceExtractionRequired;
plugin.rules['max-complexity'] = maxComplexity;

module.exports = plugin;