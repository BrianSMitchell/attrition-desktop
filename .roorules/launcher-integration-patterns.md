---
description: Launcher integration patterns for Electron desktop applications including communication protocols, update coordination, and user experience flows
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["launcher", "electron", "desktop", "integration", "communication", "updates"]
globs: ["attrition-launcher/**/*", "packages/desktop/src/**/*.ts", "scripts/**/*"]
---

# Launcher Integration Patterns

## Objective

Define standardized patterns for launcher-to-game communication, update coordination, and user experience flows in the Attrition desktop MMO architecture. Ensures seamless integration between the launcher and main game application.

## Architecture Overview

```
User Experience Flow:
1. User launches Attrition Launcher (portable .exe)
2. Launcher checks for game updates
3. Launcher downloads/installs updates if needed
4. Launcher launches main game application
5. Game connects to server and loads user session
```

## Launcher Responsibilities

### Core Functions
- **Update Management**: Check, download, and install game updates
- **Game Launch**: Start the main Attrition game application
- **User Communication**: Provide update status and progress feedback
- **Offline Capability**: Cache essential functionality for offline scenarios

### Technical Implementation

**Launcher Structure (`attrition-launcher/`):**
```
attrition-launcher/
├── src/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Secure IPC bridge
│   └── services/
│       ├── updater.js   # Update checking and downloading
│       ├── launcher.js  # Game launching logic
│       └── storage.js   # Local settings and cache
├── ui/
│   ├── launcher.html    # Main launcher interface
│   ├── styles.css       # Launcher styling
│   └── launcher.js      # Frontend logic
└── package.json
```

## Communication Protocols

### Launcher → Game Communication

**Environment Variables (Preferred):**
```javascript
// Launcher sets environment variables for game
process.env.LAUNCHER_VERSION = '1.0.0';
process.env.LAUNCHER_PID = process.pid.toString();
process.env.GAME_LAUNCH_MODE = 'launcher'; // vs 'direct'
process.env.UPDATE_CHANNEL = 'stable'; // or 'beta'
```

**File-Based Communication (Fallback):**
```javascript
// Launcher writes launch context
const launchContext = {
  launcherVersion: '1.0.0',
  launchTime: Date.now(),
  updateChannel: 'stable',
  userSettings: {}
};

fs.writeFileSync(
  path.join(app.getPath('userData'), 'launch-context.json'),
  JSON.stringify(launchContext)
);
```

### Game → Launcher Communication

**Process Lifecycle Events:**
```javascript
// Game signals successful startup
process.send?.({ type: 'game-started', timestamp: Date.now() });

// Game signals ready for user interaction
process.send?.({ type: 'game-ready', timestamp: Date.now() });

// Game signals shutdown
process.on('beforeExit', () => {
  process.send?.({ type: 'game-shutdown', timestamp: Date.now() });
});
```

## Update Management Patterns

### Update Flow Architecture

```
Launcher Update Flow:
1. Check GitHub releases for new versions
2. Compare with currently installed version
3. Download update artifacts (if needed)
4. Verify update integrity (checksums)
5. Install update (replace game files)
6. Launch updated game application
```

### Update Service Implementation

**Update Checker (`attrition-launcher/src/services/updater.js`):**
```javascript
class UpdateService {
  constructor() {
    this.updateEndpoint = 'https://api.github.com/repos/BrianSMitchell/attrition-game/releases/latest';
    this.currentVersion = this.getCurrentVersion();
  }

  async checkForUpdates() {
    try {
      const response = await fetch(this.updateEndpoint);
      const release = await response.json();
      
      return {
        hasUpdate: this.compareVersions(release.tag_name, this.currentVersion) > 0,
        latestVersion: release.tag_name,
        downloadUrl: this.getDownloadUrl(release),
        releaseNotes: release.body
      };
    } catch (error) {
      console.error('Update check failed:', error);
      return { hasUpdate: false, error: error.message };
    }
  }

  async downloadUpdate(updateInfo) {
    // Implementation for downloading and verifying updates
    return this.downloadWithProgress(updateInfo.downloadUrl);
  }

  async installUpdate(downloadPath) {
    // Implementation for installing downloaded updates
    return this.replaceGameFiles(downloadPath);
  }

  compareVersions(a, b) {
    // Semantic version comparison logic
    const aParts = a.replace('v', '').split('.').map(Number);
    const bParts = b.replace('v', '').split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    return 0;
  }
}
```

