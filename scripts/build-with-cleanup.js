#!/usr/bin/env node

/**
 * Build with Cleanup Wrapper
 * 
 * Runs the pre-build cleanup and then continues with the build.
 * This ensures proper exit code handling on Windows.
 */

const { execSync } = require('child_process');
const path = require('path');

// ANSI colors
const colors = {
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
};

function log(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

function runCommand(command, description) {
  log(`\n${description}...`, 'cyan');
  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      shell: true
    });
    return true;
  } catch (error) {
    log(`\n❌ ${description} failed!`, 'red');
    return false;
  }
}

function runCleanupOnExit(reason) {
  try {
    log(`\n🧹 Running cleanup on exit${reason ? ` (${reason})` : ''}...`, 'cyan');
    execSync('node scripts/pre-build-cleanup.js --force', {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..'),
      shell: true
    });
  } catch (e) {
    // best-effort; ignore errors
  }
}

// Ensure we attempt cleanup if this wrapper is interrupted mid-build
['SIGINT', 'SIGTERM'].forEach(sig => {
  process.on(sig, () => {
    runCleanupOnExit(sig);
    process.exit(1);
  });
});
process.on('uncaughtException', (err) => {
  log(`\n💥 Uncaught exception: ${err && err.message ? err.message : err}`, 'red');
  runCleanupOnExit('uncaughtException');
  process.exit(1);
});
process.on('exit', (code) => {
  if (code !== 0) {
    runCleanupOnExit(`code ${code}`);
  }
});

// Get the build target from command line args
const args = process.argv.slice(2);
const buildTarget = args[0] || 'all';

// Determine which build command to run
let buildCommand;
switch (buildTarget) {
  case 'all':
    buildCommand = 'pnpm --filter @game/shared build && pnpm --filter @game/client build && pnpm --filter @game/desktop build && pnpm --filter @game/launcher build';
    break;
  case 'desktop':
    buildCommand = 'pnpm --filter @game/shared build && pnpm --filter @game/server build && pnpm --filter @game/desktop build';
    break;
  default:
    log(`Unknown build target: ${buildTarget}`, 'red');
    process.exit(1);
}

// Run cleanup
log('\n🧹 Step 1: Pre-Build Cleanup', 'cyan');
const cleanupSuccess = runCommand(
  'node scripts/pre-build-cleanup.js --force',
  'Cleaning up processes'
);

if (!cleanupSuccess) {
  log('\n⚠️  Cleanup had issues, but continuing with build...', 'yellow');
}

// Run build
log('\n🏗️  Step 2: Building', 'cyan');
const buildSuccess = runCommand(buildCommand, 'Building packages');

if (buildSuccess) {
  log('\n✅ Build completed successfully!', 'green');
  process.exit(0);
} else {
  log('\n❌ Build failed!', 'red');
  process.exit(1);
}