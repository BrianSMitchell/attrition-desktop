# Validation script to count remaining hardcoded error messages

$projectRoot = "C:\Projects\Attrition"

# Find all TypeScript, JavaScript files excluding build artifacts
$allFiles = Get-ChildItem -Path $projectRoot -Include "*.ts","*.tsx","*.js","*.jsx" -Recurse | Where-Object {
    $_.FullName -notmatch "node_modules" -and 
    $_.FullName -notmatch "\.git" -and
    $_.FullName -notmatch "dist" -and
    $_.FullName -notmatch "build" -and
    $_.FullName -notmatch "coverage" -and
    $_.FullName -notmatch "\.next" -and
    $_.FullName -notmatch "desktop\\resources"
}

$totalMatches = 0
$filesWithMatches = @()

Write-Host "Validating error message cleanup progress..." -ForegroundColor Green

foreach ($file in $allFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if (-not $content) { continue }
        
        # Look for quoted error-like strings but exclude ones already using constants
        $patterns = @(
            "'.*error.*'",
            '".*error.*"',
            "'.*failed.*'",
            '".*failed.*"',
            "'.*invalid.*'",
            '".*invalid.*"',
            "'.*required.*'",
            '".*required.*"',
            "'.*not found.*'",
            '".*not found.*"',
            "'.*unauthorized.*'",
            '".*unauthorized.*"',
            "'.*denied.*'",
            '".*denied.*"',
            "'.*insufficient.*'",
            '".*insufficient.*"',
            "'.*missing.*'",
            '".*missing.*"',
            "'.*database.*'",
            '".*database.*"',
            "'.*connection.*'",
            '".*connection.*"'
        )
        
        $fileMatches = 0
        foreach ($pattern in $patterns) {
            $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
            foreach ($match in $matches) {
                # Skip if it's already using ERROR_MESSAGES constant or is in comments/logs
                if ($match.Value -match "ERROR_MESSAGES\." -or 
                    $match.Value -match "console\." -or
                    $match.Value -match "log\(" -or
                    $match.Value.Length -lt 8) {
                    continue
                }
                $fileMatches++
            }
        }
        
        if ($fileMatches -gt 0) {
            $filesWithMatches += @{
                File = $file.FullName
                Matches = $fileMatches
            }
            $totalMatches += $fileMatches
        }
        
    } catch {
        Write-Host "Error processing $($file.FullName): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nError Message Cleanup Validation Results:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Remaining hardcoded error patterns: $totalMatches" -ForegroundColor Yellow
Write-Host "Files still containing hardcoded errors: $($filesWithMatches.Count)" -ForegroundColor Yellow

# Calculate improvement (original baseline was 262)
$originalBaseline = 262
$improvement = [math]::Round((($originalBaseline - $totalMatches) / $originalBaseline) * 100, 1)

Write-Host "`nProgress Summary:" -ForegroundColor Cyan
Write-Host "Original baseline: $originalBaseline hardcoded error messages" -ForegroundColor Gray
Write-Host "Current count: $totalMatches remaining" -ForegroundColor Gray  
Write-Host "Improvement: $improvement% reduction! 🎯" -ForegroundColor Green

if ($filesWithMatches.Count -gt 0) {
    Write-Host "`nFiles needing further attention (top 10):" -ForegroundColor Cyan
    $filesWithMatches | Sort-Object -Property Matches -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Host "  $($_.Matches) matches - $($_.File)" -ForegroundColor Gray
    }
} else {
    Write-Host "`nAll error messages have been successfully standardized! 🎉" -ForegroundColor Green
}