### Update Progress Communication

**Progress Events:**
```javascript
// Launcher UI updates
window.electronAPI.onUpdateProgress((progress) => {
  updateProgressBar(progress.percent);
  updateStatusText(progress.status);
});

// Update status types
const UPDATE_STATES = {
  CHECKING: 'Checking for updates...',
  DOWNLOADING: 'Downloading update...',
  INSTALLING: 'Installing update...',
  COMPLETE: 'Update complete',
  ERROR: 'Update failed'
};
```

## Game Launch Patterns

### Launch Coordination

**Launcher Game Startup:**
```javascript
async function launchGame() {
  const gamePath = path.join(__dirname, '..', 'game', 'Attrition.exe');
  
  // Set launch environment
  const env = {
    ...process.env,
    LAUNCHER_VERSION: app.getVersion(),
    LAUNCHER_PID: process.pid.toString(),
    GAME_LAUNCH_MODE: 'launcher'
  };

  // Launch game process
  const gameProcess = spawn(gamePath, [], { 
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe', 'ipc']
  });

  // Monitor game startup
  gameProcess.on('message', handleGameMessage);
  gameProcess.on('exit', handleGameExit);
  
  // Hide launcher when game is ready
  gameProcess.on('message', (msg) => {
    if (msg.type === 'game-ready') {
      mainWindow.hide();
    }
  });

  return gameProcess;
}
```

### Game Detection in Main App

**Game Startup Detection (`packages/desktop/src/main.ts`):**
```typescript
// Detect launcher mode
const isLaunchedFromLauncher = process.env.GAME_LAUNCH_MODE === 'launcher';
const launcherPid = process.env.LAUNCHER_PID ? parseInt(process.env.LAUNCHER_PID) : null;

if (isLaunchedFromLauncher) {
  // Signal successful startup to launcher
  process.send?.({ type: 'game-started', timestamp: Date.now() });
  
  // Handle launcher process monitoring
  if (launcherPid) {
    monitorLauncherProcess(launcherPid);
  }
}

// Signal when ready for user interaction
app.whenReady().then(() => {
  createWindow();
  process.send?.({ type: 'game-ready', timestamp: Date.now() });
});
```

## User Experience Patterns

### Launcher UI Guidelines

**Visual Design:**
- Dark theme consistent with game aesthetics
- Minimal, focused interface (update status, launch button)
- Progress indicators for update operations
- Clear error messaging and recovery options

**Interaction Flow:**
```
1. Launcher opens with loading state
2. Check for updates (background operation)
3. If updates available:
   - Show update prompt with release notes
   - User confirms or defers update
   - Download/install with progress feedback
4. Launch game when ready
5. Hide launcher, monitor game process
6. Show launcher if game exits unexpectedly
```

### Error Handling and Recovery

**Common Error Scenarios:**
```javascript
const ERROR_HANDLERS = {
  UPDATE_DOWNLOAD_FAILED: () => {
    showError('Update download failed. Continue with current version?', {
      actions: ['Launch Game', 'Retry Update', 'Exit']
    });
  },
  
  GAME_LAUNCH_FAILED: () => {
    showError('Failed to launch game. Check installation.', {
      actions: ['Retry', 'Reinstall', 'Contact Support']
    });
  },
  
  GAME_CRASHED: () => {
    showError('Game closed unexpectedly. Submit crash report?', {
      actions: ['Send Report', 'Restart Game', 'Exit']
    });
  }
};
```

## Configuration Management

### Launcher Settings

