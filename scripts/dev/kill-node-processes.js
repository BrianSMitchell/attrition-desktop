#!/usr/bin/env node

/**
 * Node.js Process Killer Utility
 * Kills all Node.js processes related to the Attrition project
 */

const { execSync, spawn } = require('child_process');
const os = require('os');

function isWindows() {
  return os.platform() === 'win32';
}

function killNodeProcesses() {
  try {
    if (isWindows()) {
      // Windows: Use taskkill to kill Attrition-related processes
      console.log(' Killing Attrition-related Node.js processes on Windows...');
      
      try {
        // Kill processes with "attrition" or "server" or "desktop" in the command line
        execSync('taskkill /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *attrition*" 2>nul', { stdio: 'inherit' });
      } catch (error) {
        // Ignore errors - process might not exist
      }
      
      try {
        execSync('taskkill /F /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *server*" 2>nul', { stdio: 'inherit' });
      } catch (error) {
        // Ignore errors - process might not exist
      }
      
      try {
        execSync('taskkill /F /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *desktop*" 2>nul', { stdio: 'inherit' });
      } catch (error) {
        // Ignore errors - process might not exist
      }
      
      try {
        // Kill Electron processes
        execSync('taskkill /F /IM electron.exe 2>nul', { stdio: 'inherit' });
      } catch (error) {
        // Ignore errors - process might not exist
      }
      
      console.log('✅ Attrition-related processes terminated');
    } else {
      // Unix-like systems (macOS, Linux)
      console.log(' Killing Attrition-related Node.js processes on Unix-like system...');
      
      try {
        // Kill processes containing attrition, server, or desktop
        execSync('pkill -f "attrition" || true', { stdio: 'inherit' });
        execSync('pkill -f "server" || true', { stdio: 'inherit' });
        execSync('pkill -f "desktop" || true', { stdio: 'inherit' });
        execSync('pkill -f "electron" || true', { stdio: 'inherit' });
        console.log('✅ Attrition-related processes terminated');
      } catch (error) {
        console.log(' Warning: Some processes may still be running');
      }
    }
  } catch (error) {
    console.error(' Error killing processes:', error.message);
  }
}

function listNodeProcesses() {
  try {
    if (isWindows()) {
      console.log(' Node.js processes running:');
      execSync('tasklist /FI "IMAGENAME eq node.exe"', { stdio: 'inherit' });
    } else {
      console.log(' Node.js processes running:');
      execSync('ps aux | grep node | grep -v grep', { stdio: 'inherit' });
    }
  } catch (error) {
    console.log(' No Node.js processes found');
  }
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'list':
    listNodeProcesses();
    break;
  case 'kill':
    killNodeProcesses();
    break;
  default:
    console.log(' Node.js Process Killer Utility');
    console.log(' Usage: node kill-node-processes.js <command>');
    console.log(' Commands:');
    console.log('   list  - List all Node.js processes');
    console.log('   kill  - Kill all Node.js processes');
    console.log('');
    console.log(' Note: This will kill ALL Node.js processes on your system,');
    console.log(' not just those related to the Attrition project.');
    break;
}
