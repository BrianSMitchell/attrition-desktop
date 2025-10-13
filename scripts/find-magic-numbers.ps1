#!/usr/bin/env pwsh

Write-Host "Scanning for hardcoded magic numbers and timeouts..."

# Define base directories to search
$baseDirs = @(
    "packages\server\src",
    "packages\client\src",
    "packages\shared\src"
)

# Define patterns to exclude
$excludePatterns = @(
    "node_modules",
    "dist",
    "build", 
    ".next",
    "coverage",
    "**/*.min.js",
    "**/*.bundle.js",
    "*constants*",  # Exclude existing constants files
    "*config*"      # Exclude config files for now
)

$totalMatches = 0
$matchingFiles = @()

# Magic number patterns to look for
$magicNumberPatterns = @{
    # Timeouts and delays (in milliseconds)
    'TIMEOUT' = @(
        '\b(1000|2000|3000|5000|10000|15000|30000|60000)\b',  # Common timeout values
        'setTimeout\(\s*[^,]+,\s*(\d{3,})\s*\)',              # setTimeout calls
        'setInterval\(\s*[^,]+,\s*(\d{3,})\s*\)',             # setInterval calls
        'timeout:\s*(\d{3,})',                                # timeout config
        'delay:\s*(\d{3,})',                                  # delay config
        'sleep\(\s*(\d{3,})\s*\)'                            # sleep calls
    );
    
    # Retry counts
    'RETRY' = @(
        '\bretry(?:Count|Attempts)?:\s*(\d{1,2})\b',  # retry configs
        '\bmaxRetries:\s*(\d{1,2})\b',                # max retries
        '\bfor\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*(\d{1,2})',  # retry loops
        '\bretries\s*=\s*(\d{1,2})\b'                 # retry assignments
    );
    
    # Buffer sizes and limits
    'BUFFER' = @(
        '\bbufferSize:\s*(\d{3,})\b',                 # buffer size configs
        '\blimit:\s*(\d{2,})\b',                      # limits
        '\bmaxLength:\s*(\d{2,})\b',                  # max length
        '\bpageSize:\s*(\d{2,})\b',                   # pagination
        '\bbatchSize:\s*(\d{2,})\b'                   # batch processing
    );
    
    # Port numbers
    'PORT' = @(
        '\bport:\s*(\d{4,5})\b',                      # port configs
        '\bPORT\s*=\s*(\d{4,5})\b',                   # PORT env var
        '\blisten\(\s*(\d{4,5})\s*\)'                 # server.listen calls
    );
    
    # HTTP and network related
    'NETWORK' = @(
        '\bkeepAliveTimeout:\s*(\d{3,})\b',           # keep alive timeout
        '\bheadersTimeout:\s*(\d{3,})\b',             # headers timeout
        '\brequestTimeout:\s*(\d{3,})\b',             # request timeout
        '\bmaxConnections:\s*(\d{2,})\b'              # max connections
    );
    
    # Game-specific constants
    'GAME' = @(
        '\b(100|500|1000)\s*\*\s*\d+\b',             # multipliers
        '\bcredits:\s*(\d{3,})\b',                    # credit amounts
        '\benergy:\s*(\d{2,})\b',                     # energy values
        '\bpopulation:\s*(\d{2,})\b'                  # population values
    );
    
    # Status codes (not HTTP)
    'STATUS' = @(
        '\bstatus\s*===?\s*(\d{1,3})\b',              # status comparisons
        '\breturn\s*(\d{1,3})\b'                      # return codes
    )
}

# Find all TypeScript and JavaScript files
$allFiles = @()
foreach ($dir in $baseDirs) {
    if (Test-Path $dir) {
        $files = Get-ChildItem -Path $dir -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
                 Where-Object { 
                     $exclude = $false
                     foreach ($pattern in $excludePatterns) {
                         if ($_.FullName -like "*$pattern*") {
                             $exclude = $true
                             break
                         }
                     }
                     !$exclude
                 }
        $allFiles += $files
    }
}

Write-Host "Found $($allFiles.Count) files to scan for magic numbers"

$categoryResults = @{}

foreach ($file in $allFiles) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    $fileMatches = @{}
    
    foreach ($category in $magicNumberPatterns.Keys) {
        $patterns = $magicNumberPatterns[$category]
        $categoryMatches = @()
        
        foreach ($pattern in $patterns) {
            $matches = [regex]::Matches($content, $pattern)
            foreach ($match in $matches) {
                $number = if ($match.Groups.Count -gt 1) { $match.Groups[1].Value } else { $match.Value }
                $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Length
                $context = $match.Value
                
                $categoryMatches += "Line $lineNumber : $number ($context)"
            }
        }
        
        if ($categoryMatches.Count -gt 0) {
            $fileMatches[$category] = $categoryMatches
        }
    }
    
    if ($fileMatches.Count -gt 0) {
        $fileTotal = ($fileMatches.Values | ForEach-Object { $_.Count } | Measure-Object -Sum).Sum
        $totalMatches += $fileTotal
        $matchingFiles += $file.FullName
        
        Write-Host ""
        Write-Host "Magic numbers in $($file.FullName):" -ForegroundColor Yellow
        
        foreach ($category in $fileMatches.Keys) {
            Write-Host "  [$category]:" -ForegroundColor Cyan
            foreach ($match in ($fileMatches[$category] | Select-Object -First 5)) {
                Write-Host "    $match" -ForegroundColor Red
            }
            if ($fileMatches[$category].Count -gt 5) {
                Write-Host "    ... and $($fileMatches[$category].Count - 5) more $category matches" -ForegroundColor Gray
            }
            
            # Update category totals
            if ($categoryResults.ContainsKey($category)) {
                $categoryResults[$category] += $fileMatches[$category].Count
            } else {
                $categoryResults[$category] = $fileMatches[$category].Count
            }
        }
    }
}

Write-Host ""
Write-Host "=== Magic Numbers Scan Results ===" -ForegroundColor Cyan
Write-Host "Total magic numbers found: $totalMatches"
Write-Host "Files with magic numbers: $($matchingFiles.Count)"

Write-Host ""
Write-Host "Magic numbers by category:"
foreach ($category in $categoryResults.Keys | Sort-Object) {
    Write-Host "  $category : $($categoryResults[$category]) matches" -ForegroundColor Yellow
}

if ($matchingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "Files with magic numbers (first 20):"
    $matchingFiles | Select-Object -First 20 | ForEach-Object {
        Write-Host "  $_"
    }
}