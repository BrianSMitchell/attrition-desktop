# Integration Guidelines - Working with Automated Quality Tools

## Overview

This document provides comprehensive guidance for effectively integrating with Attrition's automated quality assurance tools. Understanding and leveraging these tools improves development efficiency and ensures consistent code quality across the project.

## Automated Quality Tools Overview

### Core Quality Tools
- **ESLint**: JavaScript/TypeScript linting with custom Attrition rules
- **TypeScript**: Compile-time type checking and IntelliSense
- **Custom ESLint Plugin**: Project-specific code smell detection
- **Code Metrics System**: Complexity and maintainability analysis
- **Prettier**: Code formatting and style consistency
- **Jest**: Unit testing framework
- **Git Hooks**: Pre-commit and pre-push quality enforcement

### Quality Gates
- **Pre-commit**: ESLint, TypeScript compilation, basic tests
- **Pre-push**: Full test suite, complexity analysis, security scan
- **CI/CD Pipeline**: Complete quality validation before deployment

## ESLint Integration

### Custom ESLint Rules

#### Attrition-Specific Rules
```javascript
// .eslintrc.js configuration
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:attrition/recommended'
  ],
  plugins: ['attrition'],
  rules: {
    // Custom Attrition rules
    'attrition/id-consistency': 'error',
    'attrition/no-excessive-logging': 'warn',
    'attrition/no-legacy-database-checks': 'error',
    'attrition/service-extraction-required': 'error',
    'attrition/max-complexity': ['error', 10]
  }
};
```

#### Key Custom Rules Explained

##### `id-consistency`
**Purpose**: Ensures consistent UUID format for Supabase primary keys

**Configuration**:
```javascript
'attrition/id-consistency': 'error'
```

**Examples**:
```typescript
// ❌ Violation: MongoDB ObjectId format
const userId = req.params.id; // 24-character string

// ✅ Correct: UUID format validation
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(userId)) {
  return res.status(400).json({ error: 'Invalid ID format' });
}
```

##### `no-excessive-logging`
**Purpose**: Prevents performance issues from excessive console logging

**Configuration**:
```javascript
'attrition/no-excessive-logging': 'warn'
```

**Examples**:
```typescript
// ❌ Violation: Logging in loop
for (const user of users) {
  console.log('Processing user:', user.id); // Performance issue!
}

// ✅ Correct: Conditional logging
if (users.length > 100) {
  logger.info(`Processing large batch: ${users.length} users`);
}
```

##### `service-extraction-required`
**Purpose**: Enforces service extraction pattern for maintainable code

**Configuration**:
```javascript
'attrition/service-extraction-required': 'error'
```

**Examples**:
```typescript
// ❌ Violation: Business logic in route handler
router.post('/users', async (req, res) => {
  // 50+ lines of user creation, validation, email sending
  const user = await createUser(req.body); // Mixed concerns
});

// ✅ Correct: Extracted service pattern
router.post('/users', async (req, res) => {
  try {
    const user = await UserManagementService.createUser(req.body);
    return res.status(201).json({ user });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});
```

### ESLint Workflow Integration

#### IDE Integration (VS Code)
```json
// .vscode/settings.json
{
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "eslint.workingDirectories": [
    "packages/server",
    "packages/client"
  ],
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

#### Pre-commit Hook Integration
```javascript
// .husky/pre-commit
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run type-check
```

## TypeScript Integration

### Configuration Best Practices

#### tsconfig.json Optimization
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "removeComments": false,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  },
  "include": [
    "src/**/*",
    "tests/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "build"
  ]
}
```

### TypeScript Development Workflow

#### Real-time Type Checking
1. **IDE Integration**: VS Code with TypeScript Hero extension
2. **Incremental Compilation**: Use `tsc --watch` for fast feedback
3. **Error Navigation**: Quick navigation to type errors
4. **Refactoring Support**: Safe refactoring with type safety

#### Type Definition Management
```typescript
// ✅ Proper interface design
interface GameAction {
  readonly id: string;
  readonly type: ActionType;
  readonly empireId: string;
  readonly timestamp: Date;
  readonly data: Record<string, unknown>;
}

// ✅ Domain-specific types
type ResourceType = 'metal' | 'crystal' | 'deuterium' | 'energy';
type BuildingType = 'mine' | 'factory' | 'research-lab' | 'defense';

// ✅ Generic constraints
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}
```

## Code Metrics Integration

### Metrics Collection Setup

