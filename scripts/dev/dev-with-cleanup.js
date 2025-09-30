#!/usr/bin/env node

/**
 * Development Script with Automatic Cleanup
 * Wraps the development process and ensures cleanup on exit
 */

const { spawn, execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting Attrition development environment with automatic cleanup...');

// Store the main development process
let devProcess = null;

// Cleanup function
function cleanup() {
  console.log('\n🧹 Cleaning up development processes...');
  
  try {
    // Kill the main dev process if it's still running
    if (devProcess && !devProcess.killed) {
      console.log(' Terminating main development process...');
      devProcess.kill('SIGTERM');
      
      // Give it a moment to shut down gracefully
      setTimeout(() => {
        if (!devProcess.killed) {
          console.log(' Force terminating development process...');
          devProcess.kill('SIGKILL');
        }
      }, 2000);
    }
    
    // Run our cleanup script to kill any remaining processes
    const cleanupScript = path.join(__dirname, 'cleanup-dev-processes.js');
    execSync(`node "${cleanupScript}" kill`, { stdio: 'inherit' });
    
    console.log('✅ Development environment cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }
}

// Handle different exit signals
process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received (Ctrl+C)');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM received');
  cleanup();
  process.exit(0);
});

process.on('exit', () => {
  console.log('🔚 Process exiting, ensuring cleanup...');
  cleanup();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  cleanup();
  process.exit(1);
});

// Start the development process using pnpm
console.log(' Starting development servers...');
devProcess = spawn('pnpm', ['dev'], {
  stdio: 'inherit',
  shell: true
});

// Handle process events
devProcess.on('close', (code) => {
  console.log(`\n🔚 Development process exited with code ${code}`);
  cleanup();
  process.exit(code || 0);
});

devProcess.on('error', (error) => {
  console.error('❌ Failed to start development process:', error);
  cleanup();
  process.exit(1);
});

console.log('🎯 Development environment is running. Press Ctrl+C to stop and cleanup.');
