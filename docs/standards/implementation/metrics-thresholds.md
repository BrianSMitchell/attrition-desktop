# Metrics Thresholds Mapping

## Overview

This document maps industry standards and project requirements to specific code metrics thresholds and quality gates. It provides the quantitative foundation for measuring code quality across the Attrition codebase.

## Standards to Metrics Thresholds Mapping

### Fowler's Taxonomy Thresholds

#### 1. Bloaters Metrics

**Long Method Thresholds**
```typescript
interface LongMethodThresholds {
  maxLines: 50;              // Industry standard: 50 lines
  maxComplexity: 10;         // Cyclomatic complexity
  maxParameters: 5;          // Project standard: 5 params max
  maxNestingDepth: 4;        // Maximum nesting levels
  projectMaxLines: 20;       // Project-specific for game logic
}
```

**Large Class Thresholds**
```typescript
interface LargeClassThresholds {
  maxLines: 300;             // Project standard: 300 lines
  maxMethods: 15;            // Maximum methods per class
  maxFields: 20;             // Maximum fields per class
  maxComplexity: 50;         // Total complexity per class
  maxCoupling: 10;           // External dependencies
}
```

**Code Duplication Thresholds**
```typescript
interface DuplicationThresholds {
  minBlockSize: 10;          // Minimum lines for duplication detection
  maxFileDuplication: 5;     // Max 5% duplication per file
  maxProjectDuplication: 3;  // Max 3% total project duplication
  similarityThreshold: 85;   // 85% similarity threshold
}
```

#### 2. Complexity Metrics

**Cyclomatic Complexity Thresholds**
```typescript
interface ComplexityThresholds {
  maxPerFunction: 10;        // Functions > 10 are complex
  maxPerFile: 50;           // Files > 50 total complexity
  maxPerClass: 50;          // Classes > 50 need refactoring
  maxNestingDepth: 4;       // Maximum nesting levels
  maxSwitchCases: 10;       // Switch statements > 10 cases
}
```

**Cognitive Complexity Thresholds**
```typescript
interface CognitiveComplexityThresholds {
  maxPerFunction: 8;         // Cognitive complexity threshold
  maxNestingIncrement: 1;    // Points per nesting level
  maxStructuralIncrement: 1; // Points per structural element
}
```

#### 3. Coupling Metrics

**Coupling Thresholds**
```typescript
interface CouplingThresholds {
  maxDependencies: 10;       // External dependencies per module
  maxImports: 15;           // Import statements per file
  maxFeatureEnvy: 70;       // Feature envy percentage threshold
  maxLawOfDemeterViolations: 5; // Direct object navigation chains
}
```

### Project-Specific Thresholds

#### 1. ID Consistency Metrics

**UUID Consistency Thresholds**
```typescript
interface IdConsistencyThresholds {
  targetScore: 90;           // Target 90% UUID consistency
  criticalViolations: [
    'ObjectId\\(',           // Direct ObjectId usage
    'mongoose\\.Types\\.ObjectId', // Mongoose ObjectId
    'new ObjectId'           // ObjectId instantiation
  ];
  allowedPatterns: [
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ];
}
```

#### 2. Legacy Pattern Metrics

**MongoDB Pattern Thresholds**
```typescript
interface LegacyPatternThresholds {
  bannedPatterns: [
    'mongoose\\.',
    'ObjectId\\(',
    'findOne\\(',
    'insertOne\\(',
    'updateOne\\(',
    'deleteOne\\(',
    'collection\\.'
  ];
  migrationPhase: 'Phase 5';
  tolerancePercentage: 0;    // Zero tolerance for legacy patterns
}
```

#### 3. Service Extraction Metrics

**Service Extraction Thresholds**
```typescript
interface ServiceExtractionThresholds {
  minServiceScore: 80;       // 80% service extraction score required
  maxRouteComplexity: 15;    // Routes > 15 complexity need extraction
  maxMixedConcerns: 3;       // Maximum different concern types
  minControllerSeparation: 90; // 90% of HTTP logic in controllers
}
```

### Quality Gates Configuration

