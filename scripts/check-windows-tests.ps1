#!/usr/bin/env pwsh
# Simple Windows Testing Framework Check

Write-Host "Windows Platform Testing Framework Check" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$allGood = $true

# Check if test files exist
Write-Host "`nChecking test files..." -ForegroundColor Yellow

$testFiles = @(
    "e2e/tests/windows-platform.spec.ts",
    "e2e/tests/windows-performance.spec.ts"
)

foreach ($file in $testFiles) {
    if (Test-Path $file) {
        Write-Host "  PASS: $file exists" -ForegroundColor Green
    } else {
        Write-Host "  FAIL: $file missing" -ForegroundColor Red
        $allGood = $false
    }
}

# Check if CI workflow exists
Write-Host "`nChecking CI workflow..." -ForegroundColor Yellow
if (Test-Path ".github/workflows/windows-platform-tests.yml") {
    Write-Host "  PASS: Windows CI workflow exists" -ForegroundColor Green
} else {
    Write-Host "  FAIL: Windows CI workflow missing" -ForegroundColor Red
    $allGood = $false
}

# Check if documentation exists
Write-Host "`nChecking documentation..." -ForegroundColor Yellow
if (Test-Path "docs/windows-testing-guide.md") {
    Write-Host "  PASS: Windows testing guide exists" -ForegroundColor Green
} else {
    Write-Host "  FAIL: Windows testing guide missing" -ForegroundColor Red
    $allGood = $false
}

# Final result
Write-Host "`n" -NoNewline
if ($allGood) {
    Write-Host "SUCCESS: Windows Platform Testing Framework is set up!" -ForegroundColor Green
    Write-Host "Ready to run Windows tests." -ForegroundColor Green
} else {
    Write-Host "INCOMPLETE: Some components are missing." -ForegroundColor Yellow
    Write-Host "Review the failures above." -ForegroundColor Yellow
}
