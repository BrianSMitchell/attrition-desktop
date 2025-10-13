# ESLint Rules Mapping

## Overview

This document maps industry standards and project requirements to specific ESLint rules and custom plugin configurations. It provides the technical implementation details for enforcing code quality standards across the Attrition codebase.

## Standards to ESLint Rules Mapping

### Fowler's Taxonomy Standards Mapping

#### 1. Bloaters Detection Rules

**Long Method Detection**
```javascript
// Custom Rule: @attrition/max-method-length
{
  '@attrition/max-method-length': ['error', {
    max: 50,                    // Industry standard: 50 lines max
    ignoreComments: true,       // Don't count comments
    ignoreStrings: true,        // Don't count string literals
    projectMax: 20             // Project-specific: 20 lines for game logic
  }]
}
```

**Large Class Detection**
```javascript
// Custom Rule: @attrition/max-class-size
{
  '@attrition/max-class-size': ['warn', {
    maxLines: 300,             // Project standard: 300 lines max
    maxMethods: 15,            // Max 15 methods per class
    ignoreStatic: false        // Count static methods too
  }]
}
```

**Long Parameter List Detection**
```javascript
// Custom Rule: @attrition/max-params
{
  '@attrition/max-params': ['error', {
    max: 5,                    // Project standard: 5 params max
    ignoreDefaultValues: true  // Allow default parameter values
  }]
}
```

#### 2. Object-Orientation Abusers Detection

**Switch Statement Detection**
```javascript
// Custom Rule: @attrition/no-switch-on-types
{
  '@attrition/no-switch-on-types': 'error'  // Zero tolerance for type switches
}
```

**Temporary Field Detection**
```javascript
// Custom Rule: @attrition/no-temporary-fields
{
  '@attrition/no-temporary-fields': ['warn', {
    maxTemporaryFields: 2,     // Allow max 2 conditional fields
    requireInitialization: true // All fields must be initialized
  }]
}
```

#### 3. Code Duplication Detection

**Duplicate Code Blocks**
```javascript
// ESLint Core Rule
{
  'no-dupe-else-if': 'error',
  'no-dupe-keys': 'error'
}

// Custom Rule: @attrition/no-duplicate-logic
{
  '@attrition/no-duplicate-logic': ['warn', {
    minLines: 10,              // Min 10 lines to flag as duplication
    similarityThreshold: 85    // 85% similarity threshold
  }]
}
```

### Project-Specific Standards Mapping

#### 1. ID Consistency Rules

**UUID Format Enforcement**
```javascript
// Custom Rule: @attrition/id-consistency
{
  '@attrition/id-consistency': ['error', {
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
    message: 'All IDs must be valid UUID v4 format',
    allowObjectIds: false      // Zero tolerance for ObjectIds
  }]
}
```

**Database Entity ID Validation**
```javascript
// Custom Rule: @attrition/valid-entity-ids
{
  '@attrition/valid-entity-ids': ['error', {
    entities: ['empire', 'building', 'fleet', 'user', 'planet'],
    requireUUID: true,
    validateOnAssignment: true
  }]
}
```

#### 2. Legacy Pattern Detection

**MongoDB Pattern Detection**
```javascript
// Custom Rule: @attrition/no-legacy-database-checks
{
  '@attrition/no-legacy-database-checks': ['error', {
    bannedPatterns: [
      'mongoose\\.',
      'ObjectId\\(',
      'findOne\\(',
      'insertOne\\(',
      'updateOne\\(',
      'deleteOne\\(',
      'collection\\.'
    ],
    migrationPhase: 'Phase 5',
    allowInMigrations: true    // Allow in migration scripts
  }]
}
```

**Database Type Detection**
```javascript
// Custom Rule: @attrition/no-database-type-detection
{
  '@attrition/no-database-type-detection': 'error'  // getDatabaseType() calls banned
}
```

#### 3. Console Logging Rules

**Excessive Logging Detection**
```javascript
// Custom Rule: @attrition/no-excessive-logging
{
  '@attrition/no-excessive-logging': ['warn', {
    max: 5,                    // Max 5 console statements per file
    allowInDevelopment: true,  // Allow in development environment
    allowInTests: false,       // Never allow in tests
    bannedTypes: ['log', 'debug'], // Only warn/error allowed
    requireContext: true       // Must provide context with logs
  }]
}
```

#### 4. Service Extraction Rules

