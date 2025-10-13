# Find Hardcoded HTTP Status Codes Script
# Identifies all remaining hardcoded HTTP status code numbers

$projectRoot = "C:\Projects\Attrition"
$totalMatches = 0
$allMatches = @()

# Define patterns for hardcoded HTTP status codes
$statusCodePatterns = @{
    # Common HTTP status codes that should use constants
    'SuccessCodes' = @(
        '\b200\b',      # OK
        '\b201\b',      # Created
        '\b202\b',      # Accepted
        '\b204\b'       # No Content
    )
    
    'ClientErrorCodes' = @(
        '\b400\b',      # Bad Request
        '\b401\b',      # Unauthorized
        '\b403\b',      # Forbidden
        '\b404\b',      # Not Found
        '\b405\b',      # Method Not Allowed
        '\b409\b',      # Conflict
        '\b410\b',      # Gone
        '\b422\b',      # Unprocessable Entity
        '\b429\b'       # Too Many Requests
    )
    
    'ServerErrorCodes' = @(
        '\b500\b',      # Internal Server Error
        '\b501\b',      # Not Implemented
        '\b502\b',      # Bad Gateway
        '\b503\b',      # Service Unavailable
        '\b504\b'       # Gateway Timeout
    )
    
    'MethodPatterns' = @(
        '\.status\(\s*\d{3}\s*\)',      # .status(404)
        '\.sendStatus\(\s*\d{3}\s*\)',  # .sendStatus(404)
        'res\.status\(\s*\d{3}\s*\)',   # res.status(404)
        'response\.status\(\s*\d{3}\s*\)', # response.status(404)
        'statusCode:\s*\d{3}',          # statusCode: 404
        'status:\s*\d{3}',              # status: 404
        'code:\s*\d{3}',                # code: 404
        'expect\(\s*\d{3}\s*\)',        # expect(404) in tests
        'toBe\(\s*\d{3}\s*\)',          # toBe(404) in tests
        'toEqual\(\s*\d{3}\s*\)'        # toEqual(404) in tests
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

Write-Host "Scanning $($allFiles.Count) files for hardcoded HTTP status codes..." -ForegroundColor Green

foreach ($file in $allFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if (-not $content) { continue }
        
        $fileMatches = @()
        
        # Check each category of patterns
        foreach ($category in $statusCodePatterns.Keys) {
            foreach ($pattern in $statusCodePatterns[$category]) {
                $matches = [regex]::Matches($content, $pattern)
                foreach ($match in $matches) {
                    # Skip if it's already using HTTP_STATUS constant
                    $context = $content.Substring([Math]::Max(0, $match.Index - 50), 
                                                 [Math]::Min(100, $content.Length - [Math]::Max(0, $match.Index - 50)))
                    
                    if ($context -match "HTTP_STATUS\." -or 
                        $context -match "httpStatus\." -or
                        $context -match "StatusCodes\." -or
                        $context -match "const.*=.*\d{3}" -or  # Skip constant definitions
                        $match.Value -match "^\d{4}" -or       # Skip 4-digit numbers (likely not HTTP codes)
                        $context -match "//.*\d{3}" -or        # Skip comments
                        $context -match "/\*.*\d{3}.*\*/") {   # Skip block comments
                        continue
                    }
                    
                    $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
                    
                    $fileMatches += @{
                        Category = $category
                        Pattern = $pattern
                        Match = $match.Value
                        Line = $lineNumber
                        Context = $context.Trim() -replace "`n", " " -replace "`r", ""
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

Write-Host "`nHardcoded HTTP Status Code Analysis:" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Total hardcoded HTTP status codes found: $totalMatches" -ForegroundColor Yellow
Write-Host "Files with hardcoded status codes: $($allMatches.Count)" -ForegroundColor Yellow

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

# Show files with most hardcoded status codes
Write-Host "`nFiles with most hardcoded HTTP status codes:" -ForegroundColor Cyan
$allMatches | Sort-Object -Property Count -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Count) matches - $($_.File)" -ForegroundColor Gray
}

# Sample of found patterns
Write-Host "`nSample hardcoded HTTP status codes found:" -ForegroundColor Cyan
$sampleCount = 0
foreach ($fileMatch in $allMatches) {
    foreach ($match in $fileMatch.Matches) {
        if ($sampleCount -ge 15) { break }
        $shortContext = if ($match.Context.Length -gt 80) { 
            $match.Context.Substring(0, 77) + "..." 
        } else { 
            $match.Context 
        }
        Write-Host "  [$($match.Category)] Line $($match.Line): $shortContext" -ForegroundColor Gray
        $sampleCount++
    }
    if ($sampleCount -ge 15) { break }
}

Write-Host "`nNext step: Review patterns and proceed with bulk replacement" -ForegroundColor Green