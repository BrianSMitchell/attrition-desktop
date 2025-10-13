/**
 * Core metrics collector for static code analysis
 * Implements comprehensive code quality metrics for Attrition codebase
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  CodeMetrics,
  CodeSmell,
  MetricsScores,
  ProjectSpecificMetrics,
  FileAnalysisResult,
  FunctionComplexity,
  DuplicationMatch,
  CouplingAnalysis,
  LegacyPattern,
  ServiceExtractionAnalysis,
  CodeLocation,
  SeverityLevel
} from './types';
import { MetricsConfig } from './types';

/**
 * Core metrics collector class for static code analysis
 */
export class MetricsCollector {
  private config: MetricsConfig;
  private fileCache: Map<string, string> = new Map();

  constructor(config: MetricsConfig) {
    this.config = config;
  }

  /**
   * Analyze a single file and return comprehensive metrics
   */
  async analyzeFile(filePath: string): Promise<FileAnalysisResult> {
    const startTime = Date.now();

    try {
      // Check file size constraints
      const stats = fs.statSync(filePath);
      if (stats.size > this.config.analysis.maxFileSize) {
        return {
          filePath,
          success: false,
          error: `File size ${stats.size} exceeds maximum ${this.config.analysis.maxFileSize}`,
          duration: Date.now() - startTime
        };
      }

      // Read and cache file content
      const content = fs.readFileSync(filePath, 'utf-8');
      this.fileCache.set(filePath, content);

      // Parse the code and calculate metrics
      const metrics = await this.calculateMetrics(filePath, content);

      return {
        filePath,
        success: true,
        metrics,
        duration: Date.now() - startTime
      };

    } catch (error) {
      return {
        filePath,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Calculate comprehensive metrics for a file
   */
  private async calculateMetrics(filePath: string, content: string): Promise<CodeMetrics> {
    const lines = content.split('\n');
    const smells: CodeSmell[] = [];

    // Calculate core metrics
    const complexityScore = await this.calculateComplexityScore(content, smells);
    const duplicationScore = await this.calculateDuplicationScore(filePath, content, smells);
    const couplingScore = await this.calculateCouplingScore(filePath, content, smells);
    const maintainabilityScore = this.calculateMaintainabilityScore(complexityScore, duplicationScore, couplingScore);

    // Project-specific metrics
    const projectSpecific = await this.calculateProjectSpecificMetrics(filePath, content, smells);

    // Overall score calculation
    const overallScore = this.calculateOverallScore(complexityScore, duplicationScore, couplingScore, maintainabilityScore, projectSpecific);

    return {
      filePath,
      timestamp: new Date(),
      scores: {
        overall: overallScore,
        complexity: complexityScore,
        duplication: duplicationScore,
        coupling: couplingScore,
        maintainability: maintainabilityScore
      },
      smells,
      projectSpecific,
      metadata: {
        linesOfCode: lines.length,
        functionCount: this.countFunctions(content),
        classCount: this.countClasses(content),
        fileSize: Buffer.byteLength(content, 'utf8'),
        parsingErrors: [] // Could be populated if parser encounters issues
      }
    };
  }

  /**
   * Calculate cyclomatic complexity score (0-100)
   */
  private async calculateComplexityScore(content: string, smells: CodeSmell[]): Promise<number> {
    const functions = this.extractFunctions(content);
    let totalComplexity = 0;
    let maxFunctionComplexity = 0;

    for (const func of functions) {
      const complexity = this.calculateCyclomaticComplexity(func.content);

      if (complexity > this.config.thresholds.complexity.maxPerFunction) {
        smells.push({
          category: 'Bloaters',
          type: 'LongMethod',
          severity: this.getComplexitySeverity(complexity),
          location: func.location,
          description: `Function complexity ${complexity} exceeds threshold ${this.config.thresholds.complexity.maxPerFunction}`,
          remediation: 'Extract complex logic into smaller functions or apply strategy pattern'
        });
      }

      totalComplexity += complexity;
      maxFunctionComplexity = Math.max(maxFunctionComplexity, complexity);
    }

    // Check file-level complexity
    if (totalComplexity > this.config.thresholds.complexity.maxPerFile) {
      smells.push({
        category: 'Bloaters',
        type: 'LargeClass',
        severity: 'high',
        location: { line: 1, column: 1 },
        description: `File complexity ${totalComplexity} exceeds threshold ${this.config.thresholds.complexity.maxPerFile}`,
        remediation: 'Consider splitting into multiple files or extracting services'
      });
    }

    // Convert to 0-100 score (higher complexity = lower score)
    const score = Math.max(0, 100 - (totalComplexity / 10));
    return Math.round(score);
  }

  /**
   * Calculate code duplication score (0-100)
   */
  private async calculateDuplicationScore(filePath: string, content: string, smells: CodeSmell[]): Promise<number> {
    const duplications = this.detectDuplications(filePath, content);

    for (const dup of duplications) {
      if (dup.similarity >= this.config.thresholds.duplication.similarityThreshold) {
        smells.push({
          category: 'Duplicators',
          type: 'DuplicatedCode',
          severity: dup.lines >= 20 ? 'high' : 'medium',
          location: dup.sourceLocation,
          description: `Duplicated code block of ${dup.lines} lines with ${dup.similarity}% similarity`,
          remediation: 'Extract common functionality into shared utility functions or services'
        });
      }
    }

    // Calculate duplication percentage
    const totalLines = content.split('\n').length;
    const duplicatedLines = duplications.reduce((sum, dup) => sum + dup.lines, 0);
    const duplicationPercentage = totalLines > 0 ? (duplicatedLines / totalLines) * 100 : 0;

    // Convert to 0-100 score (higher duplication = lower score)
    const score = Math.max(0, 100 - duplicationPercentage);
    return Math.round(score);
  }

  /**
   * Calculate coupling score (0-100)
   */
  private async calculateCouplingScore(filePath: string, content: string, smells: CodeSmell[]): Promise<number> {
    const coupling = this.analyzeCoupling(filePath, content);

    if (coupling.couplingScore > 70) {
      smells.push({
        category: 'Couplers',
        type: 'HighCoupling',
        severity: 'medium',
        location: { line: 1, column: 1 },
        description: `High coupling score: ${coupling.couplingScore}% with ${coupling.dependencies.length} dependencies`,
        remediation: 'Consider dependency injection or facade pattern to reduce coupling'
      });
    }

    // Convert to 0-100 score (higher coupling = lower score)
    const score = Math.max(0, 100 - coupling.couplingScore);
    return Math.round(score);
  }

  /**
   * Calculate maintainability score based on other metrics
   */
  private calculateMaintainabilityScore(complexity: number, duplication: number, coupling: number): number {
    // Weighted calculation favoring lower complexity and coupling
    const score = (complexity * 0.4) + (duplication * 0.3) + (coupling * 0.3);
    return Math.round(score);
  }

  /**
   * Calculate project-specific metrics for Attrition
   */
  private async calculateProjectSpecificMetrics(filePath: string, content: string, smells: CodeSmell[]): Promise<ProjectSpecificMetrics> {
    const idConsistency = this.calculateIdConsistency(content, smells);
    const loggingScore = this.calculateLoggingScore(content, smells);
    const legacyPatterns = this.calculateLegacyPatternScore(content, smells);
    const serviceExtraction = this.calculateServiceExtractionScore(filePath, content, smells);

    return {
      idConsistency,
      loggingScore,
      legacyPatterns,
      serviceExtraction
    };
  }

  /**
   * Calculate ID consistency score (UUID vs ObjectId usage)
   */
  private calculateIdConsistency(content: string, smells: CodeSmell[]): number {
    const uuidMatches = this.countPatternMatches(content, /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi);
    const objectIdMatches = this.countPatternMatches(content, /ObjectId\(['"`][0-9a-f]{24}['"`]\)|new ObjectId|m\.Types\.ObjectId/g);

    const totalIds = uuidMatches + objectIdMatches;

    if (totalIds === 0) {
      return 100; // No IDs to be inconsistent about
    }

    const uuidPercentage = (uuidMatches / totalIds) * 100;

    // Check for critical violations
    const criticalViolations = this.config.projectRules.idConsistency.criticalViolations;
    for (const violation of criticalViolations) {
      if (new RegExp(violation).test(content)) {
        smells.push({
          category: 'Project Specific',
          type: 'CriticalIdViolation',
          severity: 'critical',
          location: this.findPatternLocation(content, violation),
          description: `Critical ID violation: ${violation}`,
          remediation: 'Replace ObjectId usage with UUID for consistency'
        });
      }
    }

    return Math.round(uuidPercentage);
  }

  /**
   * Calculate logging appropriateness score
   */
  private calculateLoggingScore(content: string, smells: CodeSmell[]): number {
    const consoleMatches = this.countPatternMatches(content, /console\.(log|warn|error|info|debug)/g);
    const totalLines = content.split('\n').length;

    if (consoleMatches > this.config.projectRules.logging.maxConsoleStatements) {
      smells.push({
        category: 'Project Specific',
        type: 'ExcessiveLogging',
        severity: 'medium',
        location: { line: 1, column: 1 },
        description: `${consoleMatches} console statements exceed limit of ${this.config.projectRules.logging.maxConsoleStatements}`,
        remediation: 'Replace console statements with proper logging service'
      });
    }

    // Calculate score (fewer console statements = higher score)
    const ratio = totalLines > 0 ? consoleMatches / totalLines : 0;
    const score = Math.max(0, 100 - (ratio * 1000)); // Penalize heavily for console statements
    return Math.round(score);
  }

  /**
   * Calculate legacy pattern usage score
   */
  private calculateLegacyPatternScore(content: string, smells: CodeSmell[]): number {
    let legacyCount = 0;

    for (const pattern of this.config.projectRules.legacyPatterns.bannedPatterns) {
      const matches = this.countPatternMatches(content, new RegExp(pattern, 'g'));
      legacyCount += matches;

      if (matches > 0) {
        smells.push({
          category: 'Project Specific',
          type: 'LegacyPattern',
          severity: 'high',
          location: this.findPatternLocation(content, pattern),
          description: `Legacy pattern detected: ${pattern} (${matches} occurrences)`,
          remediation: `Update to current ${this.config.projectRules.legacyPatterns.migrationPhase} patterns`
        });
      }
    }

    const totalLines = content.split('\n').length;
    const legacyPercentage = totalLines > 0 ? (legacyCount / totalLines) * 100 : 0;

    // Convert to score (fewer legacy patterns = higher score)
    const score = Math.max(0, 100 - legacyPercentage);
    return Math.round(score);
  }

  /**
   * Calculate service extraction adherence score
   */
  private calculateServiceExtractionScore(filePath: string, content: string, smells: CodeSmell[]): number {
    const analysis = this.analyzeServiceExtraction(filePath, content);

    if (analysis.extractionScore < this.config.projectRules.serviceExtraction.minServiceScore) {
      smells.push({
        category: 'Project Specific',
        type: 'ServiceExtractionNeeded',
        severity: 'medium',
        location: { line: 1, column: 1 },
        description: `Service extraction score ${analysis.extractionScore}% below threshold ${this.config.projectRules.serviceExtraction.minServiceScore}%`,
        remediation: analysis.recommendations.join('; ')
      });
    }

    return Math.round(analysis.extractionScore);
  }

  /**
   * Calculate overall composite score
   */
  private calculateOverallScore(complexity: number, duplication: number, coupling: number, maintainability: number, projectSpecific: ProjectSpecificMetrics): number {
    // Weighted average with project-specific metrics having significant influence
    const coreScore = (complexity + duplication + coupling + maintainability) / 4;
    const projectScore = (
      projectSpecific.idConsistency +
      projectSpecific.loggingScore +
      projectSpecific.legacyPatterns +
      projectSpecific.serviceExtraction
    ) / 4;

    // Project-specific metrics have 40% weight due to current migration context
    const overallScore = (coreScore * 0.6) + (projectScore * 0.4);
    return Math.round(overallScore);
  }

  /**
   * Calculate cyclomatic complexity for a function
   */
  private calculateCyclomaticComplexity(functionContent: string): number {
    let complexity = 1; // Base complexity

    // Count decision points
    const decisionPatterns = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /case\s+/g,
      /\?\s*[^:]+:/g, // Ternary operator
      /catch\s*\(/g,
      /&&/g,
      /\|\|/g
    ];

    for (const pattern of decisionPatterns) {
      const matches = functionContent.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Extract functions from source code
   */
  private extractFunctions(content: string): Array<{ name: string; content: string; location: CodeLocation }> {
    const functions: Array<{ name: string; content: string; location: CodeLocation }> = [];
    const lines = content.split('\n');

    // Simple regex-based function extraction (in production, use proper AST parser)
    const functionRegex = /(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:\([^)]*\)\s*=>|function\s*\([^)]*\)))/g;
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
      const startLine = content.substring(0, match.index).split('\n').length;
      const endLine = startLine + match[0].split('\n').length;

      functions.push({
        name: match[1] || match[2] || 'anonymous',
        content: match[0],
        location: { line: startLine, column: 1, endLine }
      });
    }

    return functions;
  }

  /**
   * Detect code duplications within and across files
   */
  private detectDuplications(filePath: string, content: string): DuplicationMatch[] {
    const duplications: DuplicationMatch[] = [];
    const lines = content.split('\n');
    const windowSize = Math.min(this.config.thresholds.duplication.minLines, lines.length);

    // Simple duplication detection within file
    for (let i = 0; i <= lines.length - windowSize; i++) {
      const window = lines.slice(i, i + windowSize).join('\n');

      for (let j = i + windowSize; j <= lines.length - windowSize; j++) {
        const compareWindow = lines.slice(j, j + windowSize).join('\n');
        const similarity = this.calculateSimilarity(window, compareWindow);

        if (similarity >= this.config.thresholds.duplication.similarityThreshold) {
          duplications.push({
            sourceFile: filePath,
            sourceLocation: { line: i + 1, column: 1 },
            targetFile: filePath,
            targetLocation: { line: j + 1, column: 1 },
            lines: windowSize,
            similarity,
            content: window
          });
        }
      }
    }

    return duplications;
  }

  /**
   * Analyze coupling metrics for a file
   */
  private analyzeCoupling(filePath: string, content: string): CouplingAnalysis {
    const dependencies = this.extractDependencies(content);

    // Calculate coupling score based on number and type of dependencies
    let couplingScore = 0;

    if (dependencies.length > this.config.thresholds.coupling.maxDependencies) {
      couplingScore = Math.min(100, (dependencies.length / this.config.thresholds.coupling.maxDependencies) * 100);
    } else {
      couplingScore = (dependencies.length / this.config.thresholds.coupling.maxDependencies) * 70; // Scale to 0-70
    }

    return {
      filePath,
      dependencies,
      couplingScore: Math.round(couplingScore)
    };
  }

  /**
   * Extract dependencies from source code
   */
  private extractDependencies(content: string): Array<{ file: string; type: 'import' | 'require' | 'dynamic-import'; line: number }> {
    const dependencies: Array<{ file: string; type: 'import' | 'require' | 'dynamic-import'; line: number }> = [];

    // Extract ES6 imports
    const importRegex = /import\s+.*from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    let lineNumber = 1;

    for (const line of content.split('\n')) {
      // ES6 imports
      const importMatch = importRegex.exec(line);
      if (importMatch) {
        dependencies.push({
          file: importMatch[1],
          type: 'import',
          line: lineNumber
        });
      }

      // CommonJS requires
      const requireMatch = /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/.exec(line);
      if (requireMatch) {
        dependencies.push({
          file: requireMatch[1],
          type: 'require',
          line: lineNumber
        });
      }

      // Dynamic imports
      const dynamicMatch = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/.exec(line);
      if (dynamicMatch) {
        dependencies.push({
          file: dynamicMatch[1],
          type: 'dynamic-import',
          line: lineNumber
        });
      }

      lineNumber++;
    }

    return dependencies;
  }

  /**
   * Analyze service extraction opportunities
   */
  private analyzeServiceExtraction(filePath: string, content: string): ServiceExtractionAnalysis {
    const lines = content.split('\n');
    let httpConcerns = 0;
    let businessLogic = 0;
    let dataAccess = 0;

    for (const line of lines) {
      // Count HTTP concerns
      if (/res\.|req\.|router\.|app\./.test(line)) {
        httpConcerns++;
      }

      // Count business logic
      if (/calculate|process|validate|transform|compute/.test(line.toLowerCase())) {
        businessLogic++;
      }

      // Count data access
      if (/\.find\(|\.create\(|\.update\(|\.delete\(|\.query\(|\.from\(/.test(line)) {
        dataAccess++;
      }
    }

    const totalConcerns = httpConcerns + businessLogic + dataAccess;
    const extractionScore = totalConcerns > 0 ? (businessLogic / totalConcerns) * 100 : 100;

    const recommendations: string[] = [];

    if (httpConcerns > businessLogic + dataAccess) {
      recommendations.push('Consider extracting business logic to service classes');
    }

    if (dataAccess > businessLogic) {
      recommendations.push('Consider repository pattern for data access');
    }

    if (extractionScore < 50) {
      recommendations.push('High mixed concerns detected - apply service extraction pattern');
    }

    return {
      filePath,
      routeComplexity: this.calculateCyclomaticComplexity(content),
      mixedConcerns: {
        httpConcerns,
        businessLogic,
        dataAccess
      },
      extractionScore,
      recommendations
    };
  }

  /**
   * Helper methods
   */
  private countPatternMatches(content: string, pattern: RegExp): number {
    const matches = content.match(pattern);
    return matches ? matches.length : 0;
  }

  private findPatternLocation(content: string, pattern: string): CodeLocation {
    const regex = new RegExp(pattern);
    const match = regex.exec(content);
    if (match) {
      const beforeMatch = content.substring(0, match.index);
      const line = beforeMatch.split('\n').length;
      return { line, column: 1 };
    }
    return { line: 1, column: 1 };
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple similarity calculation using Levenshtein distance approach
    const longer = text1.length > text2.length ? text1 : text2;
    const shorter = text1.length > text2.length ? text2 : text1;

    if (longer.length === 0) {
      return 100;
    }

    const editDistance = this.levenshteinDistance(longer, shorter);
    return ((longer.length - editDistance) / longer.length) * 100;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private countFunctions(content: string): number {
    return this.countPatternMatches(content, /function\s+\w+|const\s+\w+\s*=\s*(?:\([^)]*\)\s*=>|\([^)]*\)\s*=>)/g);
  }

  private countClasses(content: string): number {
    return this.countPatternMatches(content, /class\s+\w+/g);
  }

  private getComplexitySeverity(complexity: number): SeverityLevel {
    if (complexity > 20) return 'critical';
    if (complexity > 15) return 'high';
    if (complexity > 10) return 'medium';
    return 'low';
  }
}