**Mixed Concerns Detection**
```javascript
// Custom Rule: @attrition/service-extraction-required
{
  '@attrition/service-extraction-required': ['warn', {
    maxRouteComplexity: 15,    // Routes > 15 complexity need extraction
    maxMixedConcerns: 3,       // Max 3 different concern types
    requireControllers: true,  // Must use controller pattern
    requireServices: true      // Must use service layer
  }]
}
```

**Route Complexity Analysis**
```javascript
// Custom Rule: @attrition/max-complexity
{
  '@attrition/max-complexity': ['warn', {
    max: 15,                   // Cyclomatic complexity threshold
    variants: ['while', 'if', 'for', 'switch', 'catch'],
    ignoreSimple: true         // Ignore simple if/for without nesting
  }]
}
```

### Standard ESLint Rules Integration

#### Code Quality Rules
```javascript
{
  // Variable declarations
  'prefer-const': 'error',
  'no-var': 'error',
  'no-unused-vars': 'error',

  // Function quality
  'eqeqeq': ['error', 'always'],        // === instead of ==
  'curly': ['error', 'all'],           // Require braces for all blocks
  'no-eval': 'error',                   // Ban eval() usage
  'no-implied-eval': 'error',           // Ban implied eval

  // Code style
  'quotes': ['error', 'single', { avoidEscape: true }],
  'semi': ['error', 'always'],
  'indent': ['error', 2],
  'comma-dangle': ['error', 'always-multiline'],
  'object-curly-spacing': ['error', 'always'],
  'array-bracket-spacing': ['error', 'never'],

  // Best practices
  'no-console': 'off',                  // Handled by custom plugin
  'no-debugger': 'error',
  'no-alert': 'error'
}
```

#### TypeScript-Specific Rules
```javascript
{
  // TypeScript ESLint Rules
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/explicit-function-return-type': ['warn', {
    allowExpressions: false,
    allowTypedFunctionExpressions: false,
    allowHigherOrderFunctions: false
  }],
  '@typescript-eslint/no-unused-vars': 'error',
  '@typescript-eslint/prefer-const': 'error',
  '@typescript-eslint/no-non-null-assertion': 'warn'
}
```

## Environment-Specific Rule Overrides

### Development Environment
```javascript
overrides: [
  {
    files: ['packages/server/src/**/*.ts'],
    env: { node: true, es2020: true },
    rules: {
      '@attrition/no-excessive-logging': 'off',  // Allow more logging in dev
      '@attrition/max-complexity': 'warn'       // Warn instead of error
    }
  }
]
```

### Test Files
```javascript
{
  files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/*.spec.ts'],
  rules: {
    '@attrition/no-excessive-logging': 'off',  // Allow console in tests
    '@attrition/max-complexity': 'off',        // Allow complex test setups
    '@typescript-eslint/no-explicit-any': 'off' // Allow any in test mocks
  }
}
```

### Migration Scripts
```javascript
{
  files: ['**/migrations/**/*.ts', '**/scripts/**/*.ts'],
  rules: {
    '@attrition/no-legacy-database-checks': 'warn', // Allow legacy in migrations
    '@attrition/service-extraction-required': 'off'  // Allow mixed concerns in scripts
  }
}
```

## Custom Plugin Architecture

### Plugin Structure
```
packages/server/src/plugins/eslint-plugin-attrition/
├── package.json
├── lib/
│   ├── index.js              # Plugin registration
│   ├── rules/
│   │   ├── id-consistency.js
│   │   ├── no-excessive-logging.js
│   │   ├── no-legacy-database-checks.js
│   │   ├── service-extraction-required.js
│   │   └── max-complexity.js
│   └── utils/
│       ├── metricsIntegration.js
│       └── astHelpers.js
```

### Rule Implementation Example
```javascript
// lib/rules/id-consistency.js
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce UUID consistency for all IDs',
      category: 'Best Practices',
      recommended: true
    },
    schema: [
      {
        type: 'object',
        properties: {
          pattern: { type: 'string' },
          allowObjectIds: { type: 'boolean' }
        }
      }
    ]
  },
  create(context) {
    const { pattern, allowObjectIds } = context.options[0] || {};
    const uuidRegex = new RegExp(pattern || '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$');

    return {
      Literal(node) {
        if (typeof node.value === 'string' && uuidRegex.test(node.value)) {
          return; // Valid UUID
        }

        if (allowObjectIds && this.isObjectId(node.value)) {
          return; // Allow ObjectId if configured
        }

        context.report({
          node,
          message: 'Invalid ID format. Expected UUID v4.'
        });
      }
    };
  }
};
```