#### Configuration
```typescript
// packages/server/src/utils/codeMetrics/config.ts
export const METRICS_CONFIG = {
  complexity: {
    maxCyclomaticComplexity: 10,
    maxMaintainabilityIndex: 70,
    maxDepthOfNesting: 4,
    maxNumberOfParameters: 5
  },
  duplication: {
    minLinesForDuplication: 10,
    maxDuplicationPercentage: 5
  },
  size: {
    maxFileSize: 500, // lines
    maxMethodSize: 50, // lines
    maxClassSize: 20   // methods
  }
};
```

### Metrics Workflow Integration

#### Pre-push Hook
```javascript
// .husky/pre-push
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run metrics
npm run complexity-check
npm run test-coverage
```

#### Continuous Monitoring
```yaml
# GitHub Actions workflow
name: Code Metrics
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3

      - name: Collect Metrics
        run: npm run metrics-collect

      - name: Upload Metrics
        run: npm run metrics-upload
```

## Testing Integration

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 10000
};
```

### Testing Best Practices

#### Service Testing Pattern
```typescript
// ✅ Proper service testing
describe('UserManagementService', () => {
  let userService: UserManagementService;
  let mockDatabase: MockDatabase;

  beforeEach(() => {
    mockDatabase = createMockDatabase();
    userService = new UserManagementService(mockDatabase);
  });

  describe('createUser', () => {
    it('should create user with valid data', async () => {
      // Arrange
      const userData = createValidUserData();

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(mockDatabase.saveUser).toHaveBeenCalledWith(userData);
    });

    it('should throw error for invalid email', async () => {
      // Arrange
      const invalidData = { ...validUserData, email: 'invalid-email' };

      // Act & Assert
      await expect(userService.createUser(invalidData))
        .rejects.toThrow(UserValidationError);
    });
  });
});
```

## Development Workflow Integration

### 1. Pre-Development Setup

#### Environment Preparation
```bash
# Install dependencies
npm install

# Setup git hooks
npm run prepare

# Verify tool integration
npm run health-check

# Run initial quality checks
npm run quality-check
```

#### IDE Configuration
1. **VS Code Extensions**: ESLint, TypeScript Hero, Prettier
2. **Editor Settings**: Auto-save, format on save, error highlighting
3. **Workspace Settings**: Multi-root workspace for monorepo
4. **Debug Configuration**: Node.js debugging setup

### 2. Development Process

#### Real-time Quality Feedback
1. **ESLint**: Real-time linting in IDE
2. **TypeScript**: Live type checking and IntelliSense
3. **Prettier**: Format on save for consistent style
4. **Git Integration**: Pre-commit hooks for quality enforcement

#### Incremental Quality Checks
```bash
# Check specific file
npx eslint src/services/UserService.ts

# Check with fix
npx eslint src/services/UserService.ts --fix

# Type check specific file
npx tsc --noEmit src/services/UserService.ts

# Run tests for specific service
npm run test UserService
```

### 3. Pre-Submission Validation

#### Comprehensive Quality Check
```bash
# Full quality validation before PR
npm run pre-pr-check

