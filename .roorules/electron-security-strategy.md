---
description: Electron security strategy for desktop applications including CSP, secure communication, local file handling, and production security best practices
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["electron", "security", "desktop", "csp", "production", "local-files"]
globs: ["packages/desktop/src/**/*.ts", "packages/client/src/**/*.ts", "packages/desktop/.env"]
---

# Electron Security Strategy (Desktop Applications)

## Objective

Provide comprehensive security patterns for Electron desktop applications, including Content Security Policy (CSP), secure server communication, local file handling, and production security best practices. Replaces browser-focused CORS strategies with desktop-appropriate security measures.

Addresses security concerns specific to desktop applications:
- Local file system access
- Inter-process communication (IPC) security
- Remote content loading restrictions
- Node.js integration security
- Auto-update security

## Core Security Principles

### 1. Principle of Least Privilege
- Disable Node.js integration in renderer processes by default
- Use context isolation for all renderer processes
- Limit IPC communication to specific, validated channels
- Restrict file system access to necessary directories only

### 2. Content Security Policy (CSP)
- Implement strict CSP for all renderer content
- Disable unsafe inline scripts and styles
- Restrict remote content loading
- Use nonce-based script loading when necessary

### 3. Secure Communication
- Always use HTTPS for server communication
- Validate all server responses
- Implement certificate pinning for production
- Use secure authentication tokens with proper expiration

## Electron Security Configuration

### Main Process Security (`packages/desktop/src/main.ts`)

```typescript
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';

const createSecureWindow = (): BrowserWindow => {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      // Core security settings
      nodeIntegration: false,           // Disable Node.js in renderer
      contextIsolation: true,           // Isolate context
      enableRemoteModule: false,        // Disable remote module
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
      
      // Preload script for secure IPC
      preload: join(__dirname, 'preload.js'),
      
      // Sandbox renderer process
      sandbox: true,
      
      // Additional security
      webSecurity: true,
      additionalArguments: ['--no-sandbox'] // Only if necessary for specific features
    },
    
    // Prevent new window creation
    show: false,
  });

  // Security event handlers
  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Handle external links securely
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return win;
};
```

### Content Security Policy Implementation

**Strict CSP for Production:**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'nonce-{random-nonce}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://your-api-domain.com wss://your-api-domain.com;
  font-src 'self';
  object-src 'none';
  media-src 'self';
  child-src 'none';
  worker-src 'none';
  frame-src 'none';
  form-action 'self';
  upgrade-insecure-requests;
">
```

**Development CSP (More Permissive):**
```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https: http://localhost:*;
  connect-src 'self' https: http://localhost:* ws://localhost:* wss://localhost:*;
  font-src 'self';
  object-src 'none';
">
```

## Secure IPC Communication

### Preload Script (`packages/desktop/src/preload.ts`)

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Expose only specific, validated APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // App lifecycle
  closeApp: () => ipcRenderer.invoke('app:close'),
  minimizeApp: () => ipcRenderer.invoke('app:minimize'),
  
  // File operations (restricted)
  readGameData: () => ipcRenderer.invoke('file:read-game-data'),
  writeGameData: (data: string) => ipcRenderer.invoke('file:write-game-data', data),
  
  // Server communication
  getServerConfig: () => ipcRenderer.invoke('config:server'),
  
  // Update system
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  
  // Event listeners (remove listeners on cleanup)
  onUpdateAvailable: (callback: Function) => {
    const subscription = (_: any, ...args: any[]) => callback(...args);
    ipcRenderer.on('updater:available', subscription);
    return () => ipcRenderer.removeListener('updater:available', subscription);
  }
});

// Type definitions for renderer
declare global {
  interface Window {
    electronAPI: {
      closeApp: () => Promise<void>;
      minimizeApp: () => Promise<void>;
      readGameData: () => Promise<string>;
      writeGameData: (data: string) => Promise<void>;
      getServerConfig: () => Promise<{ apiUrl: string; wsUrl: string }>;
      checkForUpdates: () => Promise<boolean>;
      onUpdateAvailable: (callback: Function) => () => void;
    };
  }
}
```

### IPC Handlers (Main Process)

```typescript
import { ipcMain, dialog } from 'electron';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

// Validate and handle IPC requests
ipcMain.handle('file:read-game-data', async () => {
  try {
    const userDataPath = app.getPath('userData');
    const filePath = join(userDataPath, 'game-data.json');
    const data = await readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to read game data:', error);
    return null;
  }
});

ipcMain.handle('file:write-game-data', async (_, data: string) => {
  try {
    // Validate data before writing
    JSON.parse(data); // Ensure valid JSON
    
    const userDataPath = app.getPath('userData');
    const filePath = join(userDataPath, 'game-data.json');
    await writeFile(filePath, data, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to write game data:', error);
    return false;
  }
});

ipcMain.handle('config:server', () => {
  return {
    apiUrl: process.env.API_URL || 'https://your-production-api.com',
    wsUrl: process.env.WS_URL || 'wss://your-production-api.com'
  };
});
```

## Server Communication Security

### Secure HTTP Client (`packages/client/src/services/electronApiClient.ts`)

