#!/usr/bin/env node

/**
 * Pre-Build Cleanup Script
 * 
 * Stops all running Electron and Node processes to prevent file locks
 * during native module rebuilds (e.g., better-sqlite3).
 * 
 * Cross-platform: Works on Windows, macOS, and Linux
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const os = require('os');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  force: args.includes('--force') || args.includes('-f'),
  dryRun: args.includes('--dry-run') || args.includes('-d'),
  verbose: args.includes('--verbose') || args.includes('-v'),
  help: args.includes('--help') || args.includes('-h'),
};

/**
 * Print colored output
 */
function colorLog(message, color = 'reset') {
  console.log(colors[color] + message + colors.reset);
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
${colors.cyan}Pre-Build Cleanup Script${colors.reset}
${'='.repeat(50)}

Stops all running Electron and Node processes to prevent file locks
during native module rebuilds.

${colors.green}Usage:${colors.reset}
  node scripts/pre-build-cleanup.js [options]
  npm run prebuild:clean [-- options]

${colors.green}Options:${colors.reset}
  -f, --force      Force kill without confirmation
  -d, --dry-run    Show what would be killed without doing it
  -v, --verbose    Show detailed process information
  -h, --help       Show this help message

${colors.green}Examples:${colors.reset}
  node scripts/pre-build-cleanup.js
  node scripts/pre-build-cleanup.js --force
  node scripts/pre-build-cleanup.js --dry-run --verbose
  npm run prebuild:clean -- --force
`);
  process.exit(0);
}

/**
 * Check if process should be excluded
 */
function shouldExcludeProcess(proc, currentPid, parentPids = []) {
  // Always exclude current process
  if (proc.pid === currentPid) return true;
  
  // Exclude if this process is a parent of current process
  if (parentPids.includes(proc.pid)) return true;
  
  // Exclude package manager processes that are likely running this script
  const excludePatterns = [
    /pnpm.*node/i,
    /npm.*node/i,
    /yarn.*node/i,
  ];
  
  return excludePatterns.some(pattern => pattern.test(proc.name + ' ' + (proc.cmd || '')));
}

/**
 * Get parent process IDs
 */
function getParentPids() {
  const platform = os.platform();
  const currentPid = process.pid;
  const parentPids = [];
  
  try {
    if (platform === 'win32') {
      // Get parent process on Windows
      const output = execSync(`wmic process where ProcessId=${currentPid} get ParentProcessId /format:value`, 
        { encoding: 'utf8', timeout: 2000, windowsHide: true });
      const match = output.match(/ParentProcessId=(\d+)/);
      if (match && match[1]) {
        const ppid = parseInt(match[1]);
        if (ppid > 0) {
          parentPids.push(ppid);
          // Try to get grandparent
          try {
            const output2 = execSync(`wmic process where ProcessId=${ppid} get ParentProcessId /format:value`, 
              { encoding: 'utf8', timeout: 2000, windowsHide: true });
            const match2 = output2.match(/ParentProcessId=(\d+)/);
            if (match2 && match2[1]) {
              parentPids.push(parseInt(match2[1]));
            }
          } catch {}
        }
      }
    } else {
      // Unix: use ps to get parent process
      const output = execSync(`ps -p ${currentPid} -o ppid=`, { encoding: 'utf8', timeout: 2000 });
      const ppid = parseInt(output.trim());
      if (ppid > 0) parentPids.push(ppid);
    }
  } catch (error) {
    // Ignore errors - we'll proceed without parent filtering
    if (options.verbose) {
      colorLog(`  (Could not determine parent processes)`, 'yellow');
    }
  }
  
  return parentPids;
}

/**
 * Get list of processes by name pattern
 */
function getProcesses() {
  const platform = os.platform();
  const currentPid = process.pid;
  const parentPids = getParentPids();
  const projectRoot = path.resolve(__dirname, '..');

  if (platform === 'win32') {
    // Windows: Prefer WMIC to include CommandLine so we can scope to this repo only
    try {
      // Using LIST format to simplify parsing and avoid CSV issues with commas in args
      const wmicCmd = "wmic process where (name='node.exe' or name='electron.exe') get ProcessId,ParentProcessId,Name,CommandLine /FORMAT:LIST";
      const output = execSync(wmicCmd, { encoding: 'utf8', timeout: 7000, windowsHide: true });
      const blocks = output.split(/\r?\n\r?\n/).map(b => b.trim()).filter(Boolean);
      const procs = blocks.map(block => {
        const rec = {};
        block.split(/\r?\n/).forEach(line => {
          const idx = line.indexOf('=');
          if (idx > -1) {
            const key = line.slice(0, idx).trim();
            const val = line.slice(idx + 1).trim();
            rec[key] = val;
          }
        });
        if (!rec.Name || !rec.ProcessId) return null;
        const name = String(rec.Name).toLowerCase();
        const pid = parseInt(rec.ProcessId, 10);
        const cmd = String(rec.CommandLine || '');
        const ppid = rec.ParentProcessId ? parseInt(rec.ParentProcessId, 10) : undefined;
        return { name, pid, cmd, ppid };
      }).filter(Boolean);

      // Keep only processes related to this repository (avoid killing unrelated Node/Electron)
      const filtered = procs.filter(p => {
        // basic name filter
        const isTarget = p.name.includes('electron') || p.name.includes('node');
        if (!isTarget) return false;
        // scope to this checkout by checking command line contains project path
        const isInRepo = p.cmd && p.cmd.toLowerCase().includes(projectRoot.toLowerCase());
        if (!isInRepo) return false;
        // apply exclusions (self, parents like pnpm)
        return !shouldExcludeProcess(p, currentPid, parentPids);
      });

      return filtered.map(p => ({ name: p.name, pid: p.pid, cmd: p.cmd }));
    } catch (e) {
      // Fallback: tasklist (less precise; will still try to exclude parents/self)
      const command = 'tasklist /FO CSV /NH';
      try {
        const output = execSync(command, { encoding: 'utf8', timeout: 5000, windowsHide: true });
        return output
          .split('\n')
          .filter(line => line.trim())
          .map(line => {
            const parts = line.split('\",\"');
            if (parts.length >= 2) {
              const name = parts[0].replace(/^\"/, '').toLowerCase();
              const pid = parseInt(parts[1].replace(/\"/g, ''));
              return { name, pid, cmd: '' };
            }
            return null;
          })
          .filter(p => {
            if (!p) return false;
            if (!p.name.includes('electron') && !p.name.includes('node')) return false;
            return !shouldExcludeProcess(p, currentPid, parentPids);
          });
      } catch (error) {
        colorLog(`⚠️  Warning: Failed to get process list: ${error.message}`, 'yellow');
        return [];
      }
    }
  }

  // Unix-like: Use ps with grep then filter by project path if available
  try {
    const command = 'ps aux';
    const output = execSync(command, { encoding: 'utf8', timeout: 5000 });
    const results = output
      .split('\n')
      .slice(1)
      .filter(line => line.includes('electron') || line.includes('node'))
      .map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length < 11) return null;
        const pid = parseInt(parts[1], 10);
        const cmd = parts.slice(10).join(' ');
        const name = path.basename((parts[10] || '').split('/').pop() || '');
        return { name, pid, cmd };
      })
      .filter(p => p && p.pid !== currentPid)
      .filter(p => (p.cmd || '').includes(projectRoot));

    return results;
  } catch (error) {
    colorLog(`⚠️  Warning: Failed to get process list: ${error.message}`, 'yellow');
    return [];
  }
}

/**
 * Kill a process by PID
 */
function killProcess(pid) {
  const platform = os.platform();
  // On Windows, use /T to terminate the entire process tree to avoid orphans
  const command = platform === 'win32'
    ? `taskkill /F /T /PID ${pid} 2>nul`
    : `kill -9 ${pid}`;

  try {
    execSync(command, {
      stdio: 'ignore',
      timeout: 5000,
      windowsHide: true
    });
    return true;
  } catch (error) {
    // Ignore errors - process might already be dead
    if (options.verbose) {
      colorLog(`  (Process ${pid} error: ${error.message})`, 'yellow');
    }
    return false;
  }
}

/**
 * Group processes by name
 */
function groupProcesses(processes) {
  const groups = {};
  processes.forEach(proc => {
    if (!groups[proc.name]) {
      groups[proc.name] = [];
    }
    groups[proc.name].push(proc.pid);
  });
  return groups;
}

/**
 * Prompt for confirmation
 */
function promptConfirmation(message) {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question(message, (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main execution
 */
async function main() {
  if (options.help) {
    showHelp();
  }

  colorLog('\n🧹 Pre-Build Cleanup Script', 'cyan');
  colorLog('='.repeat(50), 'cyan');

  // Find processes
  colorLog('\n🔍 Searching for Electron and Node processes...', 'cyan');
  const processes = getProcesses();

  if (processes.length === 0) {
    colorLog('\n✅ No Electron or Node processes found. Build environment is clean!', 'green');
    process.exit(0);
  }

  // Display found processes
  const grouped = groupProcesses(processes);
  colorLog(`\n📋 Found ${processes.length} process(es):`, 'yellow');

  if (options.verbose) {
    console.log('\nProcess Details:');
    processes.forEach(proc => {
      console.log(`  • ${proc.name} (PID: ${proc.pid})`);
    });
  } else {
    console.log('\nProcess Summary:');
    Object.entries(grouped).forEach(([name, pids]) => {
      console.log(`  • ${name}: ${pids.length} instance(s) (PIDs: ${pids.join(', ')})`);
    });
  }

  // Dry run mode
  if (options.dryRun) {
    colorLog(`\n🔍 DRY RUN MODE: Would kill ${processes.length} process(es)`, 'yellow');
    colorLog('Run without --dry-run to actually stop these processes', 'cyan');
    process.exit(0);
  }

  // Confirmation prompt (unless force is used)
  if (!options.force) {
    colorLog('\n⚠️  Warning: This will forcefully terminate all Electron and Node processes!', 'yellow');
    const confirmed = await promptConfirmation('Do you want to continue? (y/N): ');
    
    if (!confirmed) {
      colorLog('\n❌ Operation cancelled by user', 'red');
      process.exit(0);
    }
  }

  // Kill processes
  colorLog('\n🔨 Stopping processes...', 'cyan');
  
  let successCount = 0;
  let failCount = 0;

  // Kill processes in parallel with timeout
  const killPromises = processes.map(proc => {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (options.verbose) {
          colorLog(`  ⏱  Timeout killing ${proc.name} (PID: ${proc.pid})`, 'yellow');
        }
        resolve({ proc, success: false, timeout: true });
      }, 3000);

      try {
        const success = killProcess(proc.pid);
        clearTimeout(timeout);
        resolve({ proc, success, timeout: false });
      } catch (error) {
        clearTimeout(timeout);
        resolve({ proc, success: false, timeout: false, error });
      }
    });
  });

  const results = await Promise.all(killPromises);
  
  results.forEach(({ proc, success, timeout }) => {
    if (success || timeout) {
      successCount++;
      if (options.verbose) {
        colorLog(`  ✓ Stopped ${proc.name} (PID: ${proc.pid})${timeout ? ' (timeout)' : ''}`, 'green');
      }
    } else {
      failCount++;
      if (options.verbose) {
        colorLog(`  ✗ Failed to stop ${proc.name} (PID: ${proc.pid})`, 'red');
      }
    }
  });

  if (!options.verbose && successCount > 0) {
    colorLog(`  ✓ Stopped ${successCount} process(es)`, 'green');
  }

  // Wait for processes to terminate
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Verify cleanup
  colorLog('\n🔍 Verifying cleanup...', 'cyan');
  const remainingProcesses = getProcesses();

  // Summary
  colorLog('\n' + '='.repeat(50), 'cyan');
  colorLog('📊 Summary:', 'cyan');
  console.log(`  • Processes found: ${processes.length}`);
  colorLog(`  • Successfully stopped: ${successCount}`, 'green');
  
  if (failCount > 0) {
    colorLog(`  • Failed to stop: ${failCount}`, 'red');
  }

  if (remainingProcesses.length === 0) {
    colorLog('\n✅ All processes cleaned up successfully!', 'green');
    colorLog('🚀 Build environment is ready!', 'green');
    process.exit(0);
  } else {
    colorLog(`\n⚠️  Warning: ${remainingProcesses.length} process(es) still running:`, 'yellow');
    remainingProcesses.forEach(proc => {
      console.log(`  • ${proc.name} (PID: ${proc.pid})`);
    });
    colorLog('You may need to manually stop these processes or restart your computer', 'yellow');
    process.exit(0); // Still exit successfully - we did our best
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    colorLog(`\n❌ Error: ${error.message}`, 'red');
    if (options.verbose) {
      console.error(error);
    }
    process.exit(1);
  });
}

module.exports = { main, getProcesses, killProcess };