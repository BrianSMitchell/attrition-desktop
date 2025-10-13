# Attrition Code Smell Detection Workflow

## 🎯 Overview

This document provides a comprehensive guide to the Attrition code smell detection system, which uses a custom ESLint plugin with 5 specialized rules to enforce code quality standards across the game development codebase. The system provides real-time feedback, automated enforcement, and multi-stage quality gates.

## 🚀 Complete Developer Workflow

### 1. Real-time Development Feedback

**As-you-type Quality Enforcement:**
- VS Code ESLint extension provides immediate feedback
- Red squiggly lines appear under problematic code
- Hover tooltips show specific error messages and fixes
- Lightbulb icons (💡) provide quick-fix suggestions
- Status bar shows violation count

**Example Real-time Experience:**
```javascript
// As you type this code...
console.log('Debug message 1');
console.log('Debug message 2');
console.log('Debug message 3');
console.log('Debug message 4'); // ← Red squiggle appears here
```

**Immediate Feedback:**
- Hover shows: "Too many console statements (4/3 max)"
- Quick fix: "Replace with Logger.service.info()"
- Status bar: "ESLint: 1 problem"

### 2. Pre-commit Quality Gate

**Automatic Quality Checking:**
```bash
$ git add .
$ git commit -m "feat: add new feature"

🔍 Running pre-commit quality checks...
=============================================
📋 Running ESLint quality checks...

❌ COMMIT BLOCKED: ESLint violations found!
```

**Pre-commit Hook Process:**
1. Runs `npx eslint . --max-warnings 0`
2. Blocks commit if violations exist
3. Provides specific guidance for fixes
4. Suggests VS Code integration for real-time feedback

### 3. CI/CD Pipeline Enforcement

**GitHub Actions Quality Gate:**
```yaml
name: Quality Enforcement Pipeline
on: [pull_request, push]

jobs:
  quality-check:
    - name: Run ESLint with Attrition Plugin
      run: npx eslint . --format compact
      
    - name: Block merge on quality violations
      if: failure()
      run: |
        echo "🚫 BLOCKING MERGE DUE TO QUALITY VIOLATIONS"
        exit 1
```

## 🎯 Five Custom ESLint Rules

### 1. `@attrition/code-smell-detector/no-excessive-logging`

**Purpose:** Prevent console.log abuse and enforce structured logging

**Detection:**
- Too many console statements (default: 3 max)
- Banned methods: `console.log`, `console.debug`, `console.trace`
- Missing logging levels
- Production console usage

**Example Violation:**
```javascript
// ❌ 6 console.log statements (exceeds limit of 3)
console.log('Starting...');
console.log('Loading data...');
console.log('Processing...');
console.log('Validating...');
console.log('Saving...');
console.log('Complete!');
```

**Auto-fix Available:** Yes - can remove excessive statements

### 2. `@attrition/code-smell-detector/id-consistency`

**Purpose:** Enforce consistent ID patterns (UUID vs ObjectId)

**Detection:**
- Mixed ObjectId and UUID usage
- Legacy string prefixes (`user_`, `game_`, `sess_`)
- Inconsistent ID generation patterns
- Migration phase violations

**Example Violation:**
```javascript
// ❌ Mixed ID patterns
const playerId = new ObjectId();        // ObjectId
const gameId = 'game_' + Date.now();   // String prefix
const sessionId = uuid.v4();             // UUID (correct)
```

### 3. `@attrition/code-smell-detector/max-complexity`

**Purpose:** Prevent overly complex functions that are hard to maintain

**Detection:**
- Cyclomatic complexity limits (default: 10 per function)
- Game-specific pattern multipliers:
  - Game loops: 1.5x multiplier
  - Combat calculations: 1.2x multiplier
  - Resource optimization: 1.3x multiplier
  - Pathfinding: 1.4x multiplier
  - AI decisions: 1.3x multiplier

