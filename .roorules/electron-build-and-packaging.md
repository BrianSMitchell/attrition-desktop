---
description: Comprehensive guide for building, packaging, and distributing Electron desktop applications with proper signing, auto-updates, and cross-platform support
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["electron", "build", "packaging", "distribution", "signing", "auto-update", "desktop"]
globs: ["packages/desktop/**/*", "packages/launcher/**/*", "scripts/**/*", "config/**/*"]
---

# Electron Build and Packaging Guide

## Objective

Provide comprehensive guidance for building, packaging, and distributing Electron desktop applications including proper code signing, auto-update configuration, and cross-platform build processes specific to the Attrition MMO space empire game.

## Project Structure Overview

```
attrition-launcher/          # Launcher Electron app
├── src/                     # Launcher source code
├── ui/                      # Launcher UI files
├── package.json            # Launcher dependencies
└── electron-builder.yml   # Launcher build config

packages/desktop/           # Main game Electron app
├── src/                    # Desktop app source
├── build/                  # Build artifacts
├── releases/              # Distribution packages
└── package.json          # Desktop dependencies

scripts/                   # Build automation scripts
├── Build-And-Release.ps1  # Main build script
├── Create-GitHubRelease.ps1
└── release.ps1
```

## Build Configuration

### Electron Builder Configuration

**Main Game App (`packages/desktop/electron-builder.yml`):**
```yaml
appId: com.attrition.game
productName: "Attrition"
directories:
  output: releases
  app: dist

files:
  - "dist/**/*"
  - "!dist/assets/.gitkeep"
  - "node_modules/**/*"
  - "!node_modules/**/*.{md,txt}"
  - "package.json"

extraMetadata:
  main: dist/main.js

win:
  target:
    - target: nsis
      arch: [x64]
  icon: resources/icon.ico
  requestedExecutionLevel: asInvoker
  sign: "./scripts/sign-windows.js"
  publisherName: "Attrition Game Studio"

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: "Attrition"
  uninstallDisplayName: "Attrition Space Empire Game"
  license: resources/license.txt

mac:
  target:
    - target: dmg
      arch: [x64, arm64]
  icon: resources/icon.icns
  category: public.app-category.games
  hardenedRuntime: true
  entitlements: resources/entitlements.plist

linux:
  target:
    - target: AppImage
      arch: [x64]
  icon: resources/icon.png
  category: Game

publish:
  provider: github
  owner: BrianSMitchell
  repo: attrition-game
  releaseType: release
```

**Launcher App (`attrition-launcher/electron-builder.yml`):**
```yaml
appId: com.attrition.launcher
productName: "Attrition Launcher"
directories:
  output: releases

files:
  - "src/**/*"
  - "ui/**/*"
  - "node_modules/**/*"
  - "package.json"

win:
  target: portable
  icon: ui/icon.ico
  requestedExecutionLevel: asInvoker

portable:
  artifactName: "AttritionLauncher-${version}-portable.exe"
```

### Package.json Build Scripts

**Desktop Package (`packages/desktop/package.json`):**
```json
{
  "scripts": {
    "build": "tsc && electron-builder",
    "build:win": "tsc && electron-builder --win",
    "build:mac": "tsc && electron-builder --mac", 
    "build:linux": "tsc && electron-builder --linux",
    "dist": "tsc && electron-builder --publish=never",
    "release": "tsc && electron-builder --publish=always",
    "pack": "tsc && electron-builder --dir",
    "sign": "electron-builder --win --publish=never"
  }
}
```

## Code Signing

### Windows Code Signing

**Certificate Management:**
```powershell
# Create self-signed certificate for development
$cert = New-SelfSignedCertificate -Subject "CN=Attrition Game Studio" -Type CodeSigning -KeyUsage DigitalSignature -FriendlyName "Attrition Code Signing" -CertStoreLocation Cert:\CurrentUser\My -KeyExportPolicy Exportable

# Export certificate for use
$pwd = ConvertTo-SecureString -String "your-password" -Force -AsPlainText
Export-PfxCertificate -cert $cert -FilePath "attrition-cert.pfx" -Password $pwd
```

