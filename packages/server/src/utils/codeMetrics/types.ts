/**
 * Core metrics interfaces for code quality analysis
 * Supports comprehensive static analysis for the Attrition game codebase
 */

// Base interface for location tracking in source code
export interface CodeLocation {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
}

// Severity levels for code smells and metrics violations
export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low';

// Core metrics scores (0-100 scale for consistency)
export interface MetricsScores {
  overall: number;
  complexity: number;
  duplication: number;
  coupling: number;
  maintainability: number;
}

// Project-specific metrics for Attrition codebase
export interface ProjectSpecificMetrics {
  idConsistency: number;      // 0-100 UUID vs ObjectId consistency
  loggingScore: number;       // 0-100 console.log appropriateness
  legacyPatterns: number;     // 0-100 legacy code percentage
  serviceExtraction: number;  // 0-100 adherence to service pattern
}

// Individual code smell detection result
export interface CodeSmell {
  category: string;           // Bloaters, Duplicators, Couplers, etc.
  type: string;              // Specific smell type (LongMethod, DuplicatedCode, etc.)
  severity: SeverityLevel;
  location: CodeLocation;
  description: string;
  remediation: string;
  additionalData?: Record<string, any>; // For smell-specific data
}

// Core metrics output structure
export interface CodeMetrics {
  filePath: string;
  timestamp: Date;
  scores: MetricsScores;
  smells: CodeSmell[];
  projectSpecific: ProjectSpecificMetrics;
  metadata: {
    linesOfCode: number;
    functionCount: number;
    classCount: number;
    fileSize: number; // in bytes
    parsingErrors?: string[];
  };
}

// Threshold configuration for each metric type
export interface ComplexityThresholds {
  maxPerFunction: number;     // Cyclomatic complexity > this is smell
  maxPerFile: number;        // Total complexity per file
}

export interface DuplicationThresholds {
  minLines: number;          // Minimum lines to consider duplication
  similarityThreshold: number; // 0-100 percentage similarity
}

export interface FileSizeThresholds {
  maxLines: number;          // Maximum lines per file
  maxFunctions: number;      // Maximum functions per file
}

export interface CouplingThresholds {
  maxDependencies: number;   // Maximum external dependencies
  featureEnvyThreshold: number; // 0-100 feature envy score
}

// Main threshold configuration structure
export interface MetricsThresholds {
  complexity: ComplexityThresholds;
  duplication: DuplicationThresholds;
  fileSize: FileSizeThresholds;
  coupling: CouplingThresholds;
}

// Project-specific rules and configurations
export interface ProjectRules {
  idConsistency: {
    targetScore: number;      // Target consistency percentage
    criticalViolations: string[]; // Patterns that are critical violations
  };
  logging: {
    maxConsoleStatements: number; // Maximum console statements per file
    allowInDevelopment: boolean;  // Allow console statements in development
  };
  legacyPatterns: {
    bannedPatterns: string[];    // Regex patterns to ban
    migrationPhase: string;      // Current migration phase context
  };
  serviceExtraction: {
    minServiceScore: number;     // Minimum score for proper service extraction
    maxRouteComplexity: number;  // Maximum complexity before extraction needed
  };
}

// Main configuration interface
export interface MetricsConfig {
  thresholds: MetricsThresholds;
  projectRules: ProjectRules;
  analysis: {
    includePatterns: string[];   // File patterns to include (glob patterns)
    excludePatterns: string[];   // File patterns to exclude
    maxFileSize: number;         // Maximum file size to analyze (bytes)
    timeoutMs: number;          // Analysis timeout per file
  };
  reporting: {
    outputFormat: 'json' | 'xml' | 'html' | 'console';
    includeRecommendations: boolean;
    groupBy: 'file' | 'directory' | 'severity' | 'category';
  };
}

// Analysis result for a single file
export interface FileAnalysisResult {
  filePath: string;
  success: boolean;
  metrics?: CodeMetrics;
  error?: string;
  duration: number; // Analysis time in milliseconds
}

// Batch analysis results
export interface AnalysisResults {
  timestamp: Date;
  summary: {
    totalFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalSmells: number;
    averageScore: number;
  };
  files: FileAnalysisResult[];
  recommendations: string[];
}

// Threshold violation tracking
export interface ThresholdViolation {
  filePath: string;
  metric: keyof MetricsScores | keyof ProjectSpecificMetrics;
  currentValue: number;
  threshold: number;
  severity: SeverityLevel;
  location?: CodeLocation;
  description: string;
}

// Suppression rule for project-specific exceptions
export interface SuppressionRule {
  id: string;
  pattern: string;           // File path pattern (glob)
  rule: string;             // Rule identifier to suppress
  reason: string;           // Justification for suppression
  expiresAt?: Date;         // Optional expiration date
  createdBy?: string;       // Who created the suppression
}

// Metrics comparison for tracking improvements
export interface MetricsComparison {
  baseline: CodeMetrics;
  current: CodeMetrics;
  improvements: {
    metric: string;
    change: number;         // Positive = improvement
    percentage: number;     // Percentage change
  }[];
  regressions: {
    metric: string;
    change: number;         // Negative = regression
    percentage: number;     // Percentage change
  }[];
}

// Configuration validation result
export interface ConfigValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// AST node types for analysis
export interface ASTNode {
  type: string;
  start: CodeLocation;
  end: CodeLocation;
  children?: ASTNode[];
  metadata?: Record<string, any>;
}

// Complexity calculation result for a single function
export interface FunctionComplexity {
  name: string;
  location: CodeLocation;
  complexity: number;
  linesOfCode: number;
  parameterCount: number;
  nestingDepth: number;
}

// Duplication detection result
export interface DuplicationMatch {
  sourceFile: string;
  sourceLocation: CodeLocation;
  targetFile: string;
  targetLocation: CodeLocation;
  lines: number;
  similarity: number;       // 0-100 percentage
  content: string;
}

// Coupling analysis result
export interface CouplingAnalysis {
  filePath: string;
  dependencies: {
    file: string;
    type: 'import' | 'require' | 'dynamic-import';
    line: number;
  }[];
  couplingScore: number;    // 0-100 based on dependencies
}

// Legacy pattern detection
export interface LegacyPattern {
  pattern: string;          // Pattern identifier
  location: CodeLocation;
  description: string;
  replacement?: string;     // Suggested replacement
  migrationPhase: string;   // Which phase this should be addressed
}

// Service extraction analysis
export interface ServiceExtractionAnalysis {
  filePath: string;
  routeComplexity: number;
  mixedConcerns: {
    httpConcerns: number;     // Lines dealing with HTTP
    businessLogic: number;    // Lines with business logic
    dataAccess: number;       // Lines with data operations
  };
  extractionScore: number;   // 0-100 how well extracted
  recommendations: string[];
}