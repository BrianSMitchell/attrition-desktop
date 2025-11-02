#!/usr/bin/env node

/**
 * Development Process Cleanup Utility
 * Kills all Node.js and Electron processes related to the Attrition development environment
 */

const { execSync } = require('child_process');
const os = require('os');

function isWindows() {
  return os.platform() === 'win32';
}

function cleanupDevProcesses() {
  console.log('🧹 Cleaning up Attrition development processes...');
  
  if (isWindows()) {
    cleanupWindowsProcesses();
  } else {
    cleanupUnixProcesses();
  }
}

function cleanupWindowsProcesses() {
  console.log('🔍 Detecting running processes...');

  const commands = [
    // Enhanced Node.js process detection and termination
    {
      name: 'Attrition main processes',
      cmd: 'taskkill /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *attrition*" /T /F 2>nul'
    },
    {
      name: 'Server processes',
      cmd: 'taskkill /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *server*" /T /F 2>nul'
    },
    {
      name: 'Desktop processes',
      cmd: 'taskkill /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *desktop*" /T /F 2>nul'
    },
    {
      name: 'Client processes',
      cmd: 'taskkill /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *client*" /T /F 2>nul'
    },

    // Kill Electron processes with tree termination
    {
      name: 'Electron processes',
      cmd: 'taskkill /IM electron.exe /T /F 2>nul'
    },

    // Kill by command line patterns (more reliable detection)
    {
      name: 'Processes by command line',
      cmd: 'taskkill /FI "IMAGENAME eq node.exe" /FI "COMMANDLINE eq *dev-with-cleanup.js*" /T /F 2>nul'
    },
    {
      name: 'PNPM dev processes',
      cmd: 'taskkill /FI "IMAGENAME eq node.exe" /FI "COMMANDLINE eq *pnpm*dev*" /T /F 2>nul'
    },

    // Additional cleanup for common ports
    {
      name: 'Processes on port 3001',
      cmd: 'for /f "tokens=5" %a in (\'netstat -aon ^| findstr :3001 ^| findstr LISTENING\') do taskkill /PID %a /T /F 2>nul'
    },
    {
      name: 'Processes on port 5173',
      cmd: 'for /f "tokens=5" %a in (\'netstat -aon ^| findstr :5173 ^| findstr LISTENING\') do taskkill /PID %a /T /F 2>nul'
    },
    {
      name: 'Processes on port 5174',
      cmd: 'for /f "tokens=5" %a in (\'netstat -aon ^| findstr :5174 ^| findstr LISTENING\') do taskkill /PID %a /T /F 2>nul'
    }
  ];

  let successCount = 0;
  let errorCount = 0;

  commands.forEach(({ name, cmd }) => {
    try {
      console.log(`🔫 Terminating ${name}...`);
      execSync(cmd, { stdio: 'pipe' });
      console.log(`  ✅ ${name} terminated successfully`);
      successCount++;
    } catch (error) {
      // Only log errors if not "process not found" (exit code 128)
      if (error.status !== 128 && error.status !== 1) {
        console.log(`  ⚠️  ${name} - Error: ${error.message}`);
        errorCount++;
      } else {
        console.log(`  ℹ️  ${name} - No processes found`);
      }
    }
  });

  // Additional cleanup for stubborn processes
  console.log('🧹 Performing final cleanup sweep...');
  try {
    // Kill any remaining node processes with 'attrition' in command line
    execSync('taskkill /FI "IMAGENAME eq node.exe" /FI "COMMANDLINE eq *attrition*" /T /F 2>nul', { stdio: 'pipe' });
    console.log('  ✅ Final sweep completed');
  } catch (error) {
    console.log('  ℹ️  Final sweep - No additional processes found');
  }

  console.log(`\n📊 Cleanup Summary:`);
  console.log(`  ✅ Successful terminations: ${successCount}`);
  console.log(`  ⚠️  Errors encountered: ${errorCount}`);
  console.log('✅ Windows development environment cleanup completed');
}

function cleanupUnixProcesses() {
  const commands = [
    // Kill processes by name pattern
    'pkill -f "attrition" || true',
    'pkill -f "server" || true',
    'pkill -f "desktop" || true',
    'pkill -f "client" || true',
    'pkill -f "electron" || true',
    
    // Kill by port (common development ports)
    'lsof -ti:3001 | xargs kill -9 2>/dev/null || true',
    'lsof -ti:5173 | xargs kill -9 2>/dev/null || true',
    'lsof -ti:5174 | xargs kill -9 2>/dev/null || true'
  ];
  
  commands.forEach(command => {
    try {
      execSync(command, { stdio: 'pipe' });
    } catch (error) {
      // Ignore errors
    }
  });
  
  console.log('✅ Unix process cleanup completed');
}

function listDevProcesses() {
  console.log('🔍 Currently running Attrition-related processes:');
  
  if (isWindows()) {
    try {
      execSync('tasklist /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *attrition*" 2>nul', { stdio: 'inherit' });
    } catch (error) {
      console.log('No specific Attrition processes found');
    }
    
    try {
      execSync('tasklist /FI "IMAGENAME eq electron.exe"', { stdio: 'inherit' });
    } catch (error) {
      console.log('No Electron processes found');
    }
  } else {
    try {
      execSync('ps aux | grep -E "(attrition|electron|server|desktop)" | grep -v grep', { stdio: 'inherit' });
    } catch (error) {
      console.log('No Attrition-related processes found');
    }
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'list':
    listDevProcesses();
    break;
  case 'kill':
  case 'cleanup':
    cleanupDevProcesses();
    break;
  default:
    console.log(' Attrition Development Process Cleanup Utility');
    console.log(' Usage: node cleanup-dev-processes.js <command>');
    console.log(' Commands:');
    console.log('   list    - List all Attrition-related processes');
    console.log('   kill    - Kill all Attrition development processes');
    console.log('   cleanup - Same as kill (alias)');
    console.log('');
    console.log(' This utility helps clean up development processes that');
    console.log(' may be left running after Ctrl+C interruption.');
    break;
}