#### Critical Quality Gates (0% Tolerance)

**Critical Thresholds**
```typescript
interface CriticalThresholds {
  compilationErrors: 0;      // Must be 0 TypeScript errors
  securityVulnerabilities: 0; // Must be 0 known vulnerabilities
  idConsistencyScore: 100;   // Must be 100% UUID consistency
  criticalSmellsCount: 0;    // Must be 0 critical code smells
}
```

#### High Quality Gates (<5% Tolerance)

**High Thresholds**
```typescript
interface HighThresholds {
  consoleStatementCount: 5;  // Max 5 console statements per file
  legacyPatternPercentage: 5; // Max 5% legacy patterns
  codeDuplicationPercentage: 5; // Max 5% code duplication
  testCoverageCritical: 80;  // Min 80% coverage for critical paths
}
```

#### Medium Quality Gates (<15% Tolerance)

**Medium Thresholds**
```typescript
interface MediumThresholds {
  serviceExtractionScore: 85; // Min 85% service extraction score
  complexityScore: 85;       // Min 85% complexity compliance
  maintainabilityIndex: 70;  // Min 70 maintainability index
  technicalDebtRatio: 10;    // Max 10% technical debt increase
}
```

#### Baseline Quality Gates (<30% Tolerance)

**Baseline Thresholds**
```typescript
interface BaselineThresholds {
  overallCodeSmellScore: 70; // Min 70% code smell compliance
  styleConsistencyScore: 85; // Min 85% style consistency
  documentationScore: 75;    // Min 75% documentation coverage
  duplicationScore: 80;      // Min 80% duplication compliance
}
```

## Metrics Collection Configuration

### File Analysis Settings
```typescript
interface AnalysisConfig {
  includePatterns: [
    'packages/server/src/**/*.ts',
    'packages/client/src/**/*.{ts,tsx}'
  ];
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/coverage/**',
    '**/*.d.ts',
    '**/test/**',
    '**/tests/**'
  ];
  maxFileSize: 1048576;      // 1MB max file size
  timeoutMs: 10000;          // 10 second timeout per file
}
```

### Reporting Configuration
```typescript
interface ReportingConfig {
  outputFormat: 'json' | 'xml' | 'html' | 'console';
  includeRecommendations: true;
  groupBy: 'file' | 'directory' | 'severity' | 'category';
  generateGraphs: true;
  trendAnalysis: true;
}
```

## Threshold Validation System

### Threshold Validation Rules
```typescript
interface ThresholdValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];

  // Validation logic
  validateThresholds(thresholds: MetricsThresholds): ThresholdValidation {
    const errors: string[] = [];

    // Validate complexity thresholds
    if (thresholds.complexity.maxPerFunction < 1) {
      errors.push('Complexity threshold must be >= 1');
    }

    if (thresholds.complexity.maxPerFunction > 50) {
      warnings.push('Complexity threshold > 50 may be too lenient');
    }

    // Validate duplication thresholds
    if (thresholds.duplication.similarityThreshold < 50) {
      errors.push('Similarity threshold must be >= 50%');
    }

    // Project-specific validations
    if (thresholds.projectSpecific.idConsistency.targetScore < 90) {
      warnings.push('ID consistency target should be >= 90%');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      suggestions: []
    };
  }
}
```

## Metrics Integration with CI/CD

### Pre-commit Hooks
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run metrics collection
npm run metrics:collect

# Check critical thresholds
npm run metrics:validate-critical

# Block commit if critical thresholds exceeded
if [ $? -ne 0 ]; then
  echo "❌ Critical quality gates failed. Please fix issues before committing."
  exit 1
fi
```

### Pull Request Quality Gates
```yaml
# .github/workflows/quality-gates.yml
name: Quality Gates
on: [pull_request]

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install dependencies
        run: npm ci

      - name: Run metrics collection
        run: npm run metrics:collect

      - name: Validate thresholds
        run: npm run metrics:validate-all

      - name: Upload metrics report
        uses: actions/upload-artifact@v2
        with:
          name: metrics-report
          path: reports/metrics.json
