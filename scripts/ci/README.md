# Attrition Quality Gate System

## Overview

The Attrition Quality Gate System provides comprehensive automated code quality analysis, security scanning, and development friction monitoring integrated into the CI/CD pipeline. This system ensures that only high-quality code reaches production by enforcing multiple quality gates with different tolerance levels.

## Architecture

```
Quality Gate System
├── GitHub Actions Workflows
│   ├── quality-gate.yml           # Main quality gate pipeline
│   ├── code-smell-detection.yml   # Automated smell detection
│   ├── metrics-collection.yml     # Metrics and trend analysis
│   └── security-scan.yml          # Security vulnerability scanning
├── CI Scripts
│   ├── quality-gate.sh           # Main quality gate executor
│   ├── code-smell-detector.sh    # Code smell detection
│   ├── metrics-collector.sh      # Metrics collection (planned)
│   └── friction-monitor.sh       # Friction monitoring (planned)
├── Setup Scripts
│   └── install-quality-tools.sh  # Quality tools installation
└── Configuration
    └── quality-gate.config.js    # Quality gate configuration
```

## Quality Gates

### Gate 0 (Critical) - Zero Tolerance
- **Build Failures**: TypeScript compilation errors
- **Critical Security Issues**: Vulnerabilities that must be fixed immediately
- **Syntax Errors**: Code that doesn't compile or run

### Gate 1 (High) - <5% Tolerance
- **ID Consistency**: UUID vs ObjectId usage patterns
- **Console Logging**: Inappropriate console.log usage
- **Legacy Patterns**: Outdated code patterns that should be modernized

### Gate 2 (Medium) - <15% Tolerance
- **Complexity Limits**: Cyclomatic complexity violations
- **Service Extraction**: Opportunities for service-oriented architecture
- **Coupling Standards**: Dependencies and feature envy issues

### Gate 3 (Baseline) - <30% Tolerance
- **Code Quality**: General maintainability issues
- **Style Consistency**: Formatting and naming violations
- **File Size Standards**: Large files that should be split

## Quick Start

### 1. Install Quality Tools

```bash
# Install quality tools for all packages
./scripts/setup/install-quality-tools.sh

# Or install for a specific package
./scripts/setup/install-quality-tools.sh --package server
```

### 2. Run Quality Checks

```bash
# Run standard quality gate
./scripts/ci/quality-gate.sh --level standard

# Run comprehensive quality analysis
./scripts/ci/quality-gate.sh --level comprehensive --package server

# Run code smell detection
./scripts/ci/code-smell-detector.sh --package server --output json

# Run with auto-fix
./scripts/ci/quality-gate.sh --level standard --fix
```

### 3. Set Up GitHub Actions

1. Copy workflow files from `.github/workflows/quality/` to `.github/workflows/`
2. Configure webhook URLs in `packages/server/quality-gate.config.js`
3. Enable branch protection rules for quality gate checks

## Usage Guide

### Quality Gate Levels

#### Quick Level
```bash
./scripts/ci/quality-gate.sh --level quick
```
- Basic syntax and import validation
- Fastest execution (under 5 minutes)
- Suitable for pre-commit hooks

#### Standard Level
```bash
./scripts/ci/quality-gate.sh --level standard
```
- ESLint rules enforcement
- TypeScript compilation checks
- Formatting validation
- Recommended for regular development

#### Comprehensive Level
```bash
./scripts/ci/quality-gate.sh --level comprehensive
```
- All standard checks
- Code metrics analysis
- Code smell detection
- Duplication analysis
- Suitable for pull requests

#### Strict Level
```bash
./scripts/ci/quality-gate.sh --level strict
```
- All comprehensive checks
- Security vulnerability scanning
- Performance analysis
- Friction monitoring
- Recommended for main branch merges

### Package-Specific Analysis

```bash
# Analyze only server package
./scripts/ci/quality-gate.sh --package server

# Analyze multiple packages
./scripts/ci/quality-gate.sh --package "server client"

# Analyze with different quality levels per package
./scripts/ci/quality-gate.sh --level comprehensive --package server
```

### Output Formats

```bash
# Console output (default)
./scripts/ci/quality-gate.sh --output console

# JSON output for automation
./scripts/ci/quality-gate.sh --output json

# HTML report for documentation
./scripts/ci/quality-gate.sh --output html

# Markdown for GitHub comments
./scripts/ci/quality-gate.sh --output markdown
```

### Code Smell Detection

```bash
# Detect all code smells
./scripts/ci/code-smell-detector.sh --package server

# Detect specific smell categories
./scripts/ci/code-smell-detector.sh --category bloaters
./scripts/ci/code-smell-detector.sh --category couplers
./scripts/ci/code-smell-detector.sh --category duplicators
./scripts/ci/code-smell-detector.sh --category project

# Different threshold levels
./scripts/ci/code-smell-detector.sh --threshold critical
./scripts/ci/code-smell-detector.sh --threshold high
```

## Configuration

### Quality Gate Configuration

The main configuration file is located at `packages/server/quality-gate.config.js`:

```javascript
module.exports = {
  // Quality gate level definitions
  qualityLevels: {
    quick: { requirements: ['syntax', 'imports'], timeout: 300 },
    standard: { requirements: ['syntax', 'imports', 'eslint'], timeout: 600 },
    comprehensive: { requirements: ['syntax', 'imports', 'eslint', 'metrics'], timeout: 900 },
    strict: { requirements: ['syntax', 'imports', 'eslint', 'metrics', 'security'], timeout: 1200 }
  },

  // Tolerance levels by gate
  critical: { maxErrors: 0 },           // 0% tolerance
  high: { tolerance: 0.05 },            // 5% tolerance
  medium: { tolerance: 0.15 },          // 15% tolerance
  baseline: { tolerance: 0.30 }         // 30% tolerance
};
```

