#!/usr/bin/env pwsh
param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    [Parameter(Mandatory=$false)]
    [string]$ReleaseNotes = ""
)

# Automated Release Script for Attrition Desktop
Write-Host "🚀 Starting automated release process for version $Version" -ForegroundColor Green

# Step 1: Build the application
Write-Host "📦 Building application..." -ForegroundColor Yellow
try {
    pnpm build
    Write-Host "✅ Build completed successfully" -ForegroundColor Green
} catch {
    Write-Error "❌ Build failed: $($_.Exception.Message)"
    exit 1
}

# Step 2: Check if release files exist
$installerPath = "packages/releases/Attrition Setup $Version.exe"
$blockmapPath = "packages/releases/Attrition Setup $Version.exe.blockmap"
$latestPath = "packages/releases/latest.yml"

if (!(Test-Path $installerPath)) {
    Write-Error "❌ Installer not found: $installerPath"
    exit 1
}

if (!(Test-Path $latestPath)) {
    Write-Error "❌ Update metadata not found: $latestPath"
    exit 1
}

Write-Host "✅ Release files verified" -ForegroundColor Green

# Step 3: Create GitHub release using GitHub CLI
Write-Host "📤 Creating GitHub release..." -ForegroundColor Yellow

$releaseBody = @"
## Attrition Desktop $Version

Automated release of Attrition Desktop.

### Installation
1. Download ``Attrition-Setup-$Version.exe``
2. Run the installer and follow the setup wizard
3. Launch the game from your desktop or start menu

### System Requirements
- Windows 10 or later
- 4GB RAM minimum
- 500MB free disk space

This release includes automatic updates for future versions.

$ReleaseNotes
"@

try {
    # Create release in the public attrition-desktop repository
    gh release create "v$Version" `
        --repo "BrianSMitchell/attrition-desktop" `
        --title "Attrition Desktop v$Version" `
        --notes $releaseBody `
        $installerPath `
        $blockmapPath `
        $latestPath
    
    Write-Host "✅ Release created successfully!" -ForegroundColor Green
    Write-Host "🔗 View release: https://github.com/BrianSMitchell/attrition-desktop/releases/tag/v$Version" -ForegroundColor Cyan
} catch {
    Write-Error "❌ Failed to create release: $($_.Exception.Message)"
    Write-Host "ℹ️  Make sure you have GitHub CLI installed and are authenticated" -ForegroundColor Yellow
    exit 1
}

Write-Host "🎉 Release process completed!" -ForegroundColor Green
