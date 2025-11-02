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

export interface QualityLevelConfig {
  description: string;
  requirements: string[];
  timeout: number;
  tolerance: number;
}

export interface BuildConfig {
  typescript: {
    enabled: boolean;
    maxErrors: number;
    failOnWarning: boolean;
  };
  eslint: {
    enabled: boolean;
    maxErrors: number;
    failOnWarning: boolean;
  };
  syntax: {
    enabled: boolean;
    checkFileSizes: boolean;
    maxFileSize: number;
  };
}

export interface QualityGateConfig {
  qualityLevels: {
    quick: QualityLevelConfig;
    standard: QualityLevelConfig;
    comprehensive: QualityLevelConfig;
    strict: QualityLevelConfig;
  };
  critical: {
    build: BuildConfig;
    security: {
      vulnerabilities: {
        enabled: boolean;
        maxCritical: number;
        maxHigh: number;
        allowlist: string[];
      };
      secrets: {
        enabled: boolean;
        patterns: string[];
      };
      sqlInjection: {
        enabled: boolean;
        patterns: string[];
      };
    };
  };
  high: {
    idConsistency: {
      enabled: boolean;
      targetScore: number;
      criticalViolations: string[];
      tolerance: number;
    };
    logging: {
      enabled: boolean;
      maxConsoleStatements: number;
      allowInDevelopment: boolean;
      allowInTests: boolean;
      tolerance: number;
    };
    legacyPatterns: {
      enabled: boolean;
      bannedPatterns: string[];
      migrationPhase: string;
      tolerance: number;
    };
  };
  medium: {
    complexity: {
      enabled: boolean;
      maxPerFunction: number;
      maxPerFile: number;
      maxNestingDepth: number;
      tolerance: number;
    };
    serviceExtraction: {
      enabled: boolean;
      minServiceScore: number;
      maxRouteComplexity: number;
      detectMixedConcerns: boolean;
      tolerance: number;
    };
    coupling: {
      enabled: boolean;
      maxDependencies: number;
      featureEnvyThreshold: number;
      tolerance: number;
    };
  };
  baseline: {
    codeQuality: {
      enabled: boolean;
      minMaintainabilityIndex: number;
      maxTechnicalDebtRatio: number;
      tolerance: number;
    };
    styleConsistency: {
      enabled: boolean;
      enforceFormatting: boolean;
      checkNamingConventions: boolean;
      maxLineLength: number;
      tolerance: number;
    };
    fileSize: {
      enabled: boolean;
      maxLines: number;
      maxFunctions: number;
      maxClasses: number;
      tolerance: number;
    };
  };
  packages: {
    server: {
      routes: {
        maxComplexity: number;
        maxLength: number;
        requireJSDoc: boolean;
      };
      services: {
        maxComplexity: number;
        maxMethods: number;
        requireJSDoc: boolean;
      };
      controllers: {
        maxComplexity: number;
        maxMethods: number;
        requireJSDoc: boolean;
      };
      utils: {
        maxComplexity: number;
        maxFunctions: number;
        requireJSDoc: boolean;
      };
    };
    client: {
      components: {
        maxComplexity: number;
        maxProps: number;
        requirePropTypes: boolean;
      };
      hooks: {
        maxComplexity: number;
        maxDependencies: number;
        requireJSDoc: boolean;
      };
      services: {
        maxComplexity: number;
        maxMethods: number;
        requireJSDoc: boolean;
      };
    };
    shared: {
      types: {
        maxInterfaces: number;
        maxUnions: number;
        requireJSDoc: boolean;
      };
      utils: {
        maxComplexity: number;
        maxFunctions: number;
        requireJSDoc: boolean;
      };
    };
  };
  thresholds: {
    complexity: {
      maxPerFunction: number;
      maxPerFile: number;
      maxNestingDepth: number;
    };
    duplication: {
      minLines: number;
      similarityThreshold: number;
    };
    fileSize: {
      maxLines: number;
      maxFunctions: number;
      maxClasses: number;
    };
    coupling: {
      maxDependencies: number;
      featureEnvyThreshold: number;
    };
  };
  projectRules: {
    idConsistency: {
      targetScore: number;
      criticalViolations: string[];
    };
    logging: {
      maxConsoleStatements: number;
      allowInDevelopment: boolean;
      allowInTests: boolean;
    };
    legacyPatterns: {
      bannedPatterns: string[];
      migrationPhase: string;
    };
    serviceExtraction: {
      minServiceScore: number;
      maxRouteComplexity: number;
    };
  };
  analysis: {
    includePatterns: string[];
    excludePatterns: string[];
    maxFileSize: number;
    timeoutMs: number;
    parallel: boolean;
    maxConcurrency: number;
  };
  reporting: {
    outputFormats: string[];
    includeRecommendations: boolean;
    groupBy: string;
    reports: {
      console: {
        enabled: boolean;
        showProgress: boolean;
        colorize: boolean;
      };
      json: {
        enabled: boolean;
        outputFile: string;
        includeRawData: boolean;
      };
      markdown: {
        enabled: boolean;
        outputFile: string;
        includeCharts: boolean;
      };
      html: {
        enabled: boolean;
        outputFile: string;
        includeCharts: boolean;
      };
    };
  };
  integrations: {
    github: {
      enabled: boolean;
      commentOnPR: boolean;
      setStatusChecks: boolean;
      createIssues: boolean;
    };
    slack: {
      enabled: boolean;
      webhookUrl?: string;
      notifyOnFailure: boolean;
      notifyOnSuccess: boolean;
    };
    jira: {
      enabled: boolean;
      projectKey?: string;
      createTicketsForIssues: boolean;
    };
  };
  friction: {
    enabled: boolean;
    velocity: {
      enabled: boolean;
      trackMetrics: string[];
    };
    quality: {
      enabled: boolean;
      impactThreshold: number;
      correlationWindow: number;
    };
    correlation: {
      enabled: boolean;
      minCorrelation: number;
      trackMetrics: string[];
    };
  };
  suppressions: Array<{
    id?: string;
    pattern?: string;
    rule?: string;
    reason?: string;
    expiresAt?: string;
    createdBy?: string;
  }>;
  baselines: {
    default: {
      complexity: number;
      duplication: number;
      coverage: number;
      maintainability: number;
    };
    packages: {
      server: {
        complexity: number;
        duplication: number;
        coverage: number;
        maintainability: number;
      };
      client: {
        complexity: number;
        duplication: number;
        coverage: number;
        maintainability: number;
      };
      shared: {
        complexity: number;
        duplication: number;
        coverage: number;
        maintainability: number;
      };
    };
  };
}