```typescript
import axios, { AxiosInstance } from 'axios';

export class ElectronApiClient {
  private api: AxiosInstance;
  private serverConfig: { apiUrl: string; wsUrl: string } | null = null;

  constructor() {
    this.initializeClient();
  }

  private async initializeClient() {
    // Get server config from main process
    this.serverConfig = await window.electronAPI.getServerConfig();
    
    this.api = axios.create({
      baseURL: this.serverConfig.apiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `AttritionGame/${process.env.APP_VERSION}`,
      },
      // Security headers
      validateStatus: (status) => status < 500, // Don't throw on client errors
    });

    // Request interceptor for auth
    this.api.interceptors.request.use((config) => {
      const token = this.getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.handleAuthError();
        }
        return Promise.reject(error);
      }
    );
  }

  private getStoredToken(): string | null {
    // Retrieve token from secure storage
    try {
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.state?.token || null;
      }
    } catch (error) {
      console.error('Error parsing auth token:', error);
    }
    return null;
  }

  private handleAuthError() {
    // Clear invalid tokens and redirect to login
    localStorage.removeItem('auth-storage');
    // Trigger re-authentication flow
  }
}
```

## File System Security

### Secure File Handling

```typescript
import { app } from 'electron';
import { join, resolve, relative } from 'path';

class SecureFileManager {
  private readonly allowedPaths: string[];

  constructor() {
    // Define allowed base paths
    this.allowedPaths = [
      app.getPath('userData'),
      app.getPath('documents'),
      app.getPath('downloads'),
    ];
  }

  // Validate file paths to prevent directory traversal
  private validatePath(filePath: string): boolean {
    const resolvedPath = resolve(filePath);
    
    return this.allowedPaths.some(allowedPath => {
      const relativePath = relative(allowedPath, resolvedPath);
      return !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    });
  }

  async readSecureFile(filename: string): Promise<string | null> {
    const fullPath = join(app.getPath('userData'), filename);
    
    if (!this.validatePath(fullPath)) {
      throw new Error('File path not allowed');
    }

    try {
      return await readFile(fullPath, 'utf-8');
    } catch (error) {
      console.error('Secure file read failed:', error);
      return null;
    }
  }
}
```

## Auto-Update Security

### Secure Update Configuration

```typescript
import { autoUpdater } from 'electron-updater';
import { join } from 'path';

// Configure secure auto-updater
export const configureAutoUpdater = () => {
  // Set update server URL
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'your-github-org',
    repo: 'attrition-game',
    private: false, // Set to true if private repo
  });

  // Security settings
  autoUpdater.autoDownload = false; // Require user confirmation
  autoUpdater.autoInstallOnAppQuit = false;

  // Verify signatures (important for security)
  if (process.platform === 'win32') {
    // Windows code signing verification
    autoUpdater.verifyUpdateCodeSignature = true;
  }

  // Update event handlers
  autoUpdater.on('update-available', (info) => {
    // Show update notification to user
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `Version ${info.version} is available. Download now?`,
      buttons: ['Download', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-downloaded', () => {
    // Prompt user to restart and install
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. Restart to install?',
      buttons: ['Restart Now', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
};
```

## Production Security Checklist

### Build-Time Security

- [ ] Code signing certificates configured for all platforms
- [ ] Notarization enabled for macOS builds
- [ ] Windows SmartScreen reputation established
- [ ] Source maps excluded from production builds
- [ ] Environment variables properly configured
- [ ] Dependencies audited (`npm audit`, `yarn audit`)

### Runtime Security

- [ ] CSP headers properly configured
- [ ] Node.js integration disabled in renderer
- [ ] Context isolation enabled
- [ ] Sandbox mode enabled where possible
- [ ] IPC channels use validation and type checking
- [ ] File system access restricted to necessary paths
- [ ] External link handling secured
- [ ] Auto-updater configured with signature verification

### Network Security

- [ ] HTTPS enforced for all server communication
- [ ] Certificate pinning implemented for production
- [ ] WebSocket connections use WSS protocol
- [ ] API endpoints validate all inputs
- [ ] Authentication tokens have proper expiration
- [ ] Rate limiting implemented on server

## Development vs Production

### Development Security Settings

```typescript
const isDevelopment = process.env.NODE_ENV === 'development';

const webPreferences = {
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: !isDevelopment, // Disable sandbox in dev for debugging
  devTools: isDevelopment,
  webSecurity: !isDevelopment, // Relaxed in dev for localhost
};
```

### Environment Configuration

```env
# .env.development
NODE_ENV=development
API_URL=http://localhost:3001
WS_URL=ws://localhost:3001
CSP_MODE=development

# .env.production  
NODE_ENV=production
API_URL=https://your-production-api.com
WS_URL=wss://your-production-api.com
CSP_MODE=strict
CODE_SIGNING_ENABLED=true
```

## Security Testing

### Automated Security Tests

```typescript
// Security test examples
describe('Electron Security', () => {
  test('should block external window creation', async () => {
    // Test that new windows are blocked
  });

  test('should validate IPC input', async () => {
    // Test IPC input validation
  });

  test('should enforce CSP', async () => {
    // Test Content Security Policy enforcement
  });

  test('should handle file path traversal attempts', async () => {
    // Test path validation
  });
});
```

## Common Security Pitfalls to Avoid

1. **Node.js Integration**: Never enable in renderer processes unless absolutely necessary
2. **Remote Content**: Avoid loading remote content without proper CSP
3. **IPC Validation**: Always validate IPC messages from renderer processes
4. **File Paths**: Use path validation to prevent directory traversal
5. **External Links**: Handle external navigation securely
6. **Update Security**: Always verify update signatures
7. **Development Settings**: Don't use development security settings in production

## Migration from Browser CORS

**What Changed from Browser Development:**
- CORS is not applicable to Electron (no same-origin policy)
- Focus shifts to IPC security and file system access
- CSP becomes primary content security mechanism
- Node.js integration security becomes critical
- Auto-update security is new concern

**Key Differences:**
- No need for CORS headers or origin validation
- Direct file system access requires careful security
- Inter-process communication needs validation
- Code signing and update integrity become important

This security strategy ensures your Electron desktop application maintains robust security while providing the necessary functionality for your MMO space empire game.
