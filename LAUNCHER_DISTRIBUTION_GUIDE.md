# Attrition Launcher Distribution Guide

## Overview

With version 1.0.7, Attrition now uses a dedicated launcher system to manage game updates and launches. This ensures users always have the latest version and improves the overall experience.

## Distribution Files

### For Users (Primary Distribution)

1. **Attrition Launcher Executable**: `releases/win-unpacked/Attrition Launcher.exe` (180MB)
   - This is the main file users need to run Attrition
   - It automatically checks for and installs game updates
   - Creates desktop and start menu shortcuts

2. **Game Installer**: `releases/Attrition-Setup-1.0.7.exe` (83MB) 
   - This installs the core game files
   - No longer creates desktop shortcuts (launcher handles this)
   - Should be updated on your server/distribution platform

### Distribution Strategy

#### Option 1: Launcher-First Distribution (Recommended)
1. **Distribute the launcher executable directly** to users
2. When users first run the launcher, it will:
   - Check for the latest game version on GitHub releases
   - Download and install the game automatically  
   - Launch the game once installation is complete

#### Option 2: Traditional Installer + Launcher
1. Users download and run `Attrition-Setup-1.0.7.exe` first
2. Then separately download and run `Attrition Launcher.exe`
3. The launcher becomes their primary way to start the game

## How It Works

### User Experience
1. **First Launch**: 
   - User runs `Attrition Launcher.exe`
   - Launcher checks for game installation and updates
   - Downloads and installs latest game version if needed
   - Shows progress with file size, download speed, etc.
   - Automatically launches the game when ready

2. **Subsequent Launches**:
   - User runs launcher (from desktop shortcut created by launcher)
   - Launcher checks for updates in background
   - If update available, downloads and installs automatically
   - Launches game when ready

### Technical Details
- **Game Path**: Game installs to `%LOCALAPPDATA%\Programs\Attrition\`
- **Launcher Protection**: Game shows warning if launched directly (not through launcher)
- **Update Management**: Launcher handles all update checking and installation
- **Shortcuts**: Only launcher creates desktop/start menu shortcuts

## Benefits

### For Users
- Always have the latest game version
- Automatic update management
- Single click to play (launcher handles everything)
- Professional game launcher experience

### For Developers
- Guaranteed update distribution
- No more users on outdated versions
- Centralized launch point
- Better control over game distribution

## Implementation Notes

### Version 1.0.7 Changes Made
1. ✅ **Main Game**: Removed desktop/start menu shortcut creation
2. ✅ **Main Game**: Added launcher detection (warns if launched directly)
3. ✅ **Launcher**: Fixed game executable path (`C:\Users\{user}\AppData\Local\Programs\Attrition\Attrition.exe`)
4. ✅ **Launcher**: Added launcher authentication flags when launching game
5. ✅ **Launcher**: Enhanced UI with download details (file size, speed, filename)
6. ✅ **Launcher**: Creates desktop and start menu shortcuts for launcher

### File Sizes
- **Main Game Installer**: ~83MB (compressed)
- **Launcher Executable**: ~180MB (includes all launcher dependencies)
- **Total Distribution**: ~263MB (if distributing both files)

## Deployment Checklist

- [ ] Upload `Attrition-Setup-1.0.7.exe` to GitHub releases
- [ ] Update GitHub release to version 1.0.7
- [ ] Distribute `Attrition Launcher.exe` to users via your preferred method
- [ ] Update any documentation/website to reference the launcher
- [ ] Consider creating a simple installer for the launcher if needed

## Future Considerations

1. **Launcher Installer**: Could create an NSIS installer for the launcher itself for easier distribution
2. **Auto-Updates for Launcher**: The launcher could self-update in future versions
3. **Multiple Game Support**: Launcher architecture supports managing multiple games
4. **Branding**: Add custom icons and branding to both launcher and installers

---

## Quick Start for Testing

1. Run `releases/win-unpacked/Attrition Launcher.exe`
2. Wait for it to check for updates and install the game
3. Game should launch automatically when ready
4. Test that clicking "Launch Game" works correctly
5. Verify that running the game directly shows the launcher warning
