# Simple validation of remaining API endpoint hardcodes

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

Write-Host "Scanning for remaining hardcoded API endpoints..." -ForegroundColor Green

foreach ($file in $allFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if (-not $content) { continue }
        
        # Look for quoted API paths
        $patterns = @(
            "'/api/[^']*'",
            '"/api/[^"]*"',
            "'/auth/[^']*'",
            '"/auth/[^"]*"',
            "'/health'",
            '"/health"',
            "'/status'",
            '"/status"',
            "'/version'",
            '"/version"'
        )
        
        $fileMatches = 0
        foreach ($pattern in $patterns) {
            $matches = [regex]::Matches($content, $pattern)
            $fileMatches += $matches.Count
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

Write-Host "`nValidation Results:" -ForegroundColor Cyan
Write-Host "Total hardcoded API endpoints found: $totalMatches" -ForegroundColor Yellow
Write-Host "Files with hardcoded endpoints: $($filesWithMatches.Count)" -ForegroundColor Yellow

if ($filesWithMatches.Count -gt 0) {
    Write-Host "`nFiles needing attention:" -ForegroundColor Cyan
    $filesWithMatches | Sort-Object -Property @{Expression={$_.Matches}; Descending=$true} | ForEach-Object {
        Write-Host "  $($_.File) ($($_.Matches) matches)" -ForegroundColor Gray
    }
} else {
    Write-Host "`nAll API endpoints have been successfully standardized! 🎉" -ForegroundColor Green
}