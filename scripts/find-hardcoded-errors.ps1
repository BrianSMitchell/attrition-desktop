# Find Hardcoded Error Messages Script
# Identifies all hardcoded error strings, validation messages, and user-facing text

$projectRoot = "C:\Projects\Attrition"
$totalMatches = 0
$allMatches = @()

# Define patterns for hardcoded error messages
$errorPatterns = @{
    # Direct error strings
    'QuotedErrorStrings' = @(
        "'[A-Z][a-z].*error.*'",
        '"[A-Z][a-z].*error.*"',
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
        '".*insufficient.*"'
    )
    
    # Common error response patterns
    'ErrorResponses' = @(
        "error:\s*['\"]([^'\"]{10,})['\"]",
        "message:\s*['\"]([^'\"]{10,})['\"]",
        "throw new Error\(['\"]([^'\"]+)['\"]",
        "res\.status\(\d+\)\.json\([^)]*error[^)]*['\"]([^'\"]+)['\"]",
        "return.*error.*['\"]([^'\"]{8,})['\"]"
    )
    
    # Validation error patterns
    'ValidationErrors' = @(
        "'.*is required.*'",
        '".*is required.*"',
        "'.*must be.*'",
        '".*must be.*"',
        "'.*cannot be.*'",
        '".*cannot be.*"',
        "'.*should be.*'",
        '".*should be.*"',
        "'.*missing.*'",
        '".*missing.*"'
    )
    
    # System error patterns
    'SystemErrors' = @(
        "'.*database.*'",
        '".*database.*"',
        "'.*connection.*'",
        '".*connection.*"',
        "'.*network.*'",
        '".*network.*"',
        "'.*timeout.*'",
        '".*timeout.*"',
        "'.*service.*unavailable.*'",
        '".*service.*unavailable.*"'
    )
    
    # Game-specific error patterns
    'GameErrors' = @(
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
}

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
        
        $fileMatches = @()
        
        foreach ($category in $errorPatterns.Keys) {
            foreach ($pattern in $errorPatterns[$category]) {
                $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $matches) {
                    # Skip if it's already using ERROR_MESSAGES constant
                    if ($match.Value -match "ERROR_MESSAGES\." -or 
                        $match.Value -match "errorMessages\." -or
                        $match.Value -match "ERRORS\.") {
                        continue
                    }
                    
                    $fileMatches += @{
                        Category = $category
                        Pattern = $pattern
                        Match = $match.Value
                        Line = ($content.Substring(0, $match.Index) -split "`n").Count
                    }
                }
            }
        }
        
        if ($fileMatches.Count -gt 0) {
            $allMatches += @{
                File = $file.FullName
                Matches = $fileMatches
                Count = $fileMatches.Count
            }
            $totalMatches += $fileMatches.Count
        }
        
    } catch {
        Write-Host "Error processing $($file.FullName): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nHardcoded Error Message Analysis Results:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total hardcoded error patterns found: $totalMatches" -ForegroundColor Yellow
Write-Host "Files with hardcoded errors: $($allMatches.Count)" -ForegroundColor Yellow

# Group by category
$categoryStats = @{}
foreach ($fileMatch in $allMatches) {
    foreach ($match in $fileMatch.Matches) {
        if (-not $categoryStats.ContainsKey($match.Category)) {
            $categoryStats[$match.Category] = 0
        }
        $categoryStats[$match.Category]++
    }
}

Write-Host "`nBreakdown by Category:" -ForegroundColor Cyan
foreach ($category in $categoryStats.Keys | Sort-Object) {
    Write-Host "  $category`: $($categoryStats[$category])" -ForegroundColor Gray
}

# Show top files with most hardcoded errors
Write-Host "`nFiles with most hardcoded errors:" -ForegroundColor Cyan
$allMatches | Sort-Object -Property Count -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Count) matches - $($_.File)" -ForegroundColor Gray
}

# Sample of found patterns (first 10)
Write-Host "`nSample hardcoded error patterns found:" -ForegroundColor Cyan
$sampleCount = 0
foreach ($fileMatch in $allMatches) {
    foreach ($match in $fileMatch.Matches) {
        if ($sampleCount -ge 10) { break }
        $shortMatch = if ($match.Match.Length -gt 60) { 
            $match.Match.Substring(0, 57) + "..." 
        } else { 
            $match.Match 
        }
        Write-Host "  [$($match.Category)] $shortMatch" -ForegroundColor Gray
        $sampleCount++
    }
    if ($sampleCount -ge 10) { break }
}

Write-Host "`nNext step: Review patterns and expand ERROR_MESSAGES constants" -ForegroundColor Green