**Signing Script (`scripts/sign-windows.js`):**
```javascript
const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'win32') {
    return;
  }

  const appPath = context.packager.getResourcesDir(appOutDir);
  const exePath = path.join(appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  
  // Sign the executable
  try {
    execSync(`signtool sign /f "attrition-cert.pfx" /p "${process.env.CERT_PASSWORD}" /tr http://timestamp.digicert.com /td sha256 /fd sha256 "${exePath}"`, {
      stdio: 'inherit'
    });
    console.log('Successfully signed Windows executable');
  } catch (error) {
    console.error('Failed to sign Windows executable:', error);
    throw error;
  }
};
```

### macOS Code Signing and Notarization

**Entitlements (`resources/entitlements.plist`):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.allow-dyld-environment-variables</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.files.user-selected.read-write</key>
  <true/>
</dict>
</plist>
```

**Environment Variables for Signing:**
```env
# macOS signing
APPLE_ID=your-apple-id@email.com
APPLE_APP_SPECIFIC_PASSWORD=app-specific-password
CSC_LINK=path/to/developer-id-certificate.p12
CSC_KEY_PASSWORD=certificate-password

# Windows signing
CSC_LINK=path/to/code-signing-certificate.p12
CSC_KEY_PASSWORD=certificate-password
```

## Build Process

### Automated Build Script (`scripts/Build-And-Release.ps1`)

```powershell
#Requires -Version 5.1
param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("patch", "minor", "major")]
    [string]$VersionBump = "patch",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipTests,
    
    [Parameter(Mandatory=$false)]
    [switch]$PublishRelease
)

# Build configuration
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

Write-Host "🚀 Starting Attrition Build Process" -ForegroundColor Green

# Step 1: Version management
Write-Host "📝 Managing version..." -ForegroundColor Blue
if ($VersionBump) {
    pnpm version $VersionBump --no-git-tag-version
    $NewVersion = (Get-Content package.json | ConvertFrom-Json).version
    Write-Host "✅ Version bumped to: $NewVersion" -ForegroundColor Green
}

# Step 2: Clean previous builds
Write-Host "🧹 Cleaning previous builds..." -ForegroundColor Blue
Remove-Item -Path "packages/desktop/releases" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "packages/desktop/dist" -Recurse -Force -ErrorAction SilentlyContinue

# Step 3: Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
pnpm install --frozen-lockfile

# Step 4: Build shared packages
Write-Host "🔧 Building shared packages..." -ForegroundColor Blue
pnpm --filter @game/shared build

# Step 5: Build client
Write-Host "🎨 Building client..." -ForegroundColor Blue
pnpm --filter @game/client build

# Step 6: Run tests (if not skipped)
if (-not $SkipTests) {
    Write-Host "🧪 Running tests..." -ForegroundColor Blue
    pnpm test
}

# Step 7: Build desktop app
Write-Host "💻 Building desktop application..." -ForegroundColor Blue
Set-Location "packages/desktop"
pnpm build:win

# Step 8: Build launcher
Write-Host "🚀 Building launcher..." -ForegroundColor Blue
Set-Location "../../attrition-launcher"
pnpm build

# Step 9: Create GitHub release (if requested)
if ($PublishRelease) {
    Write-Host "📤 Publishing release..." -ForegroundColor Blue
    Set-Location "../"
    .\scripts\Create-GitHubRelease.ps1 -Version $NewVersion
}

Write-Host "✅ Build process completed successfully!" -ForegroundColor Green
```

### Development Build Process

**Quick Development Build:**
```bash
# Build for development testing
pnpm --filter @game/shared build
pnpm --filter @game/client build
pnpm --filter @game/desktop build

# Or use the convenience script
npm run build:dev
```

**Production Build:**
```bash
# Full production build with signing
npm run build:prod

# Or use PowerShell automation
.\scripts\Build-And-Release.ps1 -VersionBump patch -PublishRelease
```

