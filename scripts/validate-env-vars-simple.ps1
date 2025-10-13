# Simple Environment Variables Cleanup Validation
Write-Host "Environment Variables Cleanup - Validation" -ForegroundColor Green
Write-Host "===========================================" -ForegroundColor Green
Write-Host ""

# Target variables we replaced
$targetVars = @('NODE_ENV', 'DEBUG_RESOURCES', 'PORT', 'JWT_SECRET', 'CORS_ORIGIN', 'SUPABASE_URL', 'MONGODB_URI', 'HTTPS_PORT')

Write-Host "Checking for remaining hardcoded references to target variables:"
Write-Host "Target variables: $($targetVars -join ', ')"
Write-Host ""

$files = Get-ChildItem -Path "packages" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
         Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*" }

Write-Host "Scanning $($files.Count) files..."

$totalRemaining = 0
$remainingByVar = @{}

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if (!$content) { continue }
    
    foreach ($envVar in $targetVars) {
        $pattern = "process\.env\.$envVar(?!\])"
        $matches = [regex]::Matches($content, $pattern)
        if ($matches.Count -gt 0) {
            $totalRemaining += $matches.Count
            if (!$remainingByVar.ContainsKey($envVar)) {
                $remainingByVar[$envVar] = 0
            }
            $remainingByVar[$envVar] += $matches.Count
        }
    }
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Yellow

if ($totalRemaining -eq 0) {
    Write-Host "SUCCESS: All target environment variables standardized!" -ForegroundColor Green
    Write-Host "No hardcoded references found for target variables." -ForegroundColor Green
} else {
    Write-Host "Remaining hardcoded references: $totalRemaining" -ForegroundColor Yellow
    foreach ($envVar in $remainingByVar.Keys) {
        Write-Host "  $envVar : $($remainingByVar[$envVar]) references" -ForegroundColor White
    }
}

# Check ENV_VARS usage
Write-Host ""
Write-Host "Checking ENV_VARS usage..." -ForegroundColor Cyan
$envVarsCount = 0
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if ($content -and $content -match "ENV_VARS\.") {
        $envVarsCount++
    }
}

Write-Host "Files using ENV_VARS constants: $envVarsCount" -ForegroundColor White
Write-Host ""

if ($totalRemaining -eq 0) {
    Write-Host "Environment Variables Standardization: COMPLETED!" -ForegroundColor Green
} else {
    Write-Host "Still need to clean up $totalRemaining references" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Validation completed!" -ForegroundColor Green