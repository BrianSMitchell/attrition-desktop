# Process Management Guide

## Overview

This guide explains the new process management utilities that help ensure clean shutdown of development processes in the Attrition project.

## Problem

When running `pnpm dev`, pressing Ctrl+C sometimes leaves Node.js and Electron processes running in the background. This requires manual cleanup using `taskkill /F /IM node.exe` on Windows.

## Solution

We've implemented several process management utilities to automatically handle cleanup:

### 1. Enhanced Process Cleanup in Applications

- **Electron Main Process**: Added proper signal handlers and child process management
- **Server Process**: Added timeout-based graceful shutdown with force termination fallback

### 2. New Utility Scripts

#### `scripts/dev/cleanup-dev-processes.js`

A cross-platform utility to list and kill Attrition-related processes:

```bash
# List all Attrition-related processes
pnpm list:processes
# or
node scripts/dev/cleanup-dev-processes.js list

# Kill all Attrition development processes
pnpm clean:processes
# or
node scripts/dev/cleanup-dev-processes.js kill
```

#### `scripts/dev/dev-with-cleanup.js`

A wrapper script that automatically cleans up processes when the development environment is stopped:

```bash
# Run development with automatic cleanup
pnpm dev:clean
# or
node scripts/dev/dev-with-cleanup.js
```

### 3. New Package.json Scripts

The following new scripts have been added to `package.json`:

- `pnpm clean:processes` - Kill all Attrition development processes
- `pnpm list:processes` - List all Attrition-related processes
- `pnpm dev:clean` - Run development environment with automatic cleanup

## Usage

### Option 1: Manual Cleanup (Quick Fix)

When you encounter hanging processes:

```bash
# Kill all development processes
pnpm clean:processes
```

### Option 2: Automatic Cleanup (Recommended)

Run the development environment with automatic cleanup:

```bash
# This will automatically clean up when you press Ctrl+C
pnpm dev:clean
```

### Option 3: List Processes First

To see what processes are running:

```bash
# List all Attrition-related processes
pnpm list:processes
```

## How It Works

### Signal Handling

The enhanced applications now properly handle:

- **SIGTERM** - Graceful shutdown with timeout
- **SIGINT** - Immediate shutdown (Ctrl+C)
- **Uncaught Exceptions** - Automatic cleanup on crashes

### Process Tree Management

- Electron main process tracks and kills child processes
- Server process has timeout-based shutdown
- Utility scripts target specific Attrition processes

### Cross-Platform Support

- **Windows**: Uses `taskkill` with specific filters
- **macOS/Linux**: Uses `pkill` and `lsof` for process management

## Troubleshooting

### If Processes Still Hang

1. Run `pnpm list:processes` to see what's running
2. Run `pnpm clean:processes` to force kill
3. If that fails, fall back to `taskkill /F /IM node.exe` (Windows) or `pkill -9 node` (Unix)

### Development Workflow

For the best experience:

```bash
# Start development
pnpm dev:clean

# When you want to stop (Ctrl+C will work cleanly)
# Processes will be automatically cleaned up
```

## Benefits

1. **No More Manual Cleanup**: Automatic process termination
2. **Cross-Platform**: Works on Windows, macOS, and Linux
3. **Graceful Shutdown**: Processes get time to clean up properly
4. **Force Fallback**: Force termination if graceful shutdown fails
5. **Easy Commands**: Simple npm scripts for common operations

## Maintenance

The utility scripts are located in `scripts/dev/` and can be modified as needed. They use process name and window title filtering to target only Attrition-related processes.
