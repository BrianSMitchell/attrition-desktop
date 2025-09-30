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
  const commands = [
    // Kill Node.js processes related to Attrition
    'taskkill /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *attrition*" 2>nul',
    'taskkill /F /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *server*" 2>nul',
    'taskkill /F /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *desktop*" 2>nul',
    'taskkill /F /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *client*" 2>nul',
    
    // Kill Electron processes
    'taskkill /F /IM electron.exe 2>nul',
    
    // Kill any remaining Node.js processes (fallback)
    'taskkill /F /FI "IMAGENAME eq node.exe" /FI "COMMANDLINE eq *attrition*" 2>nul'
  ];
  
  let successCount = 0;
  
  commands.forEach(command => {
    try {
      execSync(command, { stdio: 'pipe' });
      successCount++;
    } catch (error) {
      // Ignore errors - process might not exist
    }
  });
  
  console.log(`✅ Attempted to kill ${successCount} process groups`);
  console.log('✅ Development environment cleanup completed');
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