### Threshold Customization

Customize thresholds in the configuration file:

```javascript
// Complexity thresholds
complexity: {
  maxPerFunction: 10,    // Max cyclomatic complexity per function
  maxPerFile: 50,        // Max complexity per file
  maxNestingDepth: 4     // Max nesting depth
}

// Duplication thresholds
duplication: {
  minLines: 10,          // Minimum lines to consider duplication
  similarityThreshold: 80 // Similarity percentage
}
```

## Integration with Existing Tools

### ESLint Integration

The quality gate system integrates with your existing ESLint setup:

```bash
# Use existing ESLint configuration
./scripts/ci/quality-gate.sh --level standard

# Use CI-specific ESLint rules (stricter)
# The system automatically detects and uses .eslintrc.ci.js if available
```

### Code Metrics Integration

Leverages the existing metrics system:

```bash
# Run metrics collection
./scripts/ci/quality-gate.sh --level comprehensive

# Access metrics data
# Results available in packages/server/dist/utils/codeMetrics/
```

### Friction Monitoring Integration

Uses the existing friction monitoring system:

```bash
# Include friction analysis in quality gate
./scripts/ci/quality-gate.sh --level strict

# Run friction analysis separately
./scripts/ci/friction-monitor.sh
```

## CI/CD Integration

### GitHub Actions Setup

1. **Copy workflow files**:
   ```bash
   cp .github/workflows/quality/*.yml .github/workflows/
   ```

2. **Configure branch protection**:
   - Go to GitHub repository settings
   - Enable branch protection for `main` and `develop`
   - Require status checks to pass
   - Add quality gate checks as required status checks

3. **Set up notifications**:
   ```javascript
   // In quality-gate.config.js
   integrations: {
     slack: {
       enabled: true,
       webhookUrl: process.env.SLACK_WEBHOOK_URL,
       notifyOnFailure: true
     }
   }
   ```

### Pre-commit Hooks

Set up quality checks before commits:

```bash
# The installer creates pre-commit hooks automatically
./scripts/setup/install-quality-tools.sh

# Manual pre-commit setup
ln -sf ../../../scripts/ci/quality-gate.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

## Troubleshooting

### Common Issues

#### Quality Gate Fails Unexpectedly
```bash
# Run with verbose output
./scripts/ci/quality-gate.sh --level standard --output console

# Check specific package
./scripts/ci/quality-gate.sh --package server --level quick
```

#### Code Smell Detection Issues
```bash
# Run with different threshold
./scripts/ci/code-smell-detector.sh --threshold medium

# Target specific category
./scripts/ci/code-smell-detector.sh --category project
```

#### Installation Problems
```bash
# Force reinstall tools
./scripts/setup/install-quality-tools.sh --force

# Check package structure
ls -la packages/server/src/utils/codeMetrics/
```

### Debug Mode

Enable debug mode for detailed logging:

```bash
# Set debug environment variable
DEBUG=1 ./scripts/ci/quality-gate.sh --level standard

# Or modify the script to enable debug output
```

## Best Practices

### Development Workflow

1. **Pre-commit**: Run quick quality checks
   ```bash
   ./scripts/ci/quality-gate.sh --level quick
   ```

2. **Pull Request**: Run comprehensive checks
   ```bash
   ./scripts/ci/quality-gate.sh --level comprehensive
   ```

3. **Main Branch**: Run strict checks including security
   ```bash
   ./scripts/ci/quality-gate.sh --level strict
   ```

### Team Guidelines

1. **Address critical issues immediately** (Gate 0)
2. **Fix high-priority issues before merge** (Gate 1)
3. **Schedule medium-priority refactoring** (Gate 2)
4. **Monitor baseline metrics regularly** (Gate 3)

### Maintenance

1. **Regular threshold review**: Adjust tolerances based on team velocity
2. **Update suppression rules**: Remove outdated suppressions
3. **Monitor trend reports**: Track quality improvements over time
4. **Update quality standards**: Keep standards current with best practices

## Advanced Usage

### Custom Quality Gates

Create custom quality gate levels:

```javascript
// In quality-gate.config.js
qualityLevels: {
  custom: {
    description: 'Custom quality gate for specific needs',
    requirements: ['syntax', 'eslint', 'security'],
    timeout: 900,
    tolerance: 0.10
  }
}
```

### Integration with External Tools

```javascript
// Add integration configurations
integrations: {
  jira: {
    enabled: true,
    projectKey: 'PROJ',
    createTicketsForIssues: true
  },

  datadog: {
    enabled: true,
    apiKey: process.env.DD_API_KEY,
    trackMetrics: ['quality_score', 'smell_count']
  }
}
```

## Support and Contributing

### Getting Help

1. Check the troubleshooting section above
2. Review existing issues in the repository
3. Create detailed issue reports with:
   - Quality gate level used
   - Specific error messages
   - Package being analyzed
   - Steps to reproduce

### Contributing

1. Follow existing code patterns in the quality scripts
2. Add comprehensive tests for new functionality
3. Update documentation for any new features
4. Ensure all quality gates pass before submitting

## License

This quality gate system is part of the Attrition project and follows the same license terms.