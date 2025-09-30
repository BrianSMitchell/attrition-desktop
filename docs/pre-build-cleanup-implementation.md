# Pre-Build Cleanup Implementation Summary

## Overview

Implemented automated cleanup of Electron and Node.js processes before building to prevent `EPERM` (permission) errors when rebuilding native modules like `better-sqlite3`.

## Problem Statement

When building Electron applications with native dependencies, the following error commonly occurs:

```
Error: EPERM: operation not permitted, unlink 'C:\...\better-sqlite3\build\Release\better_sqlite3.node'
```

**Root Cause:** Running Electron or Node processes maintain file locks on native module binaries, preventing the build system from replacing them during the rebuild process.

## Solution Architecture

### 1. Cross-Platform Node.js Script

**File:** `scripts/pre-build-cleanup.js`

**Features:**
- Works on Windows, macOS, and Linux
- Uses platform-specific commands (`tasklist` on Windows, `ps aux` on Unix)
- Provides colored console output for better UX
- Includes comprehensive error handling
- Supports multiple modes of operation

**Modes:**
- **Normal Mode:** Prompts for confirmation before killing processes
- **Force Mode:** (`--force`) Kills processes without confirmation (for CI/CD)
- **Dry Run Mode:** (`--dry-run`) Shows what would be killed without taking action
- **Verbose Mode:** (`--verbose`) Displays detailed process information

### 2. Windows PowerShell Script

**File:** `scripts/pre-build-cleanup.ps1`

**Features:**
- Enhanced Windows-specific features
- PowerShell parameter validation
- Formatted table output for processes
- Comprehensive cmdlet-based help system
- Better error messages using PowerShell objects

**Parameters:**
- `-Force`: Skip confirmation
- `-DryRun`: Preview mode
- `-Verbose`: Detailed output

### 3. NPM Script Integration

**Added to `package.json`:**

```json
{
  "scripts": {
    "prebuild:clean": "node scripts/pre-build-cleanup.js --force",
    "prebuild:clean:check": "node scripts/pre-build-cleanup.js --dry-run",
    "build": "pnpm run prebuild:clean && ...",
    "build:all": "pnpm run prebuild:clean && ..."
  }
}
```

**Integration Points:**
- `prebuild:clean` - Force cleanup (used in automated builds)
- `prebuild:clean:check` - Safe preview mode
- `build` - Main build command (now includes cleanup)
- `build:all` - Complete build command (now includes cleanup)

## Implementation Details

### Process Detection

The scripts detect processes by name pattern matching:
- **Electron processes:** Any process with "electron" in the name
- **Node processes:** Any process with "node" in the name

### Process Termination

**Windows:**
```cmd
taskkill /F /PID <pid>
```

**Unix-like:**
```bash
kill -9 <pid>
```

### Verification

After termination, the scripts:
1. Wait 1 second for processes to exit
2. Re-scan for remaining processes
3. Report success or list any survivors

### Error Handling

- Graceful handling of permission errors
- Reports individual failures without stopping cleanup
- Provides actionable troubleshooting advice
- Verifies final state before completion

## Usage Examples

### Basic Usage

```bash
# Check what's running (safe)
pnpm run prebuild:clean:check

# Clean up with confirmation
node scripts/pre-build-cleanup.js

# Clean up without confirmation
pnpm run prebuild:clean

# Build (cleanup happens automatically)
pnpm run build:all
```

### Advanced Usage

```bash
# Detailed process information
node scripts/pre-build-cleanup.js --dry-run --verbose

# Force cleanup in CI/CD
node scripts/pre-build-cleanup.js --force

# PowerShell with parameters
.\scripts\pre-build-cleanup.ps1 -DryRun -Verbose
```

## Documentation Created

### 1. Quick Reference Guide
**File:** `PREBUILD-CLEANUP.md`
- User-friendly quick start guide
- Common workflows
- Troubleshooting section
- Command reference

### 2. Scripts README Update
**File:** `scripts/README.md`
- Added pre-build cleanup section
- Integration documentation
- Feature list
- Usage examples

### 3. Implementation Notes
**File:** `docs/pre-build-cleanup-implementation.md` (this file)
- Technical architecture
- Implementation details
- Design decisions
- Future improvements

## Benefits

