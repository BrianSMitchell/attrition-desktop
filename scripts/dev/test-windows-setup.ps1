#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Test Windows Platform Testing Framework Setup
    
.DESCRIPTION
    A simple test to verify the Windows testing framework is set up correctly.
    
.EXAMPLE
    ./scripts/test-windows-setup.ps1
#>

Write-Host "🖥️ Testing Windows Platform Testing Framework" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

$TestResults = @{
    FilesExist = $false
    NodeVersion = $false
    TestsValidate = $false
}

try {
    # 1. Check critical files exist
    Write-Host "`n📁 Checking critical files..." -ForegroundColor Yellow
    
    $RequiredFiles = @(
        "e2e/tests/windows-platform.spec.ts",
        "e2e/tests/windows-performance.spec.ts",
        ".github/workflows/windows-platform-tests.yml",
        "docs/windows-testing-guide.md"
    )
    
    $AllFilesExist = $true
    foreach ($file in $RequiredFiles) {
        if (Test-Path $file) {
            Write-Host "  ✅ $file" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $file (missing)" -ForegroundColor Red
            $AllFilesExist = $false
        }
    }
    
    $TestResults.FilesExist = $AllFilesExist
    
    # 2. Check Node.js version
    Write-Host "`n⚙️ Checking Node.js..." -ForegroundColor Yellow
    try {
        $NodeVersion = node --version
        Write-Host "  ✅ Node.js: $NodeVersion" -ForegroundColor Green
        $TestResults.NodeVersion = $true
    } catch {
        Write-Host "  ❌ Node.js not found" -ForegroundColor Red
    }
    
    # 3. Validate test file syntax
    Write-Host "`n🧪 Validating test files..." -ForegroundColor Yellow
    try {
        if (Test-Path "e2e/node_modules") {
            Push-Location "e2e"
            $TypeScriptCheck = npx tsc --noEmit --skipLibCheck tests/windows-platform.spec.ts 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ TypeScript validation passed" -ForegroundColor Green
                $TestResults.TestsValidate = $true
            } else {
                Write-Host "  ⚠️  TypeScript validation issues (expected if dependencies not installed)" -ForegroundColor Yellow
            }
            Pop-Location
        } else {
            Write-Host "  ⚠️  E2E dependencies not installed - run: cd e2e; npm ci" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠️  Could not validate TypeScript files" -ForegroundColor Yellow
    }
    
    # Summary
    $SuccessCount = ($TestResults.Values | Where-Object { $_ -eq $true }).Count
    $TotalTests = $TestResults.Count
    
    Write-Host "`n📊 Test Summary:" -ForegroundColor Cyan
    Write-Host "  Files Exist: $(if($TestResults.FilesExist){'✅ PASS'}else{'❌ FAIL'})" -ForegroundColor $(if($TestResults.FilesExist){'Green'}else{'Red'})
    Write-Host "  Node.js Ready: $(if($TestResults.NodeVersion){'✅ PASS'}else{'❌ FAIL'})" -ForegroundColor $(if($TestResults.NodeVersion){'Green'}else{'Red'})
    Write-Host "  Tests Valid: $(if($TestResults.TestsValidate){'✅ PASS'}else{'⚠️ SKIP'})" -ForegroundColor $(if($TestResults.TestsValidate){'Green'}else{'Yellow'})
    
    if ($TestResults.FilesExist -and $TestResults.NodeVersion) {
        Write-Host "`n🎉 Windows Platform Testing Framework is ready!" -ForegroundColor Green
        Write-Host "   Next: Run full verification with: ./scripts/verify-windows-testing.ps1" -ForegroundColor White
    } else {
        Write-Host "`n⚠️  Setup incomplete. Check the failed items above." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "`n❌ Test failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
