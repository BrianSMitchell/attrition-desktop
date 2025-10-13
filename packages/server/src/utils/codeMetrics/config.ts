import { ENV_VARS } from '../../../shared/src/constants/env-vars';

/**
 * Configuration system for code metrics collection and threshold management
 * Provides sensible defaults and project-specific rules for Attrition codebase
 */

import { HTTP_STATUS } from '../../constants/response-formats';
  MetricsConfig,
  ConfigValidation,
  MetricsThresholds,
  ProjectRules,
  ComplexityThresholds,
  DuplicationThresholds,
  FileSizeThresholds,
  CouplingThresholds
} from './types';

/**
 * Default threshold configuration for general code quality metrics
 */
const defaultComplexityThresholds: ComplexityThresholds = {
  maxPerFunction: 10,        // Functions > 10 complexity are smells
  maxPerFile: 50             // Files > 50 total complexity need refactoring
};

const defaultDuplicationThresholds: DuplicationThresholds = {
  minLines: 10,              // Duplicated blocks must be at least 10 lines
  similarityThreshold: 85    // 85% similarity or higher considered duplicate
};

const defaultFileSizeThresholds: FileSizeThresholds = {
  maxLines: HTTP_STATUS.INTERNAL_SERVER_ERROR,             // Files > 500 lines are too large
  maxFunctions: 20           // Files > 20 functions need splitting
};

const defaultCouplingThresholds: CouplingThresholds = {
  maxDependencies: 10,       // More than 10 external dependencies is high coupling
  featureEnvyThreshold: 70   // 70% or more feature envy indicates misplaced responsibility
};

/**
 * Default thresholds configuration
 */
const defaultThresholds: MetricsThresholds = {
  complexity: defaultComplexityThresholds,
  duplication: defaultDuplicationThresholds,
  fileSize: defaultFileSizeThresholds,
  coupling: defaultCouplingThresholds
};

/**
 * Project-specific rules for Attrition codebase
 * Tailored to Supabase migration context and service extraction patterns
 */
const attritionProjectRules: ProjectRules = {
  idConsistency: {
    targetScore: 90,          // Target 90% UUID consistency
    criticalViolations: [
      'ObjectId\\(\\)',       // Direct ObjectId constructor usage
      'mongoose\\.Types\\.ObjectId', // Mongoose ObjectId usage
      'new ObjectId',         // ObjectId instantiation
    ]
  },
  logging: {
    maxConsoleStatements: 5,   // Max 5 console statements per file
    allowInDevelopment: true   // Allow console statements in development
  },
  legacyPatterns: {
    bannedPatterns: [
      'mongoose\\.',           // Mongoose usage in migrated files
      'getDatabaseType\\(\\)', // Database type detection (legacy)
      'MongoClient',          // Direct MongoDB client usage
      'collection\\.',        // MongoDB collection methods
      'findOne\\(\\{.*\\}\\)', // MongoDB find operations
      'insertOne\\(',         // MongoDB insert operations
      'updateOne\\(',         // MongoDB update operations
      'deleteOne\\(',         // MongoDB delete operations
    ],
    migrationPhase: 'Phase 5'  // Current Supabase migration phase
  },
  serviceExtraction: {
    minServiceScore: 80,       // 80% or higher service extraction score required
    maxRouteComplexity: 15     // Routes > 15 complexity should be extracted
  }
};

/**
 * Default analysis configuration
 */
const defaultAnalysisConfig = {
  includePatterns: [
    'packages/server/src/**/*.ts',     // Server TypeScript files
    'packages/client/src/**/*.ts',     // Client TypeScript files (if needed)
    'packages/client/src/**/*.tsx',    // React TypeScript files
  ],
  excludePatterns: [
    '**/node_modules/**',             // Dependencies
    '**/dist/**',                     // Build output
    '**/build/**',                    // Build output
    '**/*.d.ts',                      // Type definitions
    '**/test/**',                     // Test files
    '**/tests/**',                    // Test files
    '**/*.test.ts',                   // Test files
    '**/*.spec.ts',                   // Test files
    'packages/server/src/utils/codeMetrics/**', // Exclude metrics system itself
  ],
  maxFileSize: 1024 * 1024,           // 1MB max file size
  timeoutMs: 10000                    // 10 second timeout per file
};

/**
 * Default reporting configuration
 */
const defaultReportingConfig = {
  outputFormat: 'json' as const,
  includeRecommendations: true,
  groupBy: 'file' as const
};

/**
 * Default metrics configuration with sensible defaults
 */
export const defaultMetricsConfig: MetricsConfig = {
  thresholds: defaultThresholds,
  projectRules: attritionProjectRules,
  analysis: defaultAnalysisConfig,
  reporting: defaultReportingConfig
};

/**
 * Environment-specific configurations
 */
