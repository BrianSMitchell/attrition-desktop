# Scripts Directory

This directory contains various utility scripts organized by purpose.

## Directory Structure

### Root Scripts
Core utility scripts:
- `pre-build-cleanup.js` - Cross-platform script to kill Electron/Node processes before building
- `pre-build-cleanup.ps1` - Windows PowerShell version with enhanced features
- `setup-github-token.js` - 🔑 Interactive GitHub token setup with secure input and validation
- `setup-github-token.ps1` - PowerShell wrapper for GitHub token setup
- `post.ps1` - 🚀 Social media posting workflow with X/Twitter integration
- `setup-credentials.ps1` - 🔑 One-time setup for social media API credentials

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

# 🔑 GitHub Token Setup

## Quick Setup (Recommended)

The easiest way to set up your GitHub token:

```bash
npm run setup:github-token
```

### Alternative Methods

1. **Using Node.js directly:**
   ```bash
   node scripts/setup-github-token.js
   ```

2. **Using PowerShell:**
   ```powershell
   .\scripts\setup-github-token.ps1
   ```

### What the Setup Script Does

1. **Prompts for your token** with secure input (partially hidden)
2. **Validates the token format** (checks for GitHub token patterns)
3. **Tests the token** by making an API call to GitHub
4. **Saves the token** to your `.env` file securely
5. **Confirms everything works** with a configuration test

### Security Features

- ✅ Input is partially hidden during token entry
- ✅ Token is validated before saving
- ✅ Automatic backup of existing `.env` file
- ✅ Detailed error messages for troubleshooting
- ✅ Configuration verification after setup

### Getting Your GitHub Token

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select the scopes you need:
   - `repo` - Full access to repositories
   - `workflow` - Update GitHub Actions workflows  
   - `write:packages` - Upload packages to GitHub Package Registry
   - `read:user` - Read user profile data
4. Copy the generated token
5. Run the setup script and paste it when prompted

### Usage in Code

```javascript
// Using the helper functions (recommended)
const { getGitHubHeaders } = require('../config/github');
const headers = getGitHubHeaders();

// Direct access
const token = process.env.GITHUB_TOKEN;
```

---

# 🚀 Social Media Integration

## Quick Start

### First Time Setup
1. Run the credential setup script:
   ```powershell
   & ./setup-credentials.ps1
   ```
2. Enter your X/Twitter API credentials when prompted
3. Credentials will be securely saved to `.env` file (automatically ignored by git)

### Daily Usage
```powershell
& ./post.ps1
```

## X/Twitter API Setup

1. Visit [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Create an app if you haven't already
3. Generate your API keys and tokens:
   - API Key
   - API Key Secret  
   - Access Token
   - Access Token Secret
4. Run `setup-credentials.ps1` and enter these values

## Security Features

✅ **Credentials stored in `.env` file** - Never committed to version control  
✅ **Secure input** - Credentials are masked during entry  
✅ **Git ignored** - `.env` file is already in `.gitignore`  
✅ **Fallback prompt** - If credentials are missing, script will prompt for them  

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
