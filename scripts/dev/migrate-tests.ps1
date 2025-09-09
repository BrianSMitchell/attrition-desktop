# Test Migration PowerShell Script
# Moves all test files to centralized structure

Write-Host "🚀 Starting Test File Migration" -ForegroundColor Green

# Security Tests
Write-Host "`n📁 Moving Security Tests..." -ForegroundColor Yellow
$securityTests = @(
    "packages/desktop/src/__tests__/ipc.security.test.js",
    "packages/desktop/src/__tests__/ipc.security.priority2.test.js",
    "packages/desktop/src/__tests__/ipcInputValidation.test.js",
    "packages/desktop/src/__tests__/ipcSurfaceMinimization.test.js",
    "packages/desktop/src/__tests__/errorLoggingService.redaction.test.js",
    "packages/server/src/__tests__/httpsEnforcement.test.ts",
    "packages/server/src/__tests__/securityHeaders.test.ts",
    "packages/server/src/tests/tlsHardening.test.ts",
    "packages/client/src/services/__tests__/errorLoggingService.redaction.test.ts"
)

foreach ($test in $securityTests) {
    if (Test-Path $test) {
        $filename = Split-Path $test -Leaf
        Move-Item $test "tests/security/$filename" -Force
        Write-Host "  ✅ Moved $filename" -ForegroundColor Green
    } else {
        Write-Host "  ❌ Not found: $test" -ForegroundColor Red
    }
}

# Integration Tests
Write-Host "`n📁 Moving Integration Tests..." -ForegroundColor Yellow
$integrationTests = @(
    "packages/desktop/src/__tests__/bootstrap.test.js",
    "packages/desktop/src/__tests__/db.test.js",
    "packages/desktop/src/__tests__/db.comprehensive.test.js",
    "packages/desktop/src/__tests__/main.ipc.test.js",
    "packages/desktop/src/__tests__/main.ipc.comprehensive.test.js",
    "packages/desktop/src/__tests__/eventQueueService.test.js",
    "packages/server/src/__tests__/game-simulation.test.ts"
)

foreach ($test in $integrationTests) {
    if (Test-Path $test) {
        $filename = Split-Path $test -Leaf
        Move-Item $test "tests/integration/$filename" -Force
        Write-Host "  ✅ Moved $filename" -ForegroundColor Green
    }
}

# Routes tests (integration)
Write-Host "`n📁 Moving Route Tests (Integration)..." -ForegroundColor Yellow
$routeTests = Get-ChildItem "packages/server/src/__tests__/routes.*.test.ts" -ErrorAction SilentlyContinue
foreach ($test in $routeTests) {
    Move-Item $test.FullName "tests/integration/$($test.Name)" -Force
    Write-Host "  ✅ Moved $($test.Name)" -ForegroundColor Green
}

# API tests (integration)
$apiTests = Get-ChildItem "packages/client/src/services/__tests__/api.*.test.ts" -ErrorAction SilentlyContinue
foreach ($test in $apiTests) {
    Move-Item $test.FullName "tests/integration/$($test.Name)" -Force
    Write-Host "  ✅ Moved $($test.Name)" -ForegroundColor Green
}

Write-Host "`n✅ Migration Phase 1 Complete" -ForegroundColor Green
Write-Host "Next: Run migrate-unit-tests.ps1 for unit test migration" -ForegroundColor Cyan