## Auto-Update Configuration

### Update Server Setup

**Update Configuration in Main Process:**
```typescript
import { autoUpdater } from 'electron-updater';

export function configureAutoUpdater() {
  // Configure update feed
  autoUpdater.setFeedURL({
    provider: 'github',
    owner: 'BrianSMitchell',
    repo: 'attrition-game',
    private: false
  });

  // Security settings
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  
  // Development vs production
  if (process.env.NODE_ENV === 'development') {
    autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml');
  }

  // Event handlers
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    // Show notification to user
  });

  autoUpdater.on('update-not-available', () => {
    console.log('Update not available');
  });

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    const percent = Math.round(progressObj.percent);
    console.log(`Download progress: ${percent}%`);
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('Update downloaded');
    // Prompt user to restart
  });
}
```

### Release Pipeline

**GitHub Actions for Automated Builds:**
```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8
        
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
      
    - name: Build shared packages
      run: pnpm --filter @game/shared build
      
    - name: Build client
      run: pnpm --filter @game/client build
      
    - name: Build desktop app
      run: pnpm --filter @game/desktop build
      env:
        GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        CSC_LINK: ${{ secrets.CSC_LINK }}
        CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
```

## Distribution

### Release Artifact Structure

```
releases/
├── Attrition-1.0.0-win.exe          # Windows installer
├── Attrition-1.0.0-mac.dmg          # macOS disk image
├── Attrition-1.0.0-linux.AppImage   # Linux AppImage
├── latest.yml                       # Update metadata
├── latest-mac.yml                   # macOS update metadata
└── latest-linux.yml                 # Linux update metadata
```

### Deployment Checklist

**Pre-Release:**
- [ ] Version number updated in package.json
- [ ] Change log updated
- [ ] All tests passing
- [ ] Code signing certificates valid
- [ ] Build scripts tested on target platforms

**Release Process:**
- [ ] Create signed builds for all platforms
- [ ] Upload artifacts to GitHub releases
- [ ] Update auto-updater metadata files
- [ ] Test update mechanism
- [ ] Announce release

**Post-Release:**
- [ ] Monitor for installation issues
- [ ] Check auto-update adoption rates
- [ ] Gather user feedback
- [ ] Plan next release cycle

## Build Optimization

### Performance Optimization

**Webpack Configuration for Renderer:**
```javascript
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
};
```

**Asset Optimization:**
- Use WebP images where supported
- Implement code splitting for large UI components
- Tree-shake unused dependencies
- Minimize bundle size with proper externals configuration

### Build Caching

```json
{
  "build": {
    "cache": {
      "enable": true,
      "path": ".electron-builder-cache"
    }
  }
}
```

## Troubleshooting

### Common Build Issues

**1. Signing Failures:**
```bash
# Verify certificate
signtool verify /pa "path/to/executable.exe"

# Check certificate validity
openssl pkcs12 -info -in certificate.p12 -noout
```

**2. macOS Notarization Issues:**
```bash
# Check notarization status
xcrun altool --notarization-history 0 -u "apple-id" -p "app-password"

# Verify notarization
spctl -a -t exec -vv path/to/app.app
```

**3. Auto-Update Problems:**
- Verify latest.yml is accessible from update server
- Check GitHub release permissions
- Ensure proper semver versioning
- Validate update metadata format

### Debug Build Process

```bash
# Enable verbose logging
DEBUG=electron-builder pnpm build:win

# Check build artifacts
ls -la packages/desktop/releases/

# Validate build configuration
electron-builder --help
```

## Security Considerations

### Build Security

- Store signing certificates securely (not in repository)
- Use environment variables for sensitive data
- Validate all dependencies before building
- Implement automated security scanning
- Use reproducible builds where possible

### Distribution Security

- Always sign releases
- Use HTTPS for update servers
- Implement checksum verification
- Monitor for unauthorized distribution
- Maintain audit trail of all releases

This comprehensive build and packaging guide ensures reliable, secure distribution of the Attrition desktop application across all supported platforms.