**Example Violation:**
```javascript
// ❌ Complexity of 20 (exceeds limit of 10)
function overlyComplexFunction() {
  if (condition1) {
    if (condition2) {
      if (condition3) {
        // ... deeply nested logic continues
      }
    }
  }
}
```

### 4. `@attrition/code-smell-detector/no-legacy-database-checks`

**Purpose:** Prevent deprecated database patterns and enforce modern async/await

**Detection:**
- Callback patterns instead of async/await
- Promise chains (`.then`/`.catch`)
- Legacy Mongoose schema definitions
- Deprecated query methods (`.exec()`)

**Example Violation:**
```javascript
// ❌ Legacy promise chain
User.findById(userId)
  .then(user => {
    // ... processing
  })
  .catch(err => {
    // ... error handling
  });

// ✅ Modern async/await
const user = await User.findById(userId);
```

### 5. `@attrition/code-smell-detector/service-extraction-required`

**Purpose:** Enforce proper separation of concerns between routes and business logic

**Detection:**
- Routes containing business logic
- Direct database dependencies
- Missing service layer abstractions
- Mixed HTTP and business concerns

**Example Violation:**
```javascript
// ❌ Mixed concerns in route handler
app.post('/api/fleet/create', async (req, res) => {
  // ❌ Business logic in route
  const user = await db.users.findById(req.body.userId);
  if (!user) throw new Error('User not found');
  
  // ❌ Database operations directly in route
  const fleet = await db.fleets.insertOne({
    userId: req.body.userId,
    // ... fleet data
  });
  
  res.json(fleet);
});
```

## 🛠 Configuration Presets

### Development (`recommended`)
```javascript
{
  '@attrition/code-smell-detector/id-consistency': 'error',
  '@attrition/code-smell-detector/no-excessive-logging': 'warn',
  '@attrition/code-smell-detector/no-legacy-database-checks': 'error',
  '@attrition/code-smell-detector/service-extraction-required': 'warn',
  '@attrition/code-smell-detector/max-complexity': 'warn'
}
```

### Production (`strict`)
```javascript
{
  '@attrition/code-smell-detector/id-consistency': 'error',
  '@attrition/code-smell-detector/no-excessive-logging': 'error',
  '@attrition/code-smell-detector/no-legacy-database-checks': 'error',
  '@attrition/code-smell-detector/service-extraction-required': 'error',
  '@attrition/code-smell-detector/max-complexity': 'error'
}
```

### Migration (`migration`)
```javascript
{
  '@attrition/code-smell-detector/id-consistency': 'warn',
  '@attrition/code-smell-detector/no-excessive-logging': 'warn',
  '@attrition/code-smell-detector/no-legacy-database-checks': 'off',
  '@attrition/code-smell-detector/service-extraction-required': 'warn',
  '@attrition/code-smell-detector/max-complexity': 'warn'
}
```

### CI/CD (`ci`)
```javascript
{
  '@attrition/code-smell-detector/id-consistency': 'error',
  '@attrition/code-smell-detector/no-excessive-logging': 'error',
  '@attrition/code-smell-detector/no-legacy-database-checks': 'error',
  '@attrition/code-smell-detector/service-extraction-required': 'error',
  '@attrition/code-smell-detector/max-complexity': 'error'
}
```

## 🔧 VS Code Integration

### Real-time Feedback Features
- **Live Error Detection:** Immediate violation highlighting
- **Hover Tooltips:** Detailed error explanations
- **Quick Fixes:** Lightbulb suggestions for common fixes
- **Auto-formatting:** Code formatting on save
- **Status Bar:** Real-time violation count

### Configuration
```json
{
  "eslint.run": "onType",
  "eslint.codeActionsOnSave.mode": "all",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "editor.formatOnSave": true
}
```

## 🔄 Development Workflow Cycle

### 1. Code Writing
```javascript
// Developer writes code with violations
function createPlayer(name) {
  console.log('Creating player:', name);  // ← ESLint violation
  console.log('Name length:', name.length); // ← ESLint violation
  
  const playerId = new ObjectId(); // ← ESLint violation
  // ... more code with violations
}
```