```

## Real-time Monitoring

### IDE Integration
```typescript
// VS Code Extension for real-time metrics
class MetricsProvider implements vscode.TreeDataProvider<MetricItem> {
  getTreeItem(element: MetricItem): vscode.TreeItem {
    const item = new vscode.TreeItem(element.label);

    // Color coding based on thresholds
    if (element.score < 70) {
      item.iconPath = new vscode.ThemeIcon('error');
      item.tooltip = 'Below threshold - needs attention';
    } else if (element.score < 85) {
      item.iconPath = new vscode.ThemeIcon('warning');
      item.tooltip = 'Below target - consider improvement';
    } else {
      item.iconPath = new vscode.ThemeIcon('pass');
      item.tooltip = 'Meeting standards';
    }

    return item;
  }
}
```

### Dashboard Integration
```typescript
interface MetricsDashboard {
  currentScores: MetricsScores;
  trendData: MetricsTrend[];
  violations: ThresholdViolation[];
  recommendations: string[];

  // Real-time updates
  subscribeToMetrics(callback: (metrics: MetricsUpdate) => void): void;
}
```

## Threshold Evolution Strategy

### Continuous Improvement Process
1. **Monthly Review**: Analyze metrics trends and developer feedback
2. **Threshold Adjustment**: Gradually tighten thresholds based on team performance
3. **Standard Updates**: Update standards documentation with new thresholds
4. **Team Communication**: Communicate threshold changes and rationale

### Threshold Tuning Guidelines
```typescript
interface ThresholdTuning {
  // Gradual tightening
  tightenThreshold(current: number, target: number, step: number): number {
    const next = Math.min(current - step, target);
    return Math.max(next, 0); // Never go below 0
  }

  // Team performance consideration
  adjustForTeamPerformance(threshold: number, teamScore: number): number {
    if (teamScore > 95) {
      return this.tightenThreshold(threshold, threshold * 0.9, 1);
    } else if (teamScore < 70) {
      return threshold * 1.1; // Slightly relax if team struggling
    }
    return threshold;
  }
}
```

## Metrics-Driven Development

### Development Workflow Integration
```typescript
interface MetricsDrivenWorkflow {
  // Pre-development
  getCurrentMetrics(): Promise<CurrentMetrics>;

  // During development
  validateIncrementalChange(change: CodeChange): Promise<ValidationResult>;

  // Post-development
  validateFinalSubmission(code: CodeSubmission): Promise<SubmissionResult>;
}
```

### Quality Improvement Tracking
```typescript
interface QualityImprovement {
  baseline: MetricsSnapshot;
  current: MetricsSnapshot;
  improvements: MetricDelta[];

  // Track improvement over time
  calculateImprovementRate(): number {
    const timeDelta = this.current.timestamp - this.baseline.timestamp;
    const scoreDelta = this.current.overallScore - this.baseline.overallScore;
    return (scoreDelta / timeDelta) * 100; // Percentage per millisecond
  }
}
```

## Best Practices Summary

### Threshold Setting Guidelines
- **Start Conservative**: Begin with achievable thresholds, tighten over time
- **Team Input**: Involve team in threshold setting decisions
- **Regular Review**: Monthly review of threshold effectiveness
- **Clear Communication**: Document rationale for threshold changes

### Metrics Usage Guidelines
- **Actionable Insights**: Metrics should drive specific improvement actions
- **Trend Analysis**: Focus on trends, not absolute numbers
- **Context Awareness**: Consider project phase and team experience
- **Balanced View**: Use multiple metrics for comprehensive assessment

## References

- [Code Metrics: Measuring Software Quality](https://www.sei.cmu.edu/reports/03tr009.pdf)
- [Software Quality Metrics](https://www.ibm.com/cloud/learn/software-quality-metrics)
- [Technical Debt Management](https://martinfowler.com/bliki/TechnicalDebt.html)

## Version History

- **v1.0**: Initial metrics thresholds mapping
- **v1.1**: Added project-specific thresholds and quality gates
- **v1.2**: Enhanced CI/CD integration and real-time monitoring

## Last Updated

2025-10-10