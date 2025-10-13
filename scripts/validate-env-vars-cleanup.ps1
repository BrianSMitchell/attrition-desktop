# Environment Variables Cleanup Validation Script
Write-Host "Environment Variables Cleanup - Validation Script" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green
Write-Host ""

# Define the environment variables that were targeted for replacement
$targetedEnvVars = @(
    'NODE_ENV',
    'DEBUG_RESOURCES',
    'PORT',
    'JWT_SECRET',
    'CORS_ORIGIN',
    'SUPABASE_URL',
    'MONGODB_URI',
    'HTTPS_PORT'
)

$totalFiles = 0
$filesScanned = 0
$remainingHardcoded = @{}
$filesWithIssues = @()

Write-Host "Scanning for remaining hardcoded environment variables..." -ForegroundColor Cyan
Write-Host "Target variables: $($targetedEnvVars -join ', ')"
Write-Host ""

# Get all TypeScript and JavaScript files
$files = Get-ChildItem -Path "packages" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
         Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*" }

$totalFiles = $files.Count
Write-Host "Scanning $totalFiles files..."

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if (!$content) { continue }
    
    $filesScanned++
    $fileHasIssues = $false
    $fileIssues = @()
    
    # Check for hardcoded process.env.VARIABLE patterns for our targeted variables
    foreach ($envVar in $targetedEnvVars) {
        # Look for hardcoded process.env.VARIABLE_NAME patterns (not using ENV_VARS)
        $pattern = "process\.env\.$envVar(?!\])"  # Not followed by closing bracket
        $matches = [regex]::Matches($content, $pattern)
        
        if ($matches.Count -gt 0) {
            $fileHasIssues = $true
            if (-not $remainingHardcoded.ContainsKey($envVar)) {
                $remainingHardcoded[$envVar] = 0
            }
            $remainingHardcoded[$envVar] += $matches.Count
            
            $fileIssues += "$envVar ($($matches.Count) occurrences)"
        }
    }
    
    if ($fileHasIssues) {
        $relativePath = $file.FullName.Replace($PWD, "").TrimStart('\')
        $filesWithIssues += @{
            File = $relativePath
            Issues = $fileIssues
        }
    }
    
    # Show progress every 100 files
    if ($filesScanned % 100 -eq 0) {
        Write-Host "  Processed $filesScanned/$totalFiles files..." -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== VALIDATION RESULTS ===" -ForegroundColor Yellow
Write-Host "Total files scanned: $filesScanned"
Write-Host "Target environment variables: $($targetedEnvVars.Count)"

$totalRemaining = 0
foreach ($count in $remainingHardcoded.Values) {
    $totalRemaining += $count
}

if ($totalRemaining -eq 0) {
    Write-Host "✅ SUCCESS: All targeted environment variables have been standardized!" -ForegroundColor Green
    Write-Host "No hardcoded references found for the target variables." -ForegroundColor Green
} else {
    Write-Host "⚠️  REMAINING HARDCODED REFERENCES: $totalRemaining" -ForegroundColor Yellow
    Write-Host "Files with issues: $($filesWithIssues.Count)" -ForegroundColor Yellow
    Write-Host ""
    
    Write-Host "Remaining hardcoded variables by count:" -ForegroundColor Yellow
    foreach ($envVar in $remainingHardcoded.Keys | Sort-Object { $remainingHardcoded[$_] } -Descending) {
        Write-Host "  $envVar: $($remainingHardcoded[$envVar]) references" -ForegroundColor White
    }
    
    if ($filesWithIssues.Count -le 10) {
        Write-Host ""
        Write-Host "Files requiring attention:" -ForegroundColor Yellow
        foreach ($fileInfo in $filesWithIssues) {
            Write-Host "  $($fileInfo.File)" -ForegroundColor White
            foreach ($issue in $fileInfo.Issues) {
                Write-Host "    - $issue" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host ""
        Write-Host "First 10 files requiring attention:" -ForegroundColor Yellow
        for ($i = 0; $i -lt [Math]::Min(10, $filesWithIssues.Count); $i++) {
            $fileInfo = $filesWithIssues[$i]
            Write-Host "  $($fileInfo.File)" -ForegroundColor White
            foreach ($issue in $fileInfo.Issues) {
                Write-Host "    - $issue" -ForegroundColor Gray
            }
        }
        Write-Host "  ... and $($filesWithIssues.Count - 10) more files" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== VERIFICATION ===" -ForegroundColor Cyan
Write-Host "Checking for proper ENV_VARS usage..." -ForegroundColor Cyan

# Count files using ENV_VARS correctly
$envVarsUsageCount = 0
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if ($content -and $content -match "ENV_VARS\.") {
        $envVarsUsageCount++
    }
}

Write-Host "Files using ENV_VARS constants: $envVarsUsageCount" -ForegroundColor White

Write-Host ""
if ($totalRemaining -eq 0) {
    Write-Host "🎉 Environment Variables Standardization: COMPLETED SUCCESSFULLY!" -ForegroundColor Green
} else {
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host "1. Review the remaining hardcoded references listed above" -ForegroundColor White
    Write-Host "2. Run additional replacement scripts for remaining variables" -ForegroundColor White
    Write-Host "3. Manually fix any complex cases that need special handling" -ForegroundColor White
}

Write-Host ""
Write-Host "Validation completed!" -ForegroundColor Green