### 2. Real-time Feedback
- Red squiggles appear immediately
- Hover shows: "Console method 'log' is banned"
- Lightbulb suggests: "Replace with Logger.service.info()"

### 3. Quick Fix Application
```javascript
// After applying quick fix
function createPlayer(name) {
  Logger.service.info('Creating player', { name, length: name.length });
  
  const playerId = uuid.v4(); // Fixed ID consistency
  // ... corrected code
}
```

### 4. Pre-commit Validation
```bash
$ git add .
$ git commit -m "feat: create player service"

🔍 Running pre-commit quality checks...
✅ ESLint checks passed!
🚀 Proceeding with commit...
```

### 5. CI/CD Pipeline
```bash
🔍 Running ESLint with Attrition Code Quality Plugin...
✅ ESLint checks passed!

✅ QUALITY CHECK PASSED!
All code meets Attrition quality standards
```

## 🎮 Developer Experience Benefits

### Immediate Quality Feedback
- Issues caught as soon as they're written
- Clear, actionable error messages
- Quick fixes reduce manual work
- Learning opportunity with each violation

### Consistent Code Standards
- Automated enforcement across all developers
- No subjective code review debates
- Uniform quality across the entire codebase
- Easy onboarding for new team members

### Faster Development Cycles
- Less time spent on code reviews
- Fewer bugs reaching production
- Cleaner, more maintainable code
- Better team collaboration

## 🚨 Common Violations and Fixes

### 1. Excessive Logging
**Problem:**
```javascript
// ❌ Too many console.log statements
console.log('Starting process...');
console.log('Loading data...');
console.log('Processing...');
console.log('Validating...');
```

**Solution:**
```javascript
// ✅ Structured logging
Logger.service.info('Starting process', { 
  action: 'process_start',
  timestamp: Date.now() 
});
```

### 2. ID Inconsistency
**Problem:**
```javascript
// ❌ Mixed ID patterns
const userId = new ObjectId();
const gameId = 'game_' + Date.now();
```

**Solution:**
```javascript
// ✅ Consistent UUID usage
const userId = uuid.v4();
const gameId = uuid.v4();
```

### 3. High Complexity
**Problem:**
```javascript
// ❌ Deeply nested logic
if (user) {
  if (game) {
    if (config) {
      // ... more nesting
    }
  }
}
```

**Solution:**
```javascript
// ✅ Flattened logic with early returns
if (!user || !game || !config) return;

// Simplified logic
const result = processGameLogic(user, game, config);
```

### 4. Legacy Database Patterns
**Problem:**
```javascript
// ❌ Promise chains
User.findById(userId)
  .then(user => processUser(user))
  .catch(handleError);
```

**Solution:**
```javascript
// ✅ Modern async/await
try {
  const user = await User.findById(userId);
  await processUser(user);
} catch (error) {
  handleError(error);
}
```

### 5. Missing Service Extraction
**Problem:**
```javascript
// ❌ Business logic in route
app.post('/api/user/update', async (req, res) => {
  // Database operations and business logic mixed
  const user = await db.users.findById(req.body.userId);
  // ... complex business logic
});
```

