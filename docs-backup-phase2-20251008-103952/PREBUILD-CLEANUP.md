# Pre-Build Cleanup Quick Reference

## The Problem

Building Electron apps with native modules like `better-sqlite3` sometimes fails with:

```
Error: EPERM: operation not permitted, unlink '...\better_sqlite3.node'
```

**Cause:** Running Electron or Node processes have file locks on native modules.

**Solution:** Stop all Electron/Node processes before building.

**Smart Filtering:** The script automatically excludes:
- The cleanup script itself (won't kill itself)
- Package manager processes (pnpm, npm, yarn)
- Parent processes that launched the script

---

## Quick Commands

### Check for Running Processes (Safe)
```bash
pnpm run prebuild:clean:check
```

### Clean and Build (Automatic - Recommended)
```bash
pnpm run build:all
```

### Manual Cleanup
```bash
# With confirmation prompt
node scripts/pre-build-cleanup.js

# Force without prompt
pnpm run prebuild:clean
```

---

## Build Scripts (Now Include Automatic Cleanup)

All these commands now automatically clean up processes:

```bash
pnpm run build        # Build desktop app
pnpm run build:all    # Build all packages
```

---

## Advanced Usage

### Node.js Script (Cross-Platform)

```bash
# Basic usage
node scripts/pre-build-cleanup.js

# Options
node scripts/pre-build-cleanup.js --force      # No confirmation
node scripts/pre-build-cleanup.js --dry-run    # Preview only
node scripts/pre-build-cleanup.js --verbose    # Detailed info
node scripts/pre-build-cleanup.js --help       # Show help
```

### PowerShell Script (Windows Only)

```powershell
.\scripts\pre-build-cleanup.ps1              # With confirmation
.\scripts\pre-build-cleanup.ps1 -Force       # No confirmation
.\scripts\pre-build-cleanup.ps1 -DryRun      # Preview only
.\scripts\pre-build-cleanup.ps1 -Verbose     # Detailed info
```

---

## Workflow Examples

### Normal Development Build

```bash
# Just build - cleanup happens automatically
pnpm run build:all
```

### After Build Failure

```bash
# 1. Check what's running
pnpm run prebuild:clean:check

# 2. Clean up
pnpm run prebuild:clean

# 3. Try building again
pnpm run build:all
```

### Before Starting Fresh Dev Session

```bash
# Clean up any hanging processes
pnpm run prebuild:clean

# Start dev environment
pnpm run dev
```

---

## What Gets Cleaned

The scripts find and stop:
- ✓ All Electron processes
- ✓ All Node.js processes
- ✓ Dev servers
- ✓ Build processes
- ✓ Test runners

---

## Features

✅ **Cross-platform** - Works on Windows, macOS, Linux  
✅ **Safe** - Confirmation prompts by default  
✅ **Automatic** - Built into build commands  
✅ **Informative** - Shows what will be affected  
✅ **Verifiable** - Confirms cleanup success  
✅ **Flexible** - Dry run mode available  

---

## Troubleshooting

### Build Still Fails After Cleanup

Try these steps in order:

1. **Wait a moment and retry:**
   ```bash
   # Wait 5 seconds
   timeout /t 5  # Windows
   sleep 5       # Linux/Mac
   
   pnpm run build:all
   ```

2. **Manual cleanup of build artifacts:**
   ```bash
   # Remove the specific module's build folder
   Remove-Item -Path "node_modules\.pnpm\better-sqlite3@*\node_modules\better-sqlite3\build" -Recurse -Force
   
   # Then rebuild
   pnpm run build:all
   ```

3. **Full reinstall:**
   ```bash
   # Remove all node modules
   Remove-Item -Path "node_modules" -Recurse -Force
   Remove-Item -Path "pnpm-lock.yaml" -Force
   
   # Reinstall
   pnpm install
   
   # Build
   pnpm run build:all
   ```

### Processes Won't Die

If some processes refuse to stop:

1. **Check for system processes** - Don't kill system-critical Node processes
2. **Close applications manually** - Some apps need to be closed properly
3. **Restart computer** - Last resort for stubborn locks

### Script Errors

**"Cannot find processes":**
- You might not have permission to list processes
- Run terminal as Administrator (Windows) or with elevated permissions

**"Failed to kill process":**
- Process might be protected
- Try closing the application normally first
- May require Administrator/sudo privileges

---

## For CI/CD

Always use `--force` flag in automated environments:

```bash
node scripts/pre-build-cleanup.js --force
pnpm run build:all
```

Or use the built-in npm script:
```bash
pnpm run prebuild:clean  # Already uses --force
pnpm run build:all
```

---

## Documentation

Full documentation available in:
- `scripts/README.md` - Detailed script documentation
- `scripts/pre-build-cleanup.js` - Inline code comments
- `scripts/pre-build-cleanup.ps1` - PowerShell help documentation

---

**Need Help?**

Run with `--help` flag:
```bash
node scripts/pre-build-cleanup.js --help
```

Or check the scripts README:
```bash
cat scripts/README.md  # Linux/Mac
type scripts\README.md  # Windows
```