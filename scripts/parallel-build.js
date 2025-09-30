#!/usr/bin/env node

/**
 * Optimized parallel build script for Attrition project
 * This script analyzes dependencies and parallelizes builds where possible
 */

import { spawn, exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

console.log('🚀 Starting optimized parallel build process...');

/**
 * Execute a command with proper error handling and output
 */
function runCommand(command, cwd = process.cwd()) {
  return new Promise((resolve, reject) => {
    console.log(`▶️  Running: ${command} (in ${cwd})`);
    
    const child = spawn('pnpm', command.split(' ').slice(1), {
      cwd,
      stdio: 'inherit',
      shell: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Completed: ${command}`);
        resolve();
      } else {
        console.error(`❌ Failed: ${command} (exit code ${code})`);
        reject(new Error(`Command failed: ${command}`));
      }
    });

    child.on('error', (error) => {
      console.error(`💥 Error executing: ${command}`, error);
      reject(error);
    });
  });
}

/**
 * Run commands in parallel
 */
async function runInParallel(commands, description) {
  console.log(`\n🔄 ${description}`);
  try {
    await Promise.all(commands.map(cmd => runCommand(cmd)));
    console.log(`✅ ${description} - All completed successfully`);
  } catch (error) {
    console.error(`❌ ${description} - Failed:`, error.message);
    throw error;
  }
}

/**
 * Run commands in sequence
 */
async function runInSequence(commands, description) {
  console.log(`\n📋 ${description}`);
  for (const cmd of commands) {
    await runCommand(cmd);
  }
  console.log(`✅ ${description} - All completed successfully`);
}

async function main() {
  const startTime = Date.now();

  try {
    // Phase 1: Build shared package (required by others)
    await runInSequence([
      'pnpm --filter @game/shared build'
    ], 'Phase 1: Building shared package');

    // Phase 2: Build client (depends on shared, can run alone)
    await runInSequence([
      'pnpm --filter @game/client build:dev'
    ], 'Phase 2: Building client package');

    // Phase 3: Server build can happen in parallel with client if needed
    // For now, this is just the desktop electron startup since server is separate

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Build completed successfully in ${totalTime}s`);
    console.log('📊 Build Performance Summary:');
    console.log('   - Shared package: Required foundation');
    console.log('   - Client package: Optimized development build');
    console.log('   - Desktop ready: Electron can now start');

    // Optional: Show file sizes for the built packages
    try {
      const { stdout: clientStats } = await execAsync('du -sh packages/client/dist 2>/dev/null || dir packages\\client\\dist | findstr "bytes"');
      console.log(`   - Client bundle size: ${clientStats.trim()}`);
    } catch (e) {
      // Ignore file size errors
    }

  } catch (error) {
    console.error('\n💥 Build failed:', error.message);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Build interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  Build terminated');
  process.exit(1);
});

// Run the main function
main().catch((error) => {
  console.error('🚨 Unhandled error:', error);
  process.exit(1);
});