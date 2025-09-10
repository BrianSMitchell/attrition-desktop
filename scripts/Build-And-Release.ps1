# Complete Build and Release Script for Attrition
# This script handles the entire process: build, version bump, commit, and release

param(
    [ValidateSet("patch", "minor", "major")]
    [string]$VersionType = "patch",
    
    [string]$ReleaseNotes = "",
    
    [switch]$SkipBuild,
    
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting Attrition Build and Release Process" -ForegroundColor Green

# Get current directory
$ProjectRoot = Get-Location
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition

try {
    # Step 1: Build launcher if not skipping
    if (-not $SkipBuild) {
        Write-Host "`n📦 Building launcher..." -ForegroundColor Yellow
        pnpm --filter @game/launcher build
        if ($LASTEXITCODE -ne 0) {
            throw "Launcher build failed"
        }
        
        # Copy launcher executable to correct location
        $LauncherSource = "packages\releases\win-unpacked\Attrition Launcher.exe"
        $LauncherDest = "packages\launcher\Attrition Launcher.exe"
        
        if (Test-Path $LauncherSource) {
            Write-Host "📋 Copying launcher executable..." -ForegroundColor Yellow
            Copy-Item $LauncherSource $LauncherDest -Force
        } else {
            Write-Warning "Launcher executable not found at expected location: $LauncherSource"
        }
    }

    # Step 2: Get current version and increment
    $PackageJson = Get-Content "packages\desktop\package.json" | ConvertFrom-Json
    $CurrentVersion = $PackageJson.version
    
    Write-Host "📋 Current version: $CurrentVersion" -ForegroundColor Cyan
    
    # Parse version
    $VersionParts = $CurrentVersion.Split('.')
    $Major = [int]$VersionParts[0]
    $Minor = [int]$VersionParts[1]
    $Patch = [int]$VersionParts[2]
    
    # Increment based on type
    switch ($VersionType) {
        "major" { 
            $Major++
            $Minor = 0
            $Patch = 0
        }
        "minor" { 
            $Minor++
            $Patch = 0
        }
        "patch" { 
            $Patch++
        }
    }
    
    $NewVersion = "$Major.$Minor.$Patch"
    $VersionTag = "v$NewVersion"
    
    Write-Host "📋 New version: $NewVersion" -ForegroundColor Green
    
    if ($DryRun) {
        Write-Host "🔍 DRY RUN - Would update to version $NewVersion" -ForegroundColor Yellow
        return
    }
    
    # Step 3: Update version in package.json files
    Write-Host "`n📝 Updating version numbers..." -ForegroundColor Yellow
    
    # Update desktop package.json
    $PackageJson.version = $NewVersion
    $PackageJson | ConvertTo-Json -Depth 100 | Set-Content "packages\desktop\package.json"
    
    # Update root package.json
    $RootPackageJson = Get-Content "package.json" | ConvertFrom-Json
    $RootPackageJson.version = $NewVersion
    $RootPackageJson | ConvertTo-Json -Depth 100 | Set-Content "package.json"
    
    # Step 4: Build desktop installer
    Write-Host "`n🏗️ Building desktop installer..." -ForegroundColor Yellow
    pnpm --filter @game/desktop build
    if ($LASTEXITCODE -ne 0) {
        throw "Desktop build failed"
    }
    
    $InstallerPath = "packages\releases\Attrition-Setup-$NewVersion.exe"
    if (-not (Test-Path $InstallerPath)) {
        throw "Installer not found at expected location: $InstallerPath"
    }
    
    $InstallerSize = (Get-Item $InstallerPath).Length / 1MB
    Write-Host "✅ Installer built: $([math]::Round($InstallerSize, 1)) MB" -ForegroundColor Green
    
    # Step 5: Commit changes
    Write-Host "`n📤 Committing changes..." -ForegroundColor Yellow
    git add -A
    
    $CommitMessage = @"
$VersionTag: Release with launcher inclusion

- Updated version to $NewVersion
- Built installer with launcher executable included
- Installer size: $([math]::Round($InstallerSize, 1)) MB
"@
    
    git commit -m $CommitMessage
    
    if ($LASTEXITCODE -ne 0) {
        throw "Git commit failed"
    }
    
    # Step 6: Create and push tag
    Write-Host "`n🏷️ Creating and pushing tag..." -ForegroundColor Yellow
    git tag $VersionTag
    git push origin main
    git push origin $VersionTag
    
    if ($LASTEXITCODE -ne 0) {
        throw "Git push failed"
    }
    
    # Step 7: Create GitHub release with large file upload
    Write-Host "`n🚀 Creating GitHub release..." -ForegroundColor Yellow
    
    $DefaultReleaseNotes = @"
# Attrition Desktop $VersionTag

## 📦 What's Included
- Main game executable (Attrition.exe)
- Launcher executable (Attrition Launcher.exe)
- Client web application for game interface
- Auto-updater functionality

## 🚀 Installation
1. Download Attrition-Setup-$NewVersion.exe
2. Run the installer as administrator
3. Both the game and launcher will be installed
4. Launch through the Start Menu or desktop shortcut

## 📊 Release Info
- **Installer Size**: $([math]::Round($InstallerSize, 1)) MB
- **Build Date**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss UTC')
- **Version Type**: $VersionType release

**Full Changelog**: https://github.com/BrianSMitchell/attrition-game/compare/v$CurrentVersion...$VersionTag
"@

    $FinalReleaseNotes = if ($ReleaseNotes) { $ReleaseNotes } else { $DefaultReleaseNotes }
    
    $ReleaseScript = Join-Path $ScriptDir "Create-GitHubRelease.ps1"
    & $ReleaseScript -Version $VersionTag -InstallerPath $InstallerPath -ReleaseNotes $FinalReleaseNotes
    
    if ($LASTEXITCODE -ne 0) {
        throw "GitHub release creation failed"
    }
    
    Write-Host "`n🎉 SUCCESS! Release $VersionTag completed successfully!" -ForegroundColor Green
    Write-Host "📦 Installer: $InstallerPath" -ForegroundColor Cyan
    Write-Host "🌐 Release page: https://github.com/BrianSMitchell/attrition-game/releases/tag/$VersionTag" -ForegroundColor Cyan
    
} catch {
    Write-Error "❌ Release process failed: $_"
    exit 1
}