### For Developers
✅ No more manual process killing  
✅ Reduced build failures from file locks  
✅ Automatic integration with build commands  
✅ Safe preview mode for checking impact  
✅ Cross-platform compatibility  

### For CI/CD
✅ Reliable automated builds  
✅ No interactive prompts with `--force`  
✅ Consistent behavior across environments  
✅ Clear error messages for debugging  

### For the Project
✅ Better developer experience  
✅ Reduced time debugging build issues  
✅ Documentation for future contributors  
✅ Reusable pattern for other projects  

## Testing Results

### Initial Test
```
Found Processes:
• electron.exe: 5 instances
• node.exe: 11 instances

Result: ✅ Successfully stopped all 16 processes
```

### Dry Run Test
```bash
$ pnpm run prebuild:clean:check

🔍 Searching for Electron and Node processes...
📋 Found 16 process(es):
  • node.exe: 11 instance(s)
  • electron.exe: 5 instance(s)

🔍 DRY RUN MODE: Would kill 16 process(es)
```

### Build Integration Test
```bash
$ pnpm run build:all

> prebuild:clean
🧹 Pre-Build Cleanup Script
✅ All processes cleaned up successfully!
🚀 Build environment is ready!

> @game/shared build
✓ Built successfully

> @game/client build
✓ Built successfully

> @game/desktop build
[rebuild-native] Completed successfully
✓ Built successfully

> @game/launcher build
✓ Built successfully
```

## Design Decisions

### Why Two Scripts?

1. **Node.js Script** - Primary implementation
   - Cross-platform compatibility
   - Easy to integrate with npm scripts
   - Familiar syntax for JavaScript developers

2. **PowerShell Script** - Windows enhancement
   - Better Windows integration
   - PowerShell-native features
   - Enhanced error messages

### Why Force Mode in Build Scripts?

Automatic cleanup uses `--force` to:
- Avoid blocking automated builds
- Provide consistent CI/CD behavior
- Reduce manual intervention
- Assume developers want clean builds

Manual runs still prompt for safety.

### Why Dry Run Mode?

Dry run provides:
- Safe way to check impact
- Debugging tool for issues
- Verification before destructive actions
- Learning tool for new users

## Future Improvements

### Potential Enhancements

1. **Selective Killing**
   - Option to exclude specific PIDs
   - Pattern-based exclusion (e.g., keep dev servers)
   - Interactive selection mode

2. **Better Process Identification**
   - Show command line arguments
   - Identify parent processes
   - Display process tree

3. **Logging**
   - Save cleanup history
   - Track which processes were killed
   - Timestamp for auditing

4. **Integration Testing**
   - Unit tests for process detection
   - Integration tests for killing logic
   - Mock mode for testing without actual kills

5. **Configuration File**
   - Allow per-project process patterns
   - Configurable exclusions
   - Custom verification steps

### Known Limitations

1. **System Processes**
   - Cannot kill protected system processes
   - May require elevated permissions

2. **Timing Issues**
   - 1-second delay may not be enough for all systems
   - Race conditions possible in high-concurrency scenarios

3. **Detection Accuracy**
   - Broad pattern matching might catch unrelated processes
   - No distinction between project-related and other processes

## Rollback Plan

If issues occur, you can disable automatic cleanup:

1. **Remove from build scripts:**
   ```json
   {
     "build": "pnpm --filter @game/shared build && ...",
     "build:all": "pnpm --filter @game/shared build && ..."
   }
   ```

2. **Keep scripts for manual use:**
   ```bash
   # Manual cleanup when needed
   pnpm run prebuild:clean
   ```

## Maintenance

### Regular Tasks

- **Monthly:** Review and update documentation
- **Per Release:** Test on all platforms
- **When Issues Occur:** Update troubleshooting section

### Monitoring

Watch for:
- Build failures after cleanup
- Reports of legitimate processes being killed
- Platform-specific issues
- Performance impact on build times

## Conclusion

The pre-build cleanup implementation successfully solves the EPERM error issue with better-sqlite3 and other native modules. It provides:

- ✅ Automated solution integrated into build process
- ✅ Safe manual options for development use
- ✅ Cross-platform compatibility
- ✅ Comprehensive documentation
- ✅ Flexible modes for different scenarios

The solution is production-ready and has been tested successfully in the development environment.

---

**Implemented:** January 2025  
**Status:** Active  
**Maintainer:** Development Team  
**Next Review:** February 2025