export const environmentConfigs = {
  development: {
    ...defaultMetricsConfig,
    analysis: {
      ...defaultAnalysisConfig,
      includePatterns: [
        ...defaultAnalysisConfig.includePatterns,
        'packages/server/src/**/*.ts',
      ],
      excludePatterns: [
        ...defaultAnalysisConfig.excludePatterns,
        // Less strict exclusions in development
      ]
    },
    projectRules: {
      ...attritionProjectRules,
      logging: {
        ...attritionProjectRules.logging,
        allowInDevelopment: true
      }
    }
  },

  testing: {
    ...defaultMetricsConfig,
    analysis: {
      ...defaultAnalysisConfig,
      maxFileSize: 512 * 1024,        // Smaller files for testing
      timeoutMs: 5000,                 // Faster timeout for tests
      includePatterns: [
        'packages/server/src/**/*.ts',
      ],
      excludePatterns: [
        ...defaultAnalysisConfig.excludePatterns,
        'packages/server/src/migrations/**', // Skip migrations in tests
      ]
    },
    reporting: {
      ...defaultReportingConfig,
      outputFormat: 'console' as const
    }
  },

  production: {
    ...defaultMetricsConfig,
    analysis: {
      ...defaultAnalysisConfig,
      timeoutMs: 15000,                // Longer timeout for production analysis
      maxFileSize: 2 * 1024 * 1024,   // 2MB max for production files
    },
    projectRules: {
      ...attritionProjectRules,
      logging: {
        ...attritionProjectRules.logging,
        allowInDevelopment: false       // Strict logging rules in production
      }
    }
  }
};

/**
 * Get configuration for specific environment
 */
export function getConfigForEnvironment(env: string = 'development'): MetricsConfig {
  const config = environmentConfigs[env as keyof typeof environmentConfigs];
  return config || defaultMetricsConfig;
}

/**
 * Validate configuration structure and values
 */
export function validateConfig(config: MetricsConfig): ConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // Validate thresholds
  if (config.thresholds.complexity.maxPerFunction < 1) {
    errors.push('Complexity threshold maxPerFunction must be >= 1');
  }
  if (config.thresholds.complexity.maxPerFunction > 50) {
    warnings.push('Complexity threshold maxPerFunction > 50 may be too lenient');
  }

  if (config.thresholds.duplication.similarityThreshold < 50) {
    errors.push('Duplication similarity threshold must be >= 50%');
  }
  if (config.thresholds.duplication.similarityThreshold > 100) {
    errors.push('Duplication similarity threshold cannot exceed 100%');
  }

  if (config.thresholds.fileSize.maxLines < 100) {
    warnings.push('File size threshold maxLines < 100 may be too strict');
  }

  // Validate project rules
  if (config.projectRules.idConsistency.targetScore < 0 || config.projectRules.idConsistency.targetScore > 100) {
    errors.push('ID consistency target score must be between 0-100');
  }

  if (config.projectRules.logging.maxConsoleStatements < 0) {
    errors.push('Max console statements cannot be negative');
  }

  if (config.projectRules.serviceExtraction.minServiceScore < 0 || config.projectRules.serviceExtraction.minServiceScore > 100) {
    errors.push('Service extraction minimum score must be between 0-100');
  }

  // Validate analysis config
  if (config.analysis.maxFileSize <= 0) {
    errors.push('Max file size must be > 0');
  }
  if (config.analysis.timeoutMs <= 0) {
    errors.push('Analysis timeout must be > 0');
  }

  // Suggestions for improvement
  if (config.analysis.maxFileSize > 5 * 1024 * 1024) {
    suggestions.push('Consider reducing maxFileSize for better performance');
  }

  if (config.analysis.includePatterns.length === 0) {
    suggestions.push('Consider adding include patterns to analyze specific files');
  }

  if (config.projectRules.legacyPatterns.bannedPatterns.length === 0) {
    warnings.push('No banned patterns defined - consider adding project-specific patterns');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions
  };
}

/**
 * Merge user-provided configuration with defaults
 */
export function mergeWithDefaults(userConfig: Partial<MetricsConfig>): MetricsConfig {
  const validation = validateConfig(userConfig as MetricsConfig);

  if (!validation.isValid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
  }

  // Deep merge the configurations
  const merged: MetricsConfig = {
    thresholds: {
      complexity: { ...defaultThresholds.complexity, ...userConfig.thresholds?.complexity },
      duplication: { ...defaultThresholds.duplication, ...userConfig.thresholds?.duplication },
      fileSize: { ...defaultThresholds.fileSize, ...userConfig.thresholds?.fileSize },
      coupling: { ...defaultThresholds.coupling, ...userConfig.thresholds?.coupling }
    },
    projectRules: {
      idConsistency: { ...attritionProjectRules.idConsistency, ...userConfig.projectRules?.idConsistency },
      logging: { ...attritionProjectRules.logging, ...userConfig.projectRules?.logging },
      legacyPatterns: { ...attritionProjectRules.legacyPatterns, ...userConfig.projectRules?.legacyPatterns },
      serviceExtraction: { ...attritionProjectRules.serviceExtraction, ...userConfig.projectRules?.serviceExtraction }
    },
    analysis: { ...defaultAnalysisConfig, ...userConfig.analysis },
    reporting: { ...defaultReportingConfig, ...userConfig.reporting }
  };

  // Log warnings if any
  if (validation.warnings.length > 0) {
    console.warn('Configuration warnings:', validation.warnings);
  }

  // Log suggestions if any
  if (validation.suggestions.length > 0) {
    console.info('Configuration suggestions:', validation.suggestions);
  }

  return merged;
}

/**
 * Get configuration from environment variables or use defaults
 */
export function getConfigFromEnvironment(): MetricsConfig {
  const env = process.env[ENV_VARS.NODE_ENV] || 'development';

  // Check for config file path
  const configPath = process.env.METRICS_CONFIG_PATH;

  if (configPath) {
    try {
      // In a real implementation, this would load from file
      // For now, return environment-specific config
      console.info(`Loading config for environment: ${env}`);
    } catch (error) {
      console.warn(`Failed to load config from ${configPath}, using defaults:`, error);
    }
  }

  return getConfigForEnvironment(env);
}

/**
 * Export the default configuration for immediate use
 */
export const metricsConfig = getConfigFromEnvironment();

