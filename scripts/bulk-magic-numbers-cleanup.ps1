#!/usr/bin/env pwsh

Write-Host "Starting targeted magic numbers cleanup..."

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
    "*levelTables*"       # Exclude game level tables (they need custom handling)
)

$totalReplacements = 0
$filesModified = @()

# Define targeted replacements for the most common magic numbers
# Focus on high-impact, frequently used values that are safe to replace
$magicNumberReplacements = @{
    # Common timeout values
    'setTimeout\(\s*([^,]+),\s*1000\s*\)' = 'setTimeout($1, TIMEOUTS.ONE_SECOND)'
    'setInterval\(\s*([^,]+),\s*1000\s*\)' = 'setInterval($1, TIMEOUTS.ONE_SECOND)'
    'setTimeout\(\s*([^,]+),\s*2000\s*\)' = 'setTimeout($1, TIMEOUTS.TWO_SECONDS)'
    'setTimeout\(\s*([^,]+),\s*3000\s*\)' = 'setTimeout($1, TIMEOUTS.THREE_SECONDS)'
    'setTimeout\(\s*([^,]+),\s*5000\s*\)' = 'setTimeout($1, TIMEOUTS.FIVE_SECONDS)'
    'setTimeout\(\s*([^,]+),\s*10000\s*\)' = 'setTimeout($1, TIMEOUTS.TEN_SECONDS)'
    'setTimeout\(\s*([^,]+),\s*30000\s*\)' = 'setTimeout($1, TIMEOUTS.THIRTY_SECONDS)'
    'setTimeout\(\s*([^,]+),\s*60000\s*\)' = 'setTimeout($1, TIMEOUTS.ONE_MINUTE)'
    
    'setInterval\(\s*([^,]+),\s*30000\s*\)' = 'setInterval($1, TIMEOUTS.THIRTY_SECONDS)'
    'setInterval\(\s*([^,]+),\s*60000\s*\)' = 'setInterval($1, TIMEOUTS.ONE_MINUTE)'
    'setInterval\(\s*([^,]+),\s*3600000\s*\)' = 'setInterval($1, TIMEOUTS.ONE_HOUR)'
    
    # Standalone timeout values in configs
    '\btimeout:\s*1000\b' = 'timeout: TIMEOUTS.ONE_SECOND'
    '\btimeout:\s*2000\b' = 'timeout: TIMEOUTS.TWO_SECONDS'
    '\btimeout:\s*3000\b' = 'timeout: TIMEOUTS.THREE_SECONDS'
    '\btimeout:\s*5000\b' = 'timeout: TIMEOUTS.FIVE_SECONDS'
    '\btimeout:\s*10000\b' = 'timeout: TIMEOUTS.TEN_SECONDS'
    '\btimeout:\s*30000\b' = 'timeout: TIMEOUTS.THIRTY_SECONDS'
    
    '\bdelay:\s*1000\b' = 'delay: TIMEOUTS.ONE_SECOND'
    '\bdelay:\s*2000\b' = 'delay: TIMEOUTS.TWO_SECONDS'
    '\bdelay:\s*3000\b' = 'delay: TIMEOUTS.THREE_SECONDS'
    
    # Common retry counts
    '\bmaxRetries:\s*3\b' = 'maxRetries: RETRY_LIMITS.API_RETRIES'
    '\bretryCount:\s*3\b' = 'retryCount: RETRY_LIMITS.API_RETRIES'
    '\bretries:\s*3\b' = 'retries: RETRY_LIMITS.API_RETRIES'
    
    # Batch size patterns
    '\bbatchSize:\s*10\b' = 'batchSize: BUFFER_LIMITS.BATCH_SIZE_SMALL'
    '\bbatchSize:\s*50\b' = 'batchSize: BUFFER_LIMITS.BATCH_SIZE_MEDIUM'
    '\bbatchSize:\s*100\b' = 'batchSize: BUFFER_LIMITS.BATCH_SIZE_LARGE'
    
    # Common status returns (non-HTTP)
    '\breturn 0\b' = 'return STATUS_CODES.SUCCESS'
    '\breturn 1\b' = 'return STATUS_CODES.ERROR'
    
    # Game starting values
    '\bcredits:\s*100\b(?!000)' = 'credits: GAME_CONSTANTS.STARTING_CREDITS'  # Avoid 100000
    '\benergy:\s*100\b(?!000)' = 'energy: GAME_CONSTANTS.STARTING_ENERGY'
    '\benergy:\s*750\b' = 'energy: GAME_CONSTANTS.STARTING_POPULATION'
    
    # Time multipliers in calculations
    '\b1000\s*\*\s*60\b' = 'GAME_CONSTANTS.MILLISECONDS_PER_SECOND * GAME_CONSTANTS.SECONDS_PER_MINUTE'
    
    # Sleep function calls  
    '\bsleep\(\s*1000\s*\)' = 'sleep(TIMEOUTS.ONE_SECOND)'
    '\bsleep\(\s*2000\s*\)' = 'sleep(TIMEOUTS.TWO_SECONDS)'
    '\bsleep\(\s*150\s*\)' = 'sleep(TIMEOUTS.ULTRA_SHORT + 50)'  # 150ms = 100ms + 50ms
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

Write-Host "Found $($allFiles.Count) files to process for magic numbers cleanup"

foreach ($file in $allFiles) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    $originalContent = $content
    $fileReplacements = 0
    
    # Apply each replacement using regex
    foreach ($pattern in $magicNumberReplacements.Keys) {
        $replacement = $magicNumberReplacements[$pattern]
        $matches = [regex]::Matches($content, $pattern)
        if ($matches.Count -gt 0) {
            $content = [regex]::Replace($content, $pattern, $replacement)
            $fileReplacements += $matches.Count
        }
    }
    
    # Write back if changes were made
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalReplacements += $fileReplacements
        $filesModified += $file.FullName
        Write-Host "Modified: $($file.FullName) ($fileReplacements replacements)"
    }
}

Write-Host ""
Write-Host "Bulk magic numbers cleanup completed!"
Write-Host "Total replacements: $totalReplacements"
Write-Host "Files modified: $($filesModified.Count)"

if ($filesModified.Count -gt 0) {
    Write-Host ""
    Write-Host "Modified files:"
    foreach ($file in $filesModified | Select-Object -First 20) {
        Write-Host "  $file"
    }
    if ($filesModified.Count -gt 20) {
        Write-Host "  ... and $($filesModified.Count - 20) more files"
    }
}