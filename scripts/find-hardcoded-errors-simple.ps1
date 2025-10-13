# Find Hardcoded Error Messages Script - Simplified Version
# Identifies hardcoded error strings and patterns

$projectRoot = "C:\Projects\Attrition"
$totalMatches = 0
$allMatches = @()

# Simple patterns that work well in PowerShell
$errorPatterns = @(
    # Common error words in quotes
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
    "'.*forbidden.*'",
    '".*forbidden.*"',
    "'.*denied.*'",
    '".*denied.*"',
    "'.*insufficient.*'",
    '".*insufficient.*"',
    "'.*missing.*'",
    '".*missing.*"',
    "'.*cannot.*'",
    '".*cannot.*"',
    "'.*must be.*'",
    '".*must be.*"',
    "'.*is required.*'",
    '".*is required.*"',
    "'.*database.*'",
    '".*database.*"',
    "'.*connection.*'",
    '".*connection.*"',
    "'.*timeout.*'",
    '".*timeout.*"',
    "'.*empire.*'",
    '".*empire.*"',
    "'.*base.*'",
    '".*base.*"',
    "'.*fleet.*'",
    '".*fleet.*"',
    "'.*territory.*'",
    '".*territory.*"',
    "'.*building.*'",
    '".*building.*"',
    "'.*construction.*'",
    '".*construction.*"',
    "'.*research.*'",
    '".*research.*"',
    "'.*capacity.*'",
    '".*capacity.*"',
    "'.*resources.*'",
    '".*resources.*"',
    "'.*credits.*'",
    '".*credits.*"',
    "'.*energy.*'",
    '".*energy.*"'
)

# Find all TypeScript, JavaScript files
$fileExtensions = @("*.ts", "*.tsx", "*.js", "*.jsx")
$allFiles = @()

foreach ($extension in $fileExtensions) {
    $files = Get-ChildItem -Path $projectRoot -Filter $extension -Recurse | Where-Object {
        $_.FullName -notmatch "node_modules" -and 
        $_.FullName -notmatch "\.git" -and
        $_.FullName -notmatch "dist" -and
        $_.FullName -notmatch "build" -and
        $_.FullName -notmatch "coverage" -and
        $_.FullName -notmatch "\.next" -and
        $_.FullName -notmatch "desktop\\resources"
    }
    $allFiles += $files
}

Write-Host "Scanning $($allFiles.Count) files for hardcoded error messages..." -ForegroundColor Green

foreach ($file in $allFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if (-not $content) { continue }
        
        $fileMatches = 0
        $matchDetails = @()
        
        foreach ($pattern in $errorPatterns) {
            try {
                $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $matches) {
                    # Skip if it's already using ERROR_MESSAGES constant
                    if ($match.Value -match "ERROR_MESSAGES\." -or 
                        $match.Value -match "errorMessages\." -or
                        $match.Value -match "ERRORS\." -or
                        $match.Value -match "console\." -or
                        $match.Value.Length -lt 8) {
                        continue
                    }
                    
                    $matchDetails += $match.Value
                    $fileMatches++
                }
            } catch {
                # Skip problematic patterns
                continue
            }
        }
        
        if ($fileMatches -gt 0) {
            $allMatches += @{
                File = $file.FullName
                Count = $fileMatches
                Samples = ($matchDetails | Select-Object -First 3)
            }
            $totalMatches += $fileMatches
        }
        
    } catch {
        Write-Host "Error processing $($file.FullName): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nHardcoded Error Message Analysis Results:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total hardcoded error patterns found: $totalMatches" -ForegroundColor Yellow
Write-Host "Files with hardcoded errors: $($allMatches.Count)" -ForegroundColor Yellow

# Show files with most hardcoded errors
Write-Host "`nTop 15 files with most hardcoded errors:" -ForegroundColor Cyan
$allMatches | Sort-Object -Property Count -Descending | Select-Object -First 15 | ForEach-Object {
    Write-Host "  $($_.Count) matches - $($_.File)" -ForegroundColor Gray
    foreach ($sample in $_.Samples) {
        $shortSample = if ($sample.Length -gt 50) { 
            $sample.Substring(0, 47) + "..." 
        } else { 
            $sample 
        }
        Write-Host "    Sample: $shortSample" -ForegroundColor DarkGray
    }
    Write-Host ""
}

Write-Host "Ready to proceed with expanding ERROR_MESSAGES constants!" -ForegroundColor Green