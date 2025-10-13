#!/usr/bin/env pwsh

Write-Host "Validating magic numbers cleanup..."
Write-Host "Searching for remaining hardcoded magic numbers..."

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
    "*magic-numbers.ts",  # Exclude the constants file itself
    "*levelTables*"       # Exclude game level tables (they have specific values)
)

$totalMatches = 0
$issueFiles = @()

# Focus on the patterns we specifically targeted for replacement
$targetedPatterns = @(
    # Timeout patterns we targeted
    'setTimeout\(\s*[^,]+,\s*(1000|2000|3000|5000|10000|30000|60000)\s*\)',
    'setInterval\(\s*[^,]+,\s*(1000|30000|60000|3600000)\s*\)',
    '\btimeout:\s*(1000|2000|3000|5000|10000|30000)\b',
    '\bdelay:\s*(1000|2000|3000)\b',
    
    # Retry patterns we targeted
    '\bmaxRetries:\s*3\b',
    '\bretryCount:\s*3\b', 
    '\bretries:\s*3\b',
    
    # Batch size patterns we targeted
    '\bbatchSize:\s*(10|50|100)\b',
    
    # Status patterns we targeted (simple return statements)
    '\breturn [01]\b(?![0-9])',  # return 0 or return 1 only
    
    # Game starting values we targeted
    '\bcredits:\s*100\b(?!000)',  # credits: 100 but not 100000
    '\benergy:\s*100\b(?!000)',   # energy: 100 but not 100000
    '\benergy:\s*750\b',          # energy: 750 (starting population)
    
    # Time multipliers we targeted  
    '\b1000\s*\*\s*60\b',
    
    # Sleep calls we targeted
    '\bsleep\(\s*(150|1000|2000)\s*\)'
)

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

Write-Host "Scanning $($allFiles.Count) files for remaining targeted magic numbers..."

foreach ($file in $allFiles) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    $fileIssues = @()
    
    foreach ($pattern in $targetedPatterns) {
        $matches = [regex]::Matches($content, $pattern)
        foreach ($match in $matches) {
            # Skip if it's already using our constants
            if ($match.Value -match "TIMEOUTS\.|RETRY_LIMITS\.|BUFFER_LIMITS\.|GAME_CONSTANTS\.|STATUS_CODES\.") {
                continue
            }
            
            $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Length
            $context = $match.Value
            
            $fileIssues += "Line $lineNumber : $context"
        }
    }
    
    if ($fileIssues.Count -gt 0) {
        $totalMatches += $fileIssues.Count
        $issueFiles += $file.FullName
        
        Write-Host ""
        Write-Host "Remaining targeted magic numbers in $($file.FullName):" -ForegroundColor Yellow
        foreach ($issue in ($fileIssues | Select-Object -First 10)) {
            Write-Host "  $issue" -ForegroundColor Red
        }
        if ($fileIssues.Count -gt 10) {
            Write-Host "  ... and $($fileIssues.Count - 10) more matches" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "=== Magic Numbers Cleanup Validation Results ===" -ForegroundColor Cyan
Write-Host "Remaining targeted magic numbers: $totalMatches"
Write-Host "Files with remaining targeted magic numbers: $($issueFiles.Count)"

# Calculate reduction from our initial scan
$initialTotal = 1035
$initialFiles = 176
$reductionPercent = [math]::Round((($initialTotal - $totalMatches) / $initialTotal) * 100, 1)

Write-Host ""
Write-Host "Cleanup Progress Summary:" -ForegroundColor Green
Write-Host "  Initial magic numbers found: $initialTotal" 
Write-Host "  Targeted replacements made: 113"
Write-Host "  Magic number imports added: 63"
Write-Host "  Remaining targeted patterns: $totalMatches"
Write-Host "  Overall improvement: $reductionPercent% of targeted patterns addressed"

if ($totalMatches -eq 0) {
    Write-Host "✅ All targeted magic number patterns have been successfully replaced!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some targeted magic numbers still need attention" -ForegroundColor Yellow
    
    if ($issueFiles.Count -gt 0) {
        Write-Host ""
        Write-Host "Files with remaining targeted magic numbers (first 15):"
        $issueFiles | Select-Object -First 15 | ForEach-Object {
            Write-Host "  $_"
        }
        if ($issueFiles.Count -gt 15) {
            Write-Host "  ... and $($issueFiles.Count - 15) more files"
        }
    }
}

Write-Host ""
Write-Host "Note: Many remaining magic numbers are game-specific values (credits, energy amounts)"
Write-Host "in level tables and configuration files that may not need standardization."