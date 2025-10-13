/**
 * Attrition Quality Gate Configuration
 * ===================================
 *
 * Centralized configuration for all quality gate rules, thresholds, and settings.
 * This file defines the quality standards that must be met for code to pass
 * through the development pipeline.
 *
 * Quality Gate Levels:
 * - Gate 0 (Critical): Build failures, TypeScript errors, critical security issues (0% tolerance)
 * - Gate 1 (High): ID consistency, console logging, legacy patterns (<5% tolerance)
 * - Gate 2 (Medium): Complexity limits, service extraction opportunities (<15% tolerance)
 * - Gate 3 (Baseline): General code quality, style consistency (<30% tolerance)
 */

module.exports = {
  // ==========================================
  // Quality Gate Levels and Requirements
  // ==========================================

  qualityLevels: {
    quick: {
      description: 'Basic syntax and import checks only',
      requirements: ['syntax', 'imports'],
      timeout: 300, // 5 minutes
      tolerance: 0
    },

    standard: {
      description: 'Standard code quality checks',
      requirements: ['syntax', 'imports', 'eslint', 'typescript', 'formatting'],
      timeout: 600, // 10 minutes
      tolerance: 0.05 // 5% tolerance for non-critical issues
    },

    comprehensive: {
      description: 'Full quality analysis including metrics and smells',
      requirements: [
        'syntax', 'imports', 'eslint', 'typescript', 'formatting',
        'metrics', 'codesmells', 'duplication', 'complexity'
      ],
      timeout: 900, // 15 minutes
      tolerance: 0.15 // 15% tolerance for non-critical issues
    },

    strict: {
      description: 'Most rigorous checks including security and performance',
      requirements: [
        'syntax', 'imports', 'eslint', 'typescript', 'formatting',
        'metrics', 'codesmells', 'duplication', 'complexity',
        'security', 'performance', 'friction'
      ],
      timeout: 1200, // 20 minutes
      tolerance: 0.30 // 30% tolerance for non-critical issues
    }
  },

  // ==========================================
  // Critical Quality Gates (Gate 0)
  // ==========================================
  // These checks have ZERO tolerance - they must always pass

  critical: {
    // Build and compilation errors
    build: {
      typescript: {
        enabled: true,
        maxErrors: 0,
        failOnWarning: false
      },

      eslint: {
        enabled: true,
        maxErrors: 0,
        failOnWarning: false
      },

      syntax: {
        enabled: true,
        checkFileSizes: true,
        maxFileSize: 1048576 // 1MB
      }
    },

    // Critical security vulnerabilities
    security: {
      vulnerabilities: {
        enabled: true,
        maxCritical: 0,
        maxHigh: 0,
        allowlist: [
          // Add known acceptable vulnerabilities here
        ]
      },

      secrets: {
        enabled: true,
        patterns: [
          'password.*[:=].*[\'"]([^\'"]+)',
          'secret.*[:=].*[\'"]([^\'"]+)',
          'api[_-]?key.*[:=].*[\'"]([^\'"]+)',
          'token.*[:=].*[\'"]([^\'"]+)',
          'private[_-]?key.*[:=].*[\'"]([^\'"]+)',
          '-----BEGIN.*PRIVATE.*KEY-----'
        ]
      },

      sqlInjection: {
        enabled: true,
        patterns: [
          'supabase\\.from.*select.*req\\.body',
          'supabase\\.from.*select.*req\\.query',
          'supabase\\.from.*select.*req\\.params'
        ]
      }
    }
  },

  // ==========================================
  // High Priority Gates (Gate 1)
  // ==========================================

  high: {
    // ID consistency issues (<5% tolerance)
    idConsistency: {
      enabled: true,
      targetScore: 95, // Minimum 95% UUID consistency
      criticalViolations: [
        'ObjectId.*new ObjectId',
        'mongoose.*Types\.ObjectId',
        'require.*mongoose'
      ],
      tolerance: 0.05 // 5% tolerance
    },

    // Console logging limits
    logging: {
      enabled: true,
      maxConsoleStatements: 5, // Max console statements per file
      allowInDevelopment: false,
      allowInTests: true,
      tolerance: 0.05
    },

    // Legacy patterns
    legacyPatterns: {
      enabled: true,
      bannedPatterns: [
        'mongoose\\.',
        'ObjectId\\(',
        '\\.save\\(',
        '\\.findOne\\(',
        'new Schema\\('
      ],
      migrationPhase: 'supabase_migration',
      tolerance: 0.05
    }
  },

  // ==========================================
  // Medium Priority Gates (Gate 2)
  // ==========================================

  medium: {
    // Complexity limits (<15% tolerance)
    complexity: {
      enabled: true,
      maxPerFunction: 10, // Cyclomatic complexity
      maxPerFile: 50,
      maxNestingDepth: 4,
      tolerance: 0.15
    },

    // Service extraction opportunities
    serviceExtraction: {
      enabled: true,
      minServiceScore: 70, // Minimum score for proper service extraction
      maxRouteComplexity: 25, // Maximum complexity before extraction needed
      detectMixedConcerns: true,
      tolerance: 0.15
    },

    // Coupling standards
    coupling: {
      enabled: true,
      maxDependencies: 10,
      featureEnvyThreshold: 60, // 0-100 feature envy score
      tolerance: 0.15
    }
  },

  // ==========================================
  // Baseline Gates (Gate 3)
  // ==========================================

  baseline: {
    // General code quality (<30% tolerance)
    codeQuality: {
      enabled: true,
      minMaintainabilityIndex: 70,
      maxTechnicalDebtRatio: 0.1,
      tolerance: 0.30
    },

    // Style consistency
    styleConsistency: {
      enabled: true,
      enforceFormatting: true,
      checkNamingConventions: true,
      maxLineLength: 120,
      tolerance: 0.30
    },

    // File size standards
    fileSize: {
      enabled: true,
      maxLines: 500,
      maxFunctions: 20,
      maxClasses: 5,
      tolerance: 0.30
    }
  },

  // ==========================================
  // Package-Specific Configurations
  // ==========================================

  packages: {
    server: {
      // Server-specific quality rules
      routes: {
        maxComplexity: 15,
        maxLength: 200, // lines
        requireJSDoc: false
      },

      services: {
        maxComplexity: 20,
        maxMethods: 15,
        requireJSDoc: true
      },

      controllers: {
        maxComplexity: 10,
        maxMethods: 10,
        requireJSDoc: true
      },

      utils: {
        maxComplexity: 15,
        maxFunctions: 20,
        requireJSDoc: false
      }
    },

    client: {
      // Client-specific quality rules
      components: {
        maxComplexity: 12,
        maxProps: 10,
        requirePropTypes: false
      },

      hooks: {
        maxComplexity: 8,
        maxDependencies: 5,
        requireJSDoc: true
      },

      services: {
        maxComplexity: 15,
        maxMethods: 12,
        requireJSDoc: true
      }
    },

    shared: {
      // Shared package quality rules
      types: {
        maxInterfaces: 50,
        maxUnions: 20,
        requireJSDoc: true
      },

      utils: {
        maxComplexity: 10,
        maxFunctions: 15,
        requireJSDoc: true
      }
    }
  },

  // ==========================================
  // Threshold Configuration by Package
  // ==========================================

  thresholds: {
    complexity: {
      maxPerFunction: 10,
      maxPerFile: 50,
      maxNestingDepth: 4
    },

    duplication: {
      minLines: 10,
      similarityThreshold: 80 // 80% similarity
    },

    fileSize: {
      maxLines: 500,
      maxFunctions: 20,
      maxClasses: 5
    },

    coupling: {
      maxDependencies: 10,
      featureEnvyThreshold: 60
    }
  },

  // ==========================================
  // Project-Specific Rules
  // ==========================================

  projectRules: {
    idConsistency: {
      targetScore: 95,
      criticalViolations: [
        'new ObjectId',
        'mongoose.Types.ObjectId',
        'require("mongoose")'
      ]
    },

    logging: {
      maxConsoleStatements: 5,
      allowInDevelopment: false,
      allowInTests: true
    },

    legacyPatterns: {
      bannedPatterns: [
        'mongoose',
        'ObjectId',
        '\\.save\\(',
        '\\.findOne\\('
      ],
      migrationPhase: 'supabase_migration'
    },

    serviceExtraction: {
      minServiceScore: 70,
      maxRouteComplexity: 25
    }
  },

  // ==========================================
  // Analysis Configuration
  // ==========================================

  analysis: {
    includePatterns: [
      'packages/**/*.ts',
      'packages/**/*.tsx'
    ],

    excludePatterns: [
      'packages/**/node_modules/**',
      'packages/**/dist/**',
      'packages/**/build/**',
      'packages/**/*.test.ts',
      'packages/**/*.spec.ts',
      'packages/**/__tests__/**'
    ],

    maxFileSize: 1048576, // 1MB
    timeoutMs: 30000, // 30 seconds per file
    parallel: true,
    maxConcurrency: 4
  },

  // ==========================================
  // Reporting Configuration
  // ==========================================

  reporting: {
    outputFormats: ['console', 'json', 'markdown'],

    includeRecommendations: true,
    groupBy: 'severity',

    // Report file locations
    reports: {
      console: {
        enabled: true,
        showProgress: true,
        colorize: true
      },

      json: {
        enabled: true,
        outputFile: 'quality-report.json',
        includeRawData: false
      },

      markdown: {
        enabled: true,
        outputFile: 'quality-report.md',
        includeCharts: false
      },

      html: {
        enabled: false,
        outputFile: 'quality-report.html',
        includeCharts: true
      }
    }
  },

  // ==========================================
  // Integration Settings
  // ==========================================

  integrations: {
    github: {
      enabled: true,
      commentOnPR: true,
      setStatusChecks: true,
      createIssues: false
    },

    slack: {
      enabled: false,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      notifyOnFailure: true,
      notifyOnSuccess: false
    },

    jira: {
      enabled: false,
      projectKey: process.env.JIRA_PROJECT_KEY,
      createTicketsForIssues: false
    }
  },

  // ==========================================
  // Friction Monitoring Configuration
  // ==========================================

  friction: {
    enabled: true,

    velocity: {
      enabled: true,
      trackMetrics: [
        'development_speed',
        'review_time',
        'merge_frequency',
        'rework_rate'
      ]
    },

    quality: {
      enabled: true,
      impactThreshold: 0.1, // 10% quality impact threshold
      correlationWindow: 7 // days
    },

    correlation: {
      enabled: true,
      minCorrelation: 0.6, // 60% correlation threshold
      trackMetrics: [
        'complexity_trend',
        'smell_accumulation',
        'refactoring_frequency'
      ]
    }
  },

  // ==========================================
  // Exemption and Suppression Rules
  // ==========================================

  suppressions: [
    // Add specific suppressions for known acceptable issues
    // {
    //   id: 'legacy-migration-001',
    //   pattern: 'packages/server/src/legacy/**/*.ts',
    //   rule: 'legacy-patterns',
    //   reason: 'Legacy code during migration period',
    //   expiresAt: '2025-12-31',
    //   createdBy: 'migration-team'
    // }
  ],

  // ==========================================
  // Baseline Configuration for Comparisons
  // ==========================================

  baselines: {
    // Default baseline for new code
    default: {
      complexity: 8,
      duplication: 5,
      coverage: 80,
      maintainability: 75
    },

    // Package-specific baselines
    packages: {
      server: {
        complexity: 10,
        duplication: 8,
        coverage: 85,
        maintainability: 80
      },

      client: {
        complexity: 6,
        duplication: 3,
        coverage: 75,
        maintainability: 70
      },

      shared: {
        complexity: 5,
        duplication: 2,
        coverage: 90,
        maintainability: 85
      }
    }
  }
};