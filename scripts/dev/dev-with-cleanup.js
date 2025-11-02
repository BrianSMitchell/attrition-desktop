#!/usr/bin/env node

/**
 * Development Script with Automatic Cleanup
 * Wraps the development process and ensures cleanup on exit
 * Windows-compatible with delayed signal handling to prevent premature termination
 */

const { spawn, execSync } = require('child_process');
const path = require('path');

// Platform detection
const isWindows = process.platform === 'win32';

// Configuration
const SIGNAL_SETUP_DELAY = 2000; // Delay before attaching signal handlers (ms)
const GRACEFUL_SHUTDOWN_TIMEOUT = 5000; // Timeout for graceful shutdown (ms)

console.log('🚀 Starting Attrition development environment with automatic cleanup...');

// Store the main development process
let devProcess = null;
let signalHandlersAttached = false;

// Cleanup function with enhanced Windows support
function cleanup(exitCode = 0) {
  console.log('\n🧹 Cleaning up development processes...');

  try {
    // Kill the main dev process if it's still running
    if (devProcess && !devProcess.killed) {
      console.log(' Terminating main development process...');

      if (isWindows) {
        // Use taskkill on Windows for better process termination
        try {
          const pid = devProcess.pid;
          if (pid) {
            execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'pipe' });
            console.log(`✅ Killed process ${pid} and child processes`);
          }
        } catch (killError) {
          console.log(' Process may have already exited');
        }
      } else {
        // Unix/Linux signal-based termination
        devProcess.kill('SIGTERM');

        // Give it a moment to shut down gracefully
        setTimeout(() => {
          if (!devProcess.killed) {
            console.log(' Force terminating development process...');
            devProcess.kill('SIGKILL');
          }
        }, 2000);
      }
    }

    // Run our cleanup script to kill any remaining processes
    const cleanupScript = path.join(__dirname, 'cleanup-dev-processes.js');
    execSync(`node "${cleanupScript}" kill`, { stdio: 'inherit' });

    console.log('✅ Development environment cleanup completed');
  } catch (error) {
    console.error('Error during cleanup:', error.message);
  }

  // Exit with the provided code after cleanup
  if (exitCode !== null) {
    process.exit(exitCode);
  }
}

// Windows-compatible signal handler setup with delay
function setupSignalHandlers() {
  if (signalHandlersAttached) return;

  console.log('🔧 Setting up signal handlers...');

  // Handle SIGINT (Ctrl+C) - common on all platforms
  process.on('SIGINT', () => {
    console.log('\n🛑 SIGINT received (Ctrl+C)');
    signalHandlersAttached = false; // Prevent re-entry
    cleanup(0);
  });

  // Handle SIGTERM - more common on Unix/Linux
  if (!isWindows) {
    process.on('SIGTERM', () => {
      console.log('\n🛑 SIGTERM received');
      signalHandlersAttached = false;
      cleanup(0);
    });
  } else {
    // Windows-specific signal handling
    process.on('SIGBREAK', () => {
      console.log('\n🛑 SIGBREAK received (Windows)');
      signalHandlersAttached = false;
      cleanup(0);
    });

    // Handle Windows console close events
    if (process.platform === 'win32') {
      process.on('SIGHUP', () => {
        console.log('\n🛑 SIGHUP received (Windows console close)');
        signalHandlersAttached = false;
        cleanup(0);
      });
    }
  }

  // Prevent "Terminate batch job" prompts on Windows
  if (isWindows) {
    process.stdin.setRawMode?.(false);
    process.stdin.pause?.();

    // Override process.exit to prevent prompts
    const originalExit = process.exit;
    process.exit = function(code) {
      try {
        // Clean up and exit without prompts
        process.stdout.write('\n');
        originalExit.call(process, code);
      } catch (e) {
        // Force exit if needed
        process.kill(process.pid, 'SIGKILL');
      }
    };
  }

  signalHandlersAttached = true;
  console.log('✅ Signal handlers attached');
}

// Handle process events
process.on('exit', () => {
  console.log('🔚 Process exiting, ensuring cleanup...');
  cleanup(null); // Don't exit again in cleanup
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  cleanup(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  cleanup(1);
});

// Start the development process using pnpm
console.log(' Starting development servers...');
devProcess = spawn('pnpm', ['dev'], {
  stdio: 'inherit',
  shell: true,
  // Windows-specific options to prevent console issues
  ...(isWindows && {
    windowsHide: false,
    windowsVerbatimArguments: true
  })
});

// Handle process events
devProcess.on('close', (code) => {
  console.log(`\n🔚 Development process exited with code ${code}`);
  cleanup(code || 0);
});

devProcess.on('error', (error) => {
  console.error('❌ Failed to start development process:', error);
  cleanup(1);
});

// Delay signal handler setup to allow child process to start
devProcess.on('spawn', () => {
  console.log('✅ Development process started successfully');

  // Wait for process to stabilize before attaching signal handlers
  setTimeout(() => {
    setupSignalHandlers();
  }, SIGNAL_SETUP_DELAY);
});

console.log('🎯 Development environment is starting. Please wait...');
console.log(isWindows ? '🪟 Windows detected - using Windows-compatible signal handling' : '🐧 Unix/Linux detected - using standard signal handling');