**Settings Storage (`attrition-launcher/src/services/storage.js`):**
```javascript
class LauncherSettings {
  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), 'launcher-settings.json');
    this.settings = this.loadSettings();
  }

  getDefaults() {
    return {
      updateChannel: 'stable',
      autoUpdate: true,
      minimizeOnLaunch: true,
      gameInstallPath: this.getDefaultGamePath(),
      telemetry: true
    };
  }

  loadSettings() {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const saved = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
        return { ...this.getDefaults(), ...saved };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return this.getDefaults();
  }

  saveSettings() {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }
}
```

### Game Configuration Coordination

**Shared Configuration:**
```javascript
// Launcher passes configuration to game
const gameConfig = {
  serverEndpoint: settings.serverEndpoint || 'https://your-production-api.com',
  updateChannel: settings.updateChannel,
  debugMode: settings.debugMode || false,
  telemetryEnabled: settings.telemetry
};

// Write config for game to read
fs.writeFileSync(
  path.join(app.getPath('userData'), 'game-config.json'),
  JSON.stringify(gameConfig)
);
```

## Security Considerations

### Secure Communication

**Process Isolation:**
- Launcher and game run as separate processes
- Use environment variables and files for communication
- Validate all communication data
- Monitor child process integrity

**Update Security:**
- Verify update signatures before installation
- Use HTTPS for all update downloads
- Validate checksums of downloaded files
- Sandbox update installation process

### File System Access

**Restricted Access Patterns:**
```javascript
// Launcher file access validation
function validatePath(targetPath) {
  const allowedPaths = [
    app.getPath('userData'),
    path.join(app.getPath('userData'), 'game'),
    path.join(app.getPath('temp'), 'attrition-updates')
  ];
  
  const resolvedPath = path.resolve(targetPath);
  return allowedPaths.some(allowed => 
    resolvedPath.startsWith(path.resolve(allowed))
  );
}
```

## Testing Strategies

### Launcher Testing

**Unit Tests:**
- Update version comparison logic
- Configuration management
- File system operations
- Error handling scenarios

**Integration Tests:**
- Launcher → Game communication
- Update download and installation
- Settings persistence
- Process lifecycle management

**End-to-End Tests:**
```typescript
test('Complete launcher-to-game flow', async () => {
  // Start launcher
  const launcher = await startLauncher();
  
  // Verify update check
  await launcher.waitForUpdateCheck();
  
  // Launch game
  await launcher.clickLaunchButton();
  
  // Verify game starts
  const game = await waitForGameProcess();
  expect(game).toBeRunning();
  
  // Verify communication
  expect(game.environment.LAUNCHER_VERSION).toBeDefined();
  
  // Cleanup
  await game.close();
  await launcher.close();
});
```

## Deployment Considerations

### Distribution Strategy

**Launcher Distribution:**
- Portable executable (no installation required)
- Single file distribution via GitHub releases
- Auto-update capability for launcher itself
- Offline operation support

**Game Management:**
- Launcher manages game installation directory
- Supports multiple game versions (rollback capability)
- Handles corrupted installation recovery
- Manages game dependencies and prerequisites

## Performance Optimization

### Resource Management

**Memory Usage:**
- Minimize launcher memory footprint
- Release resources when game is running
- Monitor child process resource usage
- Clean up temporary files after operations

**Startup Time:**
- Lazy load non-critical components
- Cache update check results
- Optimize launcher UI rendering
- Preload game launch prerequisites

## Success Criteria

A successful launcher integration should achieve:
- ✅ Seamless update experience with progress feedback
- ✅ Reliable game launching with proper environment setup
- ✅ Robust error handling and recovery mechanisms
- ✅ Secure communication between launcher and game
- ✅ Minimal resource overhead when game is running
- ✅ Clear user feedback for all operations
- ✅ Offline functionality for essential operations

This integration pattern ensures a professional desktop application experience while maintaining security and reliability standards for the Attrition MMO space empire game.