## Integration with Build System

### Build Script Integration
```json
{
  "scripts": {
    "lint": "eslint packages/server/src --ext .ts,.js",
    "lint:fix": "eslint packages/server/src --ext .ts,.js --fix",
    "lint:ci": "eslint packages/server/src --ext .ts,.js --format=junit --output-file=reports/lint-results.xml"
  }
}
```

### CI/CD Pipeline Integration
```yaml
# .github/workflows/quality-check.yml
- name: Lint Code
  run: npm run lint:ci

- name: Upload Lint Results
  uses: actions/upload-artifact@v2
  with:
    name: lint-results
    path: reports/lint-results.xml
```

## Metrics Integration

### ESLint Results to Metrics
```typescript
// utils/metricsIntegration.js
export function processESLintResults(results: ESLintResult[]): CodeMetrics {
  const smells: CodeSmell[] = [];

  for (const result of results) {
    for (const message of result.messages) {
      smells.push({
        category: this.mapESLintCategory(message.ruleId),
        type: this.mapESLintType(message.ruleId),
        severity: this.mapESLintSeverity(message.severity),
        location: {
          line: message.line,
          column: message.column
        },
        description: message.message,
        remediation: this.getRemediation(message.ruleId)
      });
    }
  }

  return { smells, /* ... other metrics */ };
}
```

### Real-time Metrics Updates
```typescript
// VS Code Extension Integration
const metricsWatcher = vscode.workspace.createFileSystemWatcher('**/*.{ts,js}');

metricsWatcher.onDidChange(async (uri) => {
  const results = await runESLintOnFile(uri.fsPath);
  const metrics = processESLintResults(results);

  // Update metrics dashboard
  await updateMetricsDisplay(metrics);
});
```

## Rule Effectiveness Tracking

### Rule Performance Metrics
```typescript
interface RuleMetrics {
  ruleName: string;
  filesProcessed: number;
  violationsFound: number;
  averageFixTime: number;     // Time to fix violations
  falsePositiveRate: number;  // 0-1 scale
  adoptionRate: number;       // How often rule is followed
}
```

### Continuous Improvement
- **Monthly rule review** based on effectiveness metrics
- **False positive tracking** and rule refinement
- **Developer feedback** integration for rule improvements
- **Standards evolution** based on rule performance data

## Best Practices for Rule Development

### Rule Design Principles
1. **Clear error messages** with actionable remediation advice
2. **Minimal false positives** to maintain developer trust
3. **Performance conscious** - avoid expensive operations in rules
4. **Well documented** with examples of violations and fixes

### Testing Custom Rules
```javascript
// tests/rules/id-consistency.test.js
describe('@attrition/id-consistency', () => {
  it('should flag invalid UUID formats', () => {
    const code = 'const id = "invalid-uuid";';
    const violations = runRule(code);

    expect(violations).toHaveLength(1);
    expect(violations[0].message).toContain('UUID v4');
  });

  it('should pass valid UUID formats', () => {
    const code = 'const id = "123e4567-e89b-12d3-a456-426614174000";';
    const violations = runRule(code);

    expect(violations).toHaveLength(0);
  });
});
```

## Troubleshooting Common Issues

### Performance Issues
- **Problem**: ESLint taking too long on large files
- **Solution**: Increase timeout, exclude large files, optimize rule performance

### False Positives
- **Problem**: Rules flagging correct code as violations
- **Solution**: Refine rule logic, add exceptions, improve pattern matching

### Rule Conflicts
- **Problem**: Multiple rules giving conflicting advice
- **Solution**: Rule priority ordering, disable conflicting rules, merge similar rules

## References

- [ESLint Rules Documentation](https://eslint.org/docs/rules/)
- [TypeScript ESLint Rules](https://typescript-eslint.io/rules/)
- [Custom ESLint Plugin Development](https://eslint.org/docs/developer-guide/working-with-plugins)

## Version History

- **v1.0**: Initial ESLint rules mapping
- **v1.1**: Added custom plugin architecture
- **v1.2**: Enhanced metrics integration and CI/CD pipeline

## Last Updated

2025-10-10