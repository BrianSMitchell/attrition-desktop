# @attrition/code-smell-detector

> ESLint plugin for Attrition game codebase - detects code smells and enforces project-specific patterns

## Overview

This ESLint plugin provides custom rules specifically designed for the Attrition space strategy game codebase. It integrates with the existing metrics system to provide real-time feedback on code quality and adherence to project patterns.

## Rules

### id-consistency (Critical Priority)

Detects ObjectId vs UUID inconsistencies across the codebase. Critical for migration from legacy ID patterns to UUID.

**Configuration:**
```javascript
{
  "targetScore": 90,                    // Target consistency percentage
  "criticalViolations": [               // Patterns that are critical violations
    "mongoose\\.Types\\.ObjectId",
    "new ObjectId",
    "ObjectId\\("
  ],
  "allowInMigration": false             // Allow during migration phase
}
```

### no-excessive-logging (High Priority)

Prevents console.log abuse and enforces proper logging practices.

**Configuration:**
```javascript
{
  "maxConsoleStatements": 3,            // Maximum console statements per file
  "allowInDevelopment": true,           // Allow in development environment
  "allowedMethods": ["error", "warn", "info"],
  "bannedMethods": ["log", "debug", "trace"],
  "requireLoggingLevels": true
}
```

### no-legacy-database-checks (Medium Priority)

Detects deprecated database patterns and enforces modern database practices.

**Configuration:**
```javascript
{
  "bannedPatterns": [
    "callback",
    "\\.exec\\(",
    "\\.then\\(",
    "\\.catch\\(",
    "mongoose\\.Schema"
  ],
  "migrationPhase": "Phase 5",
  "allowInMigration": false,
  "modernReplacements": {
    "callback": "async/await",
    "mongoose\\.Schema": "TypeScript interfaces"
  }
}
```

### service-extraction-required (Medium Priority)

Ensures routes follow service extraction pattern and prevents mixed concerns.

**Configuration:**
```javascript
{
  "minServiceScore": 80,                // Minimum service extraction score
  "maxRouteComplexity": 15,             // Maximum route complexity
  "maxRouteLength": 50,                 // Maximum route length in lines
  "requireServiceImport": true,         // Require service imports when business logic present
  "allowMixedConcerns": false          // Allow mixed HTTP/business logic
}
```

### max-complexity (Low Priority)

Enforces custom complexity limits with game-specific pattern adjustments.

**Configuration:**
```javascript
{
  "maxPerFunction": 10,                 // Maximum complexity per function
  "maxPerFile": 50,                     // Maximum complexity per file
  "gamePatternMultipliers": {           // Complexity multipliers for game patterns
    "game-loop": 1.5,
    "combat-calculation": 1.2,
    "resource-optimization": 1.3,
    "pathfinding": 1.4,
    "ai-decision": 1.3
  },
  "ignoreGamePatterns": false,
  "complexityWeights": {
    "ifStatements": 1,
    "loops": 2,
    "switches": 1,
    "catches": 3,
    "nestedFunctions": 2
  }
}
```

## Configurations

### Recommended (Development)

```javascript
module.exports = {
  plugins: ['@attrition/code-smell-detector'],
  rules: {
    '@attrition/code-smell-detector/id-consistency': 'error',
    '@attrition/code-smell-detector/no-excessive-logging': 'warn',
    '@attrition/code-smell-detector/no-legacy-database-checks': 'error',
    '@attrition/code-smell-detector/service-extraction-required': 'warn',
    '@attrition/code-smell-detector/max-complexity': 'warn'
  }
};
```

### Strict (Production)

```javascript
module.exports = {
  plugins: ['@attrition/code-smell-detector'],
  rules: {
    '@attrition/code-smell-detector/id-consistency': 'error',
    '@attrition/code-smell-detector/no-excessive-logging': 'error',
    '@attrition/code-smell-detector/no-legacy-database-checks': 'error',
    '@attrition/code-smell-detector/service-extraction-required': 'error',
    '@attrition/code-smell-detector/max-complexity': 'error'
  }
};
```

### Migration (Legacy Code)

```javascript
module.exports = {
  plugins: ['@attrition/code-smell-detector'],
  rules: {
    '@attrition/code-smell-detector/id-consistency': 'warn',
    '@attrition/code-smell-detector/no-excessive-logging': 'warn',
    '@attrition/code-smell-detector/no-legacy-database-checks': 'off', // Disabled during migration
    '@attrition/code-smell-detector/service-extraction-required': 'warn',
    '@attrition/code-smell-detector/max-complexity': 'warn'
  }
};
```

## Integration with Metrics System

This plugin integrates with the existing Attrition metrics system:

```javascript
const { MetricsCollector } = require('../utils/codeMetrics/metricsCollector');
const { getProjectConfig } = require('./lib/utils/metricsIntegration');

// Use in your code analysis
const config = getProjectConfig();
const collector = new MetricsCollector(config);
const analysis = await collector.analyzeFile('path/to/file.ts');
```

## IDE Integration

### VS Code Settings

Add to `.vscode/settings.json`:

```json
{
  "eslint.enable": true,
  "eslint.workingDirectories": ["packages/server"],
  "eslint.options": {
    "extensions": [".ts", ".js"]
  },
  "eslint.validate": [
    "typescript",
    "javascript"
  ]
}
```

## Development

### Building

```bash
cd packages/server/src/plugins/eslint-plugin-attrition
npm install
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## Contributing

When adding new rules:

1. Follow ESLint rule conventions
2. Integrate with the metrics system where applicable
3. Add comprehensive tests
4. Update this README
5. Follow the established priority system (Critical, High, Medium, Low)

## License

MIT © Attrition Development Team