# Individual tool checks
npm run lint           # ESLint
npm run type-check     # TypeScript
npm run test          # Jest tests
npm run metrics       # Code metrics
npm run build         # Build verification
npm run security-scan # Security check
```

#### Custom Quality Scripts
```json
// package.json scripts
{
  "scripts": {
    "quality-check": "npm run lint && npm run type-check && npm run test",
    "pre-pr-check": "npm run quality-check && npm run metrics && npm run build",
    "health-check": "npm run doctor && npm run dependency-check",
    "doctor": "npm run lint && npm run type-check && npm run test-coverage"
  }
}
```

## Tool Configuration Management

### ESLint Configuration Strategy

#### Project-Level Configuration
```javascript
// packages/server/.eslintrc.js
module.exports = {
  root: true,
  extends: [
    '../../.eslintrc.base.js', // Shared base configuration
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 2020,
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'attrition'],
  rules: {
    // Package-specific overrides
    '@typescript-eslint/no-explicit-any': 'warn', // More lenient for server code
    'attrition/service-extraction-required': 'error'
  },
  env: {
    node: true,
    es2020: true
  }
};
```

#### Client-Specific Configuration
```javascript
// packages/client/.eslintrc.js
module.exports = {
  root: true,
  extends: [
    '../../.eslintrc.base.js',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  plugins: ['react', 'react-hooks', '@typescript-eslint', 'attrition'],
  rules: {
    // React-specific rules
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react/react-in-jsx-scope': 'off', // Not needed in React 17+
    'attrition/id-consistency': 'warn' // Less strict for client code
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
```

### TypeScript Configuration Strategy

#### Shared TypeScript Configuration
```json
// tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020"],
    "module": "ESNext",
    "moduleResolution": "node",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  }
}
```

#### Project-Specific Overrides
```json
// packages/server/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node", "jest"]
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

## Troubleshooting Tool Integration

### Common Issues and Solutions

#### ESLint Issues
```bash
# Issue: ESLint not recognizing custom rules
npm run eslint-doctor

# Issue: Configuration conflicts
npx eslint --print-config src/file.ts

# Issue: Performance problems
npx eslint --cache --cache-location .eslintcache
```

#### TypeScript Issues
```bash
# Issue: Type checking too slow
npm run tsc-check  # Incremental checking

# Issue: Module resolution problems
npm run ts-doctor   # Diagnose TypeScript configuration

# Issue: IDE integration problems
# Restart TypeScript service in VS Code
```

#### Testing Issues
```bash
# Issue: Tests not running
npm run test-debug

# Issue: Coverage not collecting
npm run coverage-debug

# Issue: Mock setup problems
npm run test-setup-check
```

### Performance Optimization

#### ESLint Performance
```javascript
// .eslintrc.js - Performance optimizations
module.exports = {
  // ... other config
  cache: true,
  cacheLocation: '.eslintcache',
  reportUnusedDisableDirectives: true,
  // Reduce work for unchanged files
  globals: {
    // Define global variables to reduce lookups
  }
};
```

#### TypeScript Performance
```json
// tsconfig.json - Performance optimizations
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo",
    "skipLibCheck": true,
    // Exclude unnecessary files
    "exclude": [
      "node_modules",
      "dist",
      "**/*.test.ts",
      "**/*.spec.ts"
    ]
  }
}
```

## Continuous Integration

### GitHub Actions Workflow
```yaml
name: Quality Assurance
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: TypeScript check
        run: npm run type-check

      - name: Run tests
        run: npm run test

      - name: Build check
        run: npm run build

      - name: Security scan
        run: npm audit --audit-level=moderate

      - name: Performance check
        run: npm run perf-check

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

### Quality Gate Enforcement

#### Branch Protection Rules
- **Required status checks**: ESLint, TypeScript, Tests, Build
- **Up-to-date branches**: Require branches to be up to date before merge
- **Code review requirements**: At least one approved review
- **Dismiss stale reviews**: New commits require re-review

#### Automated PR Management
- **Auto-labeling**: Label PRs based on file changes and content
- **Quality scoring**: Automated quality scoring of PRs
- **Merge requirements**: Enforce quality gates before merge
- **Rollback detection**: Detect and alert on quality degradation

## Tool Maintenance and Updates

### Regular Maintenance Tasks

#### Weekly Maintenance
- [ ] **Dependency Updates**: Update development dependencies
- [ ] **Rule Review**: Review and update ESLint rules as needed
- [ ] **Performance Monitoring**: Monitor tool performance and optimize
- [ ] **Team Feedback**: Gather feedback on tool effectiveness

#### Monthly Maintenance
- [ ] **Configuration Review**: Review and optimize tool configurations
- [ ] **Custom Rule Updates**: Update custom ESLint rules based on findings
- [ ] **Integration Testing**: Verify all tools work together properly
- [ ] **Documentation Updates**: Update tool documentation and guidelines

### Tool Version Management

#### Semantic Versioning for Tools
- **Major Updates**: Breaking changes to tool configurations
- **Minor Updates**: New rules or enhanced functionality
- **Patch Updates**: Bug fixes and performance improvements

#### Update Process
1. **Test Updates**: Test tool updates in development environment
2. **Gradual Rollout**: Update tools across team incrementally
3. **Documentation**: Update documentation for new tool features
4. **Training**: Provide training for new tool capabilities

## Advanced Tool Usage

### Custom Script Development

#### Quality Check Scripts
```javascript
// scripts/quality-check.js
const { ESLint } = require('eslint');
const { execSync } = require('child_process');

class QualityChecker {
  async runAllChecks() {
    const results = {
      eslint: await this.runESLint(),
      typescript: await this.runTypeScript(),
      tests: await this.runTests(),
      metrics: await this.runMetrics()
    };

    return this.aggregateResults(results);
  }

  async runESLint() {
    const eslint = new ESLint();
    const results = await eslint.lintFiles(['src/**/*.{ts,js}']);
    return {
      passed: results.every(r => r.errorCount === 0),
      errors: results.filter(r => r.errorCount > 0)
    };
  }

  async runTypeScript() {
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      return { passed: true, errors: [] };
    } catch (error) {
      return { passed: false, errors: [error.message] };
    }
  }

  async runTests() {
    try {
      execSync('npm run test', { stdio: 'pipe' });
      return { passed: true, errors: [] };
    } catch (error) {
      return { passed: false, errors: [error.message] };
    }
  }

  async runMetrics() {
    // Custom metrics collection logic
    return { passed: true, metrics: {} };
  }
}
```

### IDE Enhancement

#### VS Code Workspace Settings
```json
{
  "typescript.preferences.preferTypeOnlyAutoImports": true,
  "typescript.suggest.autoImports": true,
  "eslint.codeAction.showDocumentation": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "emmet.includeLanguages": {
    "typescript": "typescriptreact"
  },
  "files.associations": {
    "*.ts": "typescript",
    "*.tsx": "typescriptreact"
  }
}
```

## Metrics and Monitoring

### Tool Performance Metrics

#### Collection Strategy
```typescript
// scripts/metrics-collection.js
class MetricsCollector {
  async collectESLintMetrics() {
    const eslint = new ESLint();
    const results = await eslint.lintFiles(['src/**/*.{ts,js}']);

    return {
      totalFiles: results.length,
      errorCount: results.reduce((sum, r) => sum + r.errorCount, 0),
      warningCount: results.reduce((sum, r) => sum + r.warningCount, 0),
      avgErrorsPerFile: results.reduce((sum, r) => sum + r.errorCount, 0) / results.length
    };
  }

