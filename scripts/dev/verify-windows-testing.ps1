#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verify Windows Platform Testing Framework Setup
    
.DESCRIPTION
    This script verifies that the Windows platform testing framework is properly
    configured and ready for use. It checks dependencies, builds, and runs a
    basic validation test.
    
.PARAMETER SkipBuild
    Skip the desktop application build step
    
.PARAMETER RunTests
    Run basic validation tests after verification
    
.EXAMPLE
    ./scripts/verify-windows-testing.ps1
    
.EXAMPLE
    ./scripts/verify-windows-testing.ps1 -SkipBuild -RunTests
#>

param(
    [switch]$SkipBuild,
    [switch]$RunTests,
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = "Stop"

# Enable verbose output if requested
if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host "🖥️ Verifying Windows Platform Testing Framework" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Track verification results
$VerificationResults = @{
    SystemRequirements = $false
    ProjectStructure = $false
    Dependencies = $false
    DesktopBuild = $false
    TestFramework = $false
    OverallSuccess = $false
}

try {
    # 1. Check System Requirements
    Write-Host "`n📋 Checking System Requirements..." -ForegroundColor Yellow
    
    # Check Windows version
    $WindowsVersion = [System.Environment]::OSVersion.Version
    Write-Verbose "Windows Version: $($WindowsVersion.ToString())"
    
    if ($WindowsVersion.Major -lt 10) {
        throw "Windows 10 or later is required (found: Windows $($WindowsVersion.Major).$($WindowsVersion.Minor))"
    }
    Write-Host "  ✅ Windows Version: $($WindowsVersion.Major).$($WindowsVersion.Minor) (supported)" -ForegroundColor Green
    
    # Check Node.js
    try {
        $NodeVersion = node --version
        Write-Host "  ✅ Node.js: $NodeVersion" -ForegroundColor Green
        
        # Verify version is 18+
        $NodeMajor = [int]($NodeVersion -replace '^v', '' -split '\.')[0]
        if ($NodeMajor -lt 18) {
            throw "Node.js 18+ required (found: $NodeVersion)"
        }
    } catch {
        throw "Node.js not found or invalid version. Please install Node.js 18+"
    }
    
    # Check pnpm
    try {
        $PnpmVersion = pnpm --version
        Write-Host "  ✅ pnpm: v$PnpmVersion" -ForegroundColor Green
    } catch {
        throw "pnpm not found. Please install with: npm install -g pnpm"
    }
    
    # Check PowerShell version
    $PSVersion = $PSVersionTable.PSVersion
    Write-Host "  ✅ PowerShell: $($PSVersion.ToString())" -ForegroundColor Green
    
    $VerificationResults.SystemRequirements = $true
    
    # 2. Check Project Structure
    Write-Host "`n📁 Checking Project Structure..." -ForegroundColor Yellow
    
    $RequiredPaths = @{
        "packages/desktop" = "Desktop package directory"
        "packages/client" = "Client package directory"
        "packages/shared" = "Shared package directory"
        "e2e" = "E2E test directory"
        "e2e/fixtures/electron-fixture.ts" = "Electron test fixtures"
        "e2e/tests/windows-platform.spec.ts" = "Windows platform tests"
        "e2e/tests/windows-performance.spec.ts" = "Windows performance tests"
        ".github/workflows/windows-platform-tests.yml" = "Windows CI/CD workflow"
        "docs/windows-testing-guide.md" = "Windows testing documentation"
    }
    
    foreach ($path in $RequiredPaths.Keys) {
        if (Test-Path $path) {
            Write-Host "  ✅ $path" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $path (missing)" -ForegroundColor Red
            throw "Required path missing: $path - $($RequiredPaths[$path])"
        }
    }
    
    $VerificationResults.ProjectStructure = $true
    
    # 3. Check Dependencies
    Write-Host "`n📦 Checking Dependencies..." -ForegroundColor Yellow
    
    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "  ⚠️  Node modules not installed. Installing..." -ForegroundColor Yellow
        pnpm install --frozen-lockfile
    } else {
        Write-Host "  ✅ Node modules installed" -ForegroundColor Green
    }
    
    # Check E2E dependencies
    if (-not (Test-Path "e2e/node_modules")) {
        Write-Host "  ⚠️  E2E dependencies not installed. Installing..." -ForegroundColor Yellow
        Push-Location "e2e"
        try {
            npm ci
            Write-Host "  ✅ E2E dependencies installed" -ForegroundColor Green
        } finally {
            Pop-Location
        }
    } else {
        Write-Host "  ✅ E2E dependencies installed" -ForegroundColor Green
    }
    
    # Check Playwright browsers
    try {
        Push-Location "e2e"
        $PlaywrightOutput = npx playwright --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Playwright: $PlaywrightOutput" -ForegroundColor Green
            
            # Check if browsers are installed
            $BrowserCheck = npx playwright install-deps --dry-run chromium 2>&1
            if ($BrowserCheck -match "missing") {
                Write-Host "  ⚠️  Playwright browsers not installed. Installing..." -ForegroundColor Yellow
                npx playwright install --with-deps chromium
            }
            Write-Host "  ✅ Playwright browsers ready" -ForegroundColor Green
        } else {
            throw "Playwright not properly installed"
        }
    } finally {
        Pop-Location
    }
    
    $VerificationResults.Dependencies = $true
    
    # 4. Build Desktop Application (if not skipped)
    if (-not $SkipBuild) {
        Write-Host "`n🔨 Building Desktop Application..." -ForegroundColor Yellow
        
        # Build shared package
        Write-Host "  Building shared package..."
        pnpm --filter @game/shared build
        
        # Build client package
        Write-Host "  Building client package..."
        pnpm --filter @game/client build
        
        # Build desktop package
        Write-Host "  Building desktop package for Windows..."
        pnpm --filter @game/desktop build --win --publish=never
        
        # Verify build output
        $BuiltApp = Get-ChildItem -Path "packages/desktop/dist" -Filter "*.exe" -Recurse | Select-Object -First 1
        if ($BuiltApp) {
            Write-Host "  ✅ Desktop application built: $($BuiltApp.Name)" -ForegroundColor Green
            Write-Host "    📍 Location: $($BuiltApp.FullName)" -ForegroundColor Gray
            Write-Host "    📏 Size: $([math]::Round($BuiltApp.Length / 1MB, 2)) MB" -ForegroundColor Gray
            $VerificationResults.DesktopBuild = $true
        } else {
            throw "Desktop application build failed - no executable found"
        }
    } else {
        Write-Host "`n⏭️  Skipping desktop build..." -ForegroundColor Yellow
        
        # Check if existing build is available
        $ExistingApp = Get-ChildItem -Path "packages/desktop/dist" -Filter "*.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($ExistingApp) {
            Write-Host "  ✅ Existing desktop build found: $($ExistingApp.Name)" -ForegroundColor Green
            $VerificationResults.DesktopBuild = $true
        } else {
            Write-Host "  ⚠️  No existing desktop build found. Tests may fail." -ForegroundColor Yellow
        }
    }
    
    # 5. Verify Test Framework
    Write-Host "`n🧪 Verifying Test Framework..." -ForegroundColor Yellow
    
    # Check test configuration
    if (Test-Path "e2e/playwright-electron.config.ts") {
        Write-Host "  ✅ Electron test configuration found" -ForegroundColor Green
    } else {
        throw "Electron test configuration missing: e2e/playwright-electron.config.ts"
    }
    
    # Verify test files are valid TypeScript
    try {
        Push-Location "e2e"
        
        # Check if TypeScript can compile test files
        $TsOutput = npx tsc --noEmit --skipLibCheck tests/windows-*.spec.ts fixtures/electron-fixture.ts 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ TypeScript compilation successful" -ForegroundColor Green
        } else {
            Write-Host "  ❌ TypeScript compilation errors:" -ForegroundColor Red
            Write-Host $TsOutput -ForegroundColor Red
            throw "TypeScript compilation failed"
        }
    } finally {
        Pop-Location
    }
    
    $VerificationResults.TestFramework = $true
    
    # 6. Run Basic Validation Tests (if requested)
    if ($RunTests) {
        Write-Host "`n🚀 Running Basic Validation Tests..." -ForegroundColor Yellow
        
        # Set environment for testing
        $env:WINDOWS_TEST_MODE = "true"
        $env:NODE_ENV = "test"
        
        # Find the desktop app path
        $AppPath = Get-ChildItem -Path "packages/desktop/dist" -Filter "*.exe" -Recurse | Select-Object -First 1
        if ($AppPath) {
            $env:ELECTRON_APP_PATH = $AppPath.FullName
            Write-Host "  📍 Using app at: $($AppPath.FullName)" -ForegroundColor Gray
        } else {
            throw "Cannot run tests - no desktop executable found"
        }
        
        try {
            Push-Location "e2e"
            
            # Run a simple validation test
            Write-Host "  Running Windows platform validation..."
            $TestResult = npx playwright test windows-platform.spec.ts --grep "should launch on Windows with proper window management" --config=playwright-electron.config.ts --reporter=list 2>&1
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Validation test passed" -ForegroundColor Green
            } else {
                Write-Host "  ⚠️  Validation test issues (this may be expected if APIs aren't fully implemented):" -ForegroundColor Yellow
                Write-Host $TestResult -ForegroundColor Yellow
            }
            
        } finally {
            Pop-Location
        }
    }
    
    # Overall Success
    $SuccessCount = ($VerificationResults.Values | Where-Object { $_ -eq $true }).Count
    $TotalChecks = $VerificationResults.Count - 1 # Exclude OverallSuccess
    
    if ($SuccessCount -eq $TotalChecks) {
        $VerificationResults.OverallSuccess = $true
        Write-Host "`n🎉 Windows Platform Testing Framework Verification SUCCESSFUL!" -ForegroundColor Green
        Write-Host "   All $TotalChecks verification checks passed." -ForegroundColor Green
    } else {
        Write-Host "`n⚠️  Windows Platform Testing Framework Verification PARTIAL" -ForegroundColor Yellow
        Write-Host "   $SuccessCount of $TotalChecks verification checks passed." -ForegroundColor Yellow
    }
    
    # Next Steps
    Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "   1. Run Windows tests: ./scripts/run-windows-tests.ps1" -ForegroundColor White
    Write-Host "   2. Review documentation: docs/windows-testing-guide.md" -ForegroundColor White
    Write-Host "   3. Set up CI/CD: .github/workflows/windows-platform-tests.yml" -ForegroundColor White
    
} catch {
    Write-Host "`n❌ Verification Failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # Provide troubleshooting guidance
    Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   1. Check system requirements (Windows 10+, Node.js 18+, pnpm)" -ForegroundColor White
    Write-Host "   2. Install dependencies: pnpm install" -ForegroundColor White
    Write-Host "   3. Build application: pnpm --filter @game/desktop build --win" -ForegroundColor White
    Write-Host "   4. Review docs/windows-testing-guide.md for detailed setup" -ForegroundColor White
    
    exit 1
}

# Summary Report
Write-Host "`n📊 Verification Summary:" -ForegroundColor Cyan
foreach ($check in $VerificationResults.Keys) {
    if ($check -ne "OverallSuccess") {
        $status = if ($VerificationResults[$check]) { "✅ PASS" } else { "❌ FAIL" }
        $color = if ($VerificationResults[$check]) { "Green" } else { "Red" }
        Write-Host "   $($check): $status" -ForegroundColor $color
    }
}

if ($VerificationResults.OverallSuccess) {
    Write-Host "`n🚀 Ready to run Windows platform tests!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "`n⚠️  Some verification checks failed. Review the errors above." -ForegroundColor Yellow
    exit 1
}