**Solution:**
```javascript
// ✅ Proper service layer separation
app.post('/api/user/update', async (req, res) => {
  try {
    const result = await UserService.updateUser(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## 📊 Quality Enforcement Levels

### Development Stage
- **VS Code Real-time Feedback:** Immediate violation detection
- **Hover Help:** Detailed error explanations
- **Quick Fixes:** Automated suggestions

### Pre-commit Stage
- **Husky Hooks:** Automatic quality checking
- **Commit Blocking:** Prevents bad code from being committed
- **Guidance:** Clear instructions for fixes

### CI/CD Stage
- **GitHub Actions:** Automated pipeline enforcement
- **Merge Blocking:** Prevents violations from reaching main branch
- **Quality Reports:** Automated feedback in pull requests

### Code Review Stage
- **Quality Badges:** Visual indicators of code quality
- **Automated Comments:** Specific violation details
- **Standards Enforcement:** Consistent quality across reviews

## 🎯 Success Metrics

### Code Quality Improvements
- **Reduced Bug Count:** Proactive issue detection prevents runtime problems
- **Better Performance:** Logging optimization and complexity management
- **Maintainable Codebase:** Consistent patterns and proper architecture
- **Team Scalability:** New developers quickly learn and follow standards

### Developer Productivity Gains
- **Faster Reviews:** Automated quality checking reduces manual review time
- **Reduced Debugging:** Issues caught early prevent lengthy debugging sessions
- **Consistent Standards:** No debates about code quality in reviews
- **Knowledge Sharing:** Automated guidance helps developers improve

### Business Value
- **Higher Quality Releases:** Fewer production bugs and issues
- **Faster Development Cycles:** Less time spent on quality fixes
- **Better Team Collaboration:** Consistent standards across the team
- **Reduced Technical Debt:** Automated enforcement prevents quality decay

## 🛠 Troubleshooting Common Issues

### 1. Plugin Not Loading
**Symptoms:**
- No real-time feedback in VS Code
- Pre-commit hook fails with "plugin not found"

**Solutions:**
```bash
# Reinstall plugin
cd packages/server
npm install @attrition/eslint-plugin-code-smell-detector

# Restart VS Code
code --disable-extensions && code .
```

### 2. False Positives
**Symptoms:**
- Valid code flagged as violation
- Overly strict rules blocking legitimate patterns

**Solutions:**
```javascript
// Disable specific rules for specific cases
/* eslint-disable @attrition/code-smell-detector/max-complexity */
function complexAlgorithm() {
  // Complex but necessary logic
}
/* eslint-enable @attrition/code-smell-detector/max-complexity */

// Configure rule options
'@attrition/code-smell-detector/max-complexity': ['warn', { maxPerFunction: 15 }]
```

### 3. Performance Issues
**Symptoms:**
- Slow real-time feedback
- Long pre-commit validation times

**Solutions:**
```javascript
// Optimize ESLint configuration
{
  "ignorePatterns": [
    "node_modules/",
    "dist/",
    "*.d.ts"
  ],
  "overrides": [
    {
      "files": ["**/*.test.js"],
      "rules": {
        "@attrition/code-smell-detector/max-complexity": "off"
      }
    }
  ]
}
```

## 📚 Additional Resources

### Documentation
- [ESLint Rules Documentation](https://github.com/attrition-game/server/blob/main/docs/eslint-rules.md)
- [Migration Guidelines](https://github.com/attrition-game/server/blob/main/docs/migration.md)
- [Best Practices Guide](https://github.com/attrition-game/server/blob/main/docs/best-practices.md)

### Configuration Files
- `packages/server/.eslintrc.js` - Main ESLint configuration
- `.vscode/settings.json` - VS Code integration settings
- `.husky/pre-commit` - Pre-commit hook configuration
- `github-workflows-quality-enforcement.yml` - CI/CD pipeline

### Support Channels
- **Team Slack:** #code-quality channel
- **Documentation:** Internal wiki pages
- **Issue Tracking:** GitHub Issues with "quality" label

## 🎉 Conclusion

The Attrition code smell detection workflow successfully transforms the development experience from reactive (finding issues after they're written) to proactive (preventing issues as they're written). This system provides:

- **Immediate Feedback:** Issues caught as soon as they're written
- **Consistent Standards:** Automated enforcement across the entire team
- **Multiple Safety Nets:** Development → Pre-commit → CI/CD → Code Review
- **Developer Friendly:** Helpful guidance and quick fixes
- **Business Value:** Higher quality code with faster development cycles

This comprehensive quality enforcement system ensures that the Attrition game codebase maintains high standards while enabling rapid, confident development.