  async collectTypeScriptMetrics() {
    // Collect TypeScript compilation metrics
    return {
      compilationTime: this.measureCompilationTime(),
      typeCheckErrors: this.countTypeCheckErrors(),
      declarationFiles: this.countDeclarationFiles()
    };
  }

  async collectTestMetrics() {
    // Collect test execution metrics
    return {
      testCount: this.countTests(),
      coveragePercentage: this.getCoveragePercentage(),
      avgTestDuration: this.getAvgTestDuration()
    };
  }
}
```

### Dashboard Integration

#### Quality Dashboard
- **Real-time Metrics**: Live quality metrics during development
- **Trend Analysis**: Historical quality trends and improvements
- **Team Comparison**: Quality metrics across team members
- **Alerting**: Automated alerts for quality degradation

## Troubleshooting Guide

### Common Integration Issues

#### Issue: ESLint Not Working
```bash
# Diagnostic steps
npm run eslint-doctor          # Run ESLint diagnostics
npx eslint --version          # Check ESLint version
npx eslint --print-config     # Check configuration
npm run lint-clean           # Clear cache and retry
```

#### Issue: TypeScript Errors
```bash
# Diagnostic steps
npm run tsc-check            # Check TypeScript compilation
npx tsc --noEmit --listFiles # List files being checked
npm run ts-reset            # Reset TypeScript cache
```

#### Issue: Test Failures
```bash
# Diagnostic steps
npm run test-debug          # Debug test execution
npm run test-setup-check    # Verify test setup
npm run mock-check          # Verify mock configurations
```

### Performance Issues

#### Slow ESLint
- Enable caching in ESLint configuration
- Exclude unnecessary files from linting
- Use more specific file patterns
- Consider using ESLint daemon mode

#### Slow TypeScript Checking
- Enable incremental compilation
- Use project references for large projects
- Exclude test files from type checking
- Use skipLibCheck for faster checking

#### Slow Tests
- Run tests in band for faster feedback
- Use test caching for repeated runs
- Parallelize tests when possible
- Use test slicing for large test suites

## Best Practices Summary

### Daily Development Workflow
1. **Write Code**: Follow established patterns and conventions
2. **Real-time Feedback**: Use IDE integration for immediate quality feedback
3. **Incremental Testing**: Test changes as you develop
4. **Pre-commit Validation**: Run quality checks before committing

### Tool Integration Principles
1. **Automation First**: Automate quality checks whenever possible
2. **Fast Feedback**: Ensure tools provide quick feedback during development
3. **Meaningful Errors**: Configure tools to provide actionable error messages
4. **Team Consistency**: Maintain consistent tool configuration across team

### Continuous Improvement
1. **Regular Updates**: Keep tools updated with latest versions
2. **Feedback Loop**: Use tool findings to improve development practices
3. **Process Optimization**: Continuously optimize tool configuration and usage
4. **Knowledge Sharing**: Share tool usage tips and best practices

---

**Last Updated**: 2025-10-10
**Version**: 1.0.0
**Status**: Active