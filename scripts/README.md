# Scripts Directory

This directory contains various utility scripts organized by purpose.

## Directory Structure

### Root Scripts
Core utility scripts:
- `pre-build-cleanup.js` - Cross-platform script to kill Electron/Node processes before building
- `pre-build-cleanup.ps1` - Windows PowerShell version with enhanced features

### `dev/`
Development utilities and tools:
- `test-feedback-system.js` - Test the feedback and notification system

### `maintenance/`
Database and administrative scripts:
- `create-admin.js` - Create an administrative user
- `clean-database.js` - Clean and reset database
- `inspect-db.js` - Database inspection utility
- `temp-admin-script.js` - Temporary admin operations

### `build/`
Build and deployment scripts (future use):
- Reserved for CI/CD and automated build scripts

## Usage

### Development Scripts
```bash
node scripts/dev/<script-name>.js
```

### Maintenance Scripts
```bash
node scripts/maintenance/<script-name>.js
```

## Adding New Scripts

1. Place scripts in the appropriate subdirectory based on purpose
2. Include proper error handling and logging
3. Add usage documentation in script comments
4. Update this README when adding new scripts

## Environment Variables

Many scripts require environment variables to be set:
- Copy `.env.example` to `.env` in the project root or relevant package
- Configure database connections and API keys as needed
- Use `NODE_ENV` to control behavior across environments

## Best Practices

- Always test scripts in development before running in production
- Use proper error handling and exit codes
- Log operations for debugging and audit purposes
- Make scripts idempotent where possible
- Include help text or usage instructions

---

# Pre-Build Cleanup (Native Module Build Fix)

## Problem
When building Electron apps with native dependencies (like `better-sqlite3`), you may encounter:
```
Error: EPERM: operation not permitted, unlink '...\better-sqlite3\build\Release\better_sqlite3.node'
```

This happens because running Electron or Node processes have file locks on native modules.

## Solution
Use the pre-build cleanup scripts to automatically stop all Electron and Node processes before building.

### Quick Start
```bash
# Check what processes are running (safe)
pnpm run prebuild:clean:check

# Clean up processes (with confirmation)
node scripts/pre-build-cleanup.js

# Clean up and build (automatic)
pnpm run build:all
```

### Available Scripts

#### Node.js Script (Cross-Platform)
```bash
# Run with confirmation prompt
node scripts/pre-build-cleanup.js

# Force kill without confirmation
node scripts/pre-build-cleanup.js --force

# Dry run (see what would be killed)
node scripts/pre-build-cleanup.js --dry-run

# Verbose output
node scripts/pre-build-cleanup.js --verbose

# Via npm scripts
pnpm run prebuild:clean          # Force cleanup
pnpm run prebuild:clean:check    # Dry run check
```

#### PowerShell Script (Windows Only)
```powershell
.\scripts\pre-build-cleanup.ps1              # With confirmation
.\scripts\pre-build-cleanup.ps1 -Force       # Force kill
.\scripts\pre-build-cleanup.ps1 -DryRun      # Dry run
.\scripts\pre-build-cleanup.ps1 -Verbose     # Detailed output
```

### Integration
The cleanup script is now automatically run before builds:
- `pnpm run build` - Includes automatic cleanup
- `pnpm run build:all` - Includes automatic cleanup

### Features
✅ Cross-platform (Windows, macOS, Linux)  
✅ Safe with confirmation prompts  
✅ Dry run mode to preview changes  
✅ Automatically integrated into build process  
✅ Detailed logging and verification  

---

# GitHub Release Automation for Attrition

**NEW**: This directory now includes scripts to automate the GitHub release process for large installer files (>100MB).

## 🔧 Setup (One-time)

### 1. Generate GitHub Personal Access Token
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Give it a name like "Attrition Release Bot"
4. Select scopes: `repo` (Full control of private repositories)
5. Click "Generate token" and copy the token

### 2. Set Environment Variable
**Windows (PowerShell):**
```powershell
# Temporary (current session only)
$env:GITHUB_PAT = "your_token_here"

# Permanent (add to your profile)
[System.Environment]::SetEnvironmentVariable("GITHUB_PAT", "your_token_here", "User")
```

### 3. Install Python Dependencies
```powershell
python -m pip install requests
```

## 🚀 Release Automation Usage

### Complete Build and Release (Recommended)
```powershell
# Patch release (1.0.9 -> 1.0.10)
.\scripts\Build-And-Release.ps1

# Minor release (1.0.9 -> 1.1.0)  
.\scripts\Build-And-Release.ps1 -VersionType minor

# Major release (1.0.9 -> 2.0.0)
.\scripts\Build-And-Release.ps1 -VersionType major

# Dry run (see what would happen)
.\scripts\Build-And-Release.ps1 -DryRun
```

### Manual Release Creation
```powershell
.\scripts\Create-GitHubRelease.ps1 -Version "v1.0.10" -InstallerPath "packages/releases/Attrition-Setup-1.0.10.exe"
```

## 🤖 AI Agent Integration

Your AI agent can use these scripts:

```powershell
# Full automation for releases
.\scripts\Build-And-Release.ps1 -VersionType patch
```

## 📁 New Release Files

```
scripts/
├── github-release.py         # Core Python script for GitHub API
├── Create-GitHubRelease.ps1  # PowerShell wrapper
└── Build-And-Release.ps1     # Complete build and release automation
```

## 💡 Benefits

1. **No Repository Bloat**: Large files don't go into git history
2. **Cost Effective**: No LFS storage costs
3. **Simple Integration**: Easy for AI agents to use
4. **Handles up to 2GB files**: Perfect for large installers