const config: QualityGateConfig = {
  qualityLevels: {
    quick: {
      description: 'Basic syntax and import checks only',
      requirements: ['syntax', 'imports'],
      timeout: 300,
      tolerance: 0,
    },
    standard: {
      description: 'Standard code quality checks',
      requirements: ['syntax', 'imports', 'eslint', 'typescript', 'formatting'],
      timeout: 600,
      tolerance: 0.05,
    },
    comprehensive: {
      description: 'Full quality analysis including metrics and smells',
      requirements: [
        'syntax', 'imports', 'eslint', 'typescript', 'formatting',
        'metrics', 'codesmells', 'duplication', 'complexity',
      ],
      timeout: 900,
      tolerance: 0.15,
    },
    strict: {
      description: 'Most rigorous checks including security and performance',
      requirements: [
        'syntax', 'imports', 'eslint', 'typescript', 'formatting',
        'metrics', 'codesmells', 'duplication', 'complexity',
        'security', 'performance', 'friction',
      ],
      timeout: 1200,
      tolerance: 0.30,
    },
  },

  critical: {
    build: {
      typescript: {
        enabled: true,
        maxErrors: 0,
        failOnWarning: false,
      },
      eslint: {
        enabled: true,
        maxErrors: 0,
        failOnWarning: false,
      },
      syntax: {
        enabled: true,
        checkFileSizes: true,
        maxFileSize: 1048576,
      },
    },

    security: {
      vulnerabilities: {
        enabled: true,
        maxCritical: 0,
        maxHigh: 0,
        allowlist: [],
      },
      secrets: {
        enabled: true,
        patterns: [
          'password.*[:=].*[\'"]([^\'"]+)',
          'secret.*[:=].*[\'"]([^\'"]+)',
          'api[_-]?key.*[:=].*[\'"]([^\'"]+)',
          'token.*[:=].*[\'"]([^\'"]+)',
          'private[_-]?key.*[:=].*[\'"]([^\'"]+)',
          '-----BEGIN.*PRIVATE.*KEY-----',
        ],
      },
      sqlInjection: {
        enabled: true,
        patterns: [
          'supabase\\.from.*select.*req\\.body',
          'supabase\\.from.*select.*req\\.query',
          'supabase\\.from.*select.*req\\.params',
        ],
      },
    },
  },

  high: {
    idConsistency: {
      enabled: true,
      targetScore: 95,
      criticalViolations: [
        'ObjectId.*new ObjectId',
        'mongoose.*Types\\.ObjectId',
        'require.*mongoose',
      ],
      tolerance: 0.05,
    },

    logging: {
      enabled: true,
      maxConsoleStatements: 5,
      allowInDevelopment: false,
      allowInTests: true,
      tolerance: 0.05,
    },

    legacyPatterns: {
      enabled: true,
      bannedPatterns: [
        'mongoose\\.',
        'ObjectId\\(',
        '\\.save\\(',
        '\\.findOne\\(',
        'new Schema\\(',
      ],
      migrationPhase: 'supabase_migration',
      tolerance: 0.05,
    },
  },

  medium: {
    complexity: {
      enabled: true,
      maxPerFunction: 10,
      maxPerFile: 50,
      maxNestingDepth: 4,
      tolerance: 0.15,
    },

    serviceExtraction: {
      enabled: true,
      minServiceScore: 70,
      maxRouteComplexity: 25,
      detectMixedConcerns: true,
      tolerance: 0.15,
    },

    coupling: {
      enabled: true,
      maxDependencies: 10,
      featureEnvyThreshold: 60,
      tolerance: 0.15,
    },
  },

  baseline: {
    codeQuality: {
      enabled: true,
      minMaintainabilityIndex: 70,
      maxTechnicalDebtRatio: 0.1,
      tolerance: 0.30,
    },

    styleConsistency: {
      enabled: true,
      enforceFormatting: true,
      checkNamingConventions: true,
      maxLineLength: 120,
      tolerance: 0.30,
    },

    fileSize: {
      enabled: true,
      maxLines: 500,
      maxFunctions: 20,
      maxClasses: 5,
      tolerance: 0.30,
    },
  },

  packages: {
    server: {
      routes: {
        maxComplexity: 15,
        maxLength: 200,
        requireJSDoc: false,
      },
      services: {
        maxComplexity: 20,
        maxMethods: 15,
        requireJSDoc: true,
      },
      controllers: {
        maxComplexity: 10,
        maxMethods: 10,
        requireJSDoc: true,
      },
      utils: {
        maxComplexity: 15,
        maxFunctions: 20,
        requireJSDoc: false,
      },
    },

    client: {
      components: {
        maxComplexity: 12,
        maxProps: 10,
        requirePropTypes: false,
      },
      hooks: {
        maxComplexity: 8,
        maxDependencies: 5,
        requireJSDoc: true,
      },
      services: {
        maxComplexity: 15,
        maxMethods: 12,
        requireJSDoc: true,
      },
    },

    shared: {
      types: {
        maxInterfaces: 50,
        maxUnions: 20,
        requireJSDoc: true,
      },
      utils: {
        maxComplexity: 10,
        maxFunctions: 15,
        requireJSDoc: true,
      },
    },
  },

  thresholds: {
    complexity: {
      maxPerFunction: 10,
      maxPerFile: 50,
      maxNestingDepth: 4,
    },
    duplication: {
      minLines: 10,
      similarityThreshold: 80,
    },
    fileSize: {
      maxLines: 500,
      maxFunctions: 20,
      maxClasses: 5,
    },
    coupling: {
      maxDependencies: 10,
      featureEnvyThreshold: 60,
    },
  },

  projectRules: {
    idConsistency: {
      targetScore: 95,
      criticalViolations: [
        'new ObjectId',
        'mongoose.Types.ObjectId',
        'require("mongoose")',
      ],
    },
    logging: {
      maxConsoleStatements: 5,
      allowInDevelopment: false,
      allowInTests: true,
    },
    legacyPatterns: {
      bannedPatterns: [
        'mongoose',
        'ObjectId',
        '\\.save\\(',
        '\\.findOne\\(',
      ],
      migrationPhase: 'supabase_migration',
    },
    serviceExtraction: {
      minServiceScore: 70,
      maxRouteComplexity: 25,
    },
  },

  analysis: {
    includePatterns: [
      'packages/**/*.ts',
      'packages/**/*.tsx',
    ],
    excludePatterns: [
      'packages/**/node_modules/**',
      'packages/**/dist/**',
      'packages/**/build/**',
      'packages/**/*.test.ts',
      'packages/**/*.spec.ts',
      'packages/**/__tests__/**',
    ],
    maxFileSize: 1048576,
    timeoutMs: 30000,
    parallel: true,
    maxConcurrency: 4,
  },

  reporting: {
    outputFormats: ['console', 'json', 'markdown'],
    includeRecommendations: true,
    groupBy: 'severity',
    reports: {
      console: {
        enabled: true,
        showProgress: true,
        colorize: true,
      },
      json: {
        enabled: true,
        outputFile: 'quality-report.json',
        includeRawData: false,
      },
      markdown: {
        enabled: true,
        outputFile: 'quality-report.md',
        includeCharts: false,
      },
      html: {
        enabled: false,
        outputFile: 'quality-report.html',
        includeCharts: true,
      },
    },
  },

  integrations: {
    github: {
      enabled: true,
      commentOnPR: true,
      setStatusChecks: true,
      createIssues: false,
    },
    slack: {
      enabled: false,
      webhookUrl: (typeof process !== 'undefined' && process.env) ? process.env.SLACK_WEBHOOK_URL : undefined,
      notifyOnFailure: true,
      notifyOnSuccess: false,
    },
    jira: {
      enabled: false,
      projectKey: (typeof process !== 'undefined' && process.env) ? process.env.JIRA_PROJECT_KEY : undefined,
      createTicketsForIssues: false,
    },
  },

  friction: {
    enabled: true,
    velocity: {
      enabled: true,
      trackMetrics: [
        'development_speed',
        'review_time',
        'merge_frequency',
        'rework_rate',
      ],
    },
    quality: {
      enabled: true,
      impactThreshold: 0.1,
      correlationWindow: 7,
    },
    correlation: {
      enabled: true,
      minCorrelation: 0.6,
      trackMetrics: [
        'complexity_trend',
        'smell_accumulation',
        'refactoring_frequency',
      ],
    },
  },

  suppressions: [],

  baselines: {
    default: {
      complexity: 8,
      duplication: 5,
      coverage: 80,
      maintainability: 75,
    },
    packages: {
      server: {
        complexity: 10,
        duplication: 8,
        coverage: 85,
        maintainability: 80,
      },
      client: {
        complexity: 6,
        duplication: 3,
        coverage: 75,
        maintainability: 70,
      },
      shared: {
        complexity: 5,
        duplication: 2,
        coverage: 90,
        maintainability: 85,
      },
    },
  },
};

export default config;
