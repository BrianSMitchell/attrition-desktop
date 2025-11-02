import { FILE_EXTENSIONS } from '@game/shared';
import type { TSESLint } from '@typescript-eslint/utils';

/**
 * @fileoverview Main entry point for Attrition ESLint plugin
 * @author Attrition Development Team
 */

// Import all rules
import idConsistencyRule from './rules/id-consistency';
import noExcessiveLoggingRule from './rules/no-excessive-logging';
import noLegacyDatabaseChecksRule from './rules/no-legacy-database-checks';
import serviceExtractionRequiredRule from './rules/service-extraction-required';
import maxComplexityRule from './rules/max-complexity';

// Import utilities
import { getProjectConfig } from './utils/metricsIntegration';

/**
 * Plugin configuration interface
 */
interface ESLintPluginConfig {
  plugins: string[];
  rules: Record<string, string>;
}

/**
 * Plugin rules collection
 */
interface PluginRules {
  'id-consistency': TSESLint.RuleModule<any, any>;
  'no-excessive-logging': TSESLint.RuleModule<any, any>;
  'no-legacy-database-checks': TSESLint.RuleModule<any, any>;
  'service-extraction-required': TSESLint.RuleModule<any, any>;
  'max-complexity': TSESLint.RuleModule<any, any>;
  [key: string]: TSESLint.RuleModule<any, any>;
}

/**
 * Plugin configurations
 */
interface PluginConfigs {
  recommended: ESLintPluginConfig;
  strict: ESLintPluginConfig;
  migration: ESLintPluginConfig;
  ci: ESLintPluginConfig;
  [key: string]: ESLintPluginConfig;
}

/**
 * Plugin utilities interface
 */
interface PluginUtils {
  getProjectConfig: typeof getProjectConfig;
  analyzeFile: (filePath: string) => Promise<any>;
  analyzeBatch: (filePaths: string[]) => Promise<any>;
}

/**
 * Plugin processor interface
 */
interface PluginProcessor {
  preprocess: (text: string, filename: string) => Array<{ text: string; filename: string }>;
  postprocess: (messages: any[][], filename: string) => any[];
}

/**
 * Plugin processors collection
 */
interface PluginProcessors {
  [key: string]: PluginProcessor;
}

/**
 * Attrition ESLint Plugin
 * Provides custom rules for maintaining code quality in the Attrition game codebase
 */
const plugin: {
  meta: { name: string; version: string };
  rules: PluginRules;
  configs: PluginConfigs;
  utils: PluginUtils;
  processors: PluginProcessors;
} = {
  meta: {
    name: '@attrition/code-smell-detector',
    version: '1.0.0'
  },

  rules: {
    'id-consistency': idConsistencyRule,
    'no-excessive-logging': noExcessiveLoggingRule,
    'no-legacy-database-checks': noLegacyDatabaseChecksRule,
    'service-extraction-required': serviceExtractionRequiredRule,
    'max-complexity': maxComplexityRule
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
        '@attrition/code-smell-detector/no-legacy-database-checks': 'off',
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

    /**
     * Analyze a single file using metrics collector
     */
    analyzeFile: async function (filePath: string): Promise<any> {
      try {
        const { MetricsCollector } = await import('../../../utils/codeMetrics/metricsCollector');
        const config = getProjectConfig();
        const collector = new MetricsCollector(config);
        return await collector.analyzeFile(filePath);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Could not load MetricsCollector:', errorMessage);
        return { success: false, error: 'MetricsCollector not available' };
      }
    },

    /**
     * Analyze multiple files in batch
     */
    analyzeBatch: async function (filePaths: string[]): Promise<any> {
      try {
        const { BatchMetricsAnalyzer } = await import('../../../utils/codeMetrics/index');
        const config = getProjectConfig();
        const analyzer = new BatchMetricsAnalyzer(config);
        return await analyzer.analyzeBatch(filePaths);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn('Could not load BatchMetricsAnalyzer:', errorMessage);
        return { success: false, error: 'BatchMetricsAnalyzer not available' };
      }
    }
  },

  /**
   * Processor for handling different file types
   */
  processors: {
    [FILE_EXTENSIONS.TYPESCRIPT]: {
      preprocess: function (text: string, filename: string) {
        return [{ text, filename }];
      },

      postprocess: function (messages: any[][], filename: string) {
        return messages[0] || [];
      }
    },

    [FILE_EXTENSIONS.JAVASCRIPT]: {
      preprocess: function (text: string, filename: string) {
        return [{ text, filename }];
      },

      postprocess: function (messages: any[][], filename: string) {
        return messages[0] || [];
      }
    }
  }
};

export = plugin;