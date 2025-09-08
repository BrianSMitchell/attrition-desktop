#!/usr/bin/env node

/**
 * Git Hooks Setup Script
 * 
 * This script sets up Git hooks for the Attrition project to ensure
 * consistent code quality and testing workflow integration.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const HOOKS_DIR = path.join(process.cwd(), '.husky');

// Ensure .husky directory exists
if (!fs.existsSync(HOOKS_DIR)) {
  fs.mkdirSync(HOOKS_DIR, { recursive: true });
}

console.log('🔧 Setting up Git hooks for Attrition...\n');

// Pre-commit hook
const preCommitHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🧪 Running pre-commit checks..."

# Lint and fix staged files
pnpm run lint:staged

# Run unit tests on affected files
echo "Running unit tests..."
pnpm run test:unit

# Type checking
echo "Running type checking..."
pnpm run type-check

echo "✅ Pre-commit checks passed!"
`;

fs.writeFileSync(path.join(HOOKS_DIR, 'pre-commit'), preCommitHook);

// Commit message hook
const commitMsgHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Validate commit message format
pnpm exec commitlint --edit $1
`;

fs.writeFileSync(path.join(HOOKS_DIR, 'commit-msg'), commitMsgHook);

// Pre-push hook
const prePushHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🚀 Running pre-push checks..."

# Check if we're pushing to main or develop
branch=$(git rev-parse --abbrev-ref HEAD)

if [ "$branch" = "main" ] || [ "$branch" = "develop" ]; then
  echo "⚠️  Pushing to protected branch: $branch"
  echo "Running comprehensive test suite..."
  
  # Full test suite for main/develop branches
  pnpm run test:ci
  pnpm run test:multiplayer
  pnpm run test:game-simulation
  
  # Performance tests
  echo "Running performance tests..."
  pnpm run test:performance
  
  # E2E tests
  echo "Running E2E tests..."
  pnpm run e2e:ci
else
  echo "📋 Running standard pre-push checks for feature branch..."
  
  # Standard checks for feature branches
  pnpm run test:coverage
  pnpm run test:integration
fi

# Ensure build works
echo "Verifying build..."
pnpm run build

echo "✅ Pre-push checks passed!"
`;

fs.writeFileSync(path.join(HOOKS_DIR, 'pre-push'), prePushHook);

// Post-merge hook (for pulling updates)
const postMergeHook = `#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "📥 Post-merge hook running..."

# Check if package.json files changed
if git diff-tree -r --name-only --no-commit-id HEAD@{1} HEAD | grep -q "package.*json"; then
  echo "📦 Package files changed, updating dependencies..."
  pnpm install
fi

# Check if test configurations changed
if git diff-tree -r --name-only --no-commit-id HEAD@{1} HEAD | grep -q "jest\\|playwright\\|test"; then
  echo "🧪 Test configurations changed, updating test dependencies..."
  pnpm run e2e:install
fi

echo "✅ Post-merge setup complete!"
`;

fs.writeFileSync(path.join(HOOKS_DIR, 'post-merge'), postMergeHook);

// Make hooks executable
try {
  execSync('chmod +x .husky/*', { stdio: 'inherit' });
} catch (error) {
  // On Windows, chmod might not work, but the hooks should still function
  console.log('⚠️  Could not set execute permissions (this is normal on Windows)');
}

// Create husky configuration
const huskyConfig = `#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  debug () {
    if [ "$HUSKY_DEBUG" = "1" ]; then
      echo "husky (debug) - $1"
    fi
  }

  readonly hook_name="$(basename -- "$0")"
  debug "starting $hook_name..."

  if [ "$HUSKY" = "0" ]; then
    debug "HUSKY env variable is set to 0, skipping hook"
    exit 0
  fi

  if [ -f ~/.huskyrc ]; then
    debug "sourcing ~/.huskyrc"
    . ~/.huskyrc
  fi

  readonly husky_skip_init=1
  export husky_skip_init
  sh -e "$0" "$@"
  exitCode="$?"

  if [ $exitCode != 0 ]; then
    echo ""
    echo "Git hook failed. Add 'HUSKY=0' to your environment to bypass hooks."
    echo ""
  fi

  exit $exitCode
fi
`;

fs.writeFileSync(path.join(HOOKS_DIR, '_', 'husky.sh'), huskyConfig);

console.log('✅ Git hooks setup complete!\n');
console.log('📋 The following hooks have been configured:');
console.log('   • pre-commit: Runs linting, unit tests, and type checking');
console.log('   • commit-msg: Validates commit message format');
console.log('   • pre-push: Runs comprehensive tests based on target branch');
console.log('   • post-merge: Updates dependencies when package files change');
console.log('\n💡 To bypass hooks temporarily, use: HUSKY=0 git commit');
console.log('💡 To skip a specific hook, use: git commit --no-verify');
console.log('\n🚀 Development workflow integration is now active!');
