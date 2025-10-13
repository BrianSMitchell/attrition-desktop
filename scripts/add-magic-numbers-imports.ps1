#!/usr/bin/env pwsh

Write-Host "Adding magic numbers imports to files that use magic number constants..."

# Define base directories to search
$baseDirs = @(
    "packages",
    "tests"
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
    "*magic-numbers.ts"  # Exclude the constants file itself
)

$importAdded = 0
$filesProcessed = 0
$filesModified = @()

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

Write-Host "Found $($allFiles.Count) files to check for magic number constants usage"

foreach ($file in $allFiles) {
    $filesProcessed++
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    # Check if file uses any of the magic number constants
    $usesTimeouts = $content -match "TIMEOUTS\."
    $usesRetryLimits = $content -match "RETRY_LIMITS\."
    $usesBufferLimits = $content -match "BUFFER_LIMITS\." 
    $usesGameConstants = $content -match "GAME_CONSTANTS\."
    $usesStatusCodes = $content -match "STATUS_CODES\."
    $usesNetworkConstants = $content -match "NETWORK_CONSTANTS\."
    
    $anyMagicNumbers = $usesTimeouts -or $usesRetryLimits -or $usesBufferLimits -or $usesGameConstants -or $usesStatusCodes -or $usesNetworkConstants
    
    # Check if already has import
    $hasImport = $content -match "import.*TIMEOUTS|import.*RETRY_LIMITS|import.*BUFFER_LIMITS|import.*GAME_CONSTANTS|import.*STATUS_CODES|import.*NETWORK_CONSTANTS|import.*MAGIC_NUMBERS"
    
    if ($anyMagicNumbers -and -not $hasImport) {
        # Determine import path based on file location
        $relativePath = $file.FullName.Replace((Get-Location).Path, "").Replace("\", "/")
        
        $importPath = ""
        if ($relativePath -like "*/packages/shared/*") {
            $importPath = "./constants/magic-numbers"
        }
        elseif ($relativePath -like "*/packages/client/*") {
            $importPath = "@shared/constants/magic-numbers"
        }
        elseif ($relativePath -like "*/packages/server/*") {
            $importPath = "@shared/constants/magic-numbers"
        }
        elseif ($relativePath -like "*/tests/*") {
            $importPath = "../packages/shared/src/constants/magic-numbers"
        }
        else {
            # Default fallback
            $importPath = "./constants/magic-numbers"
        }
        
        # Build import statement based on what's used
        $imports = @()
        if ($usesTimeouts) { $imports += "TIMEOUTS" }
        if ($usesRetryLimits) { $imports += "RETRY_LIMITS" }
        if ($usesBufferLimits) { $imports += "BUFFER_LIMITS" }
        if ($usesGameConstants) { $imports += "GAME_CONSTANTS" }
        if ($usesStatusCodes) { $imports += "STATUS_CODES" }
        if ($usesNetworkConstants) { $imports += "NETWORK_CONSTANTS" }
        
        $importLine = "import { $($imports -join ', ') } from '$importPath';"
        
        # Add import at the top of the file
        $lines = $content -split "`r?`n"
        
        # Find insertion point (after other imports)
        $insertIndex = 0
        for ($i = 0; $i -lt $lines.Length; $i++) {
            if ($lines[$i] -match "^import" -or $lines[$i] -match "^\/\/" -or $lines[$i] -match "^\s*$") {
                $insertIndex = $i + 1
            } else {
                break
            }
        }
        
        # Insert the import
        $newLines = @()
        $newLines += $lines[0..($insertIndex-1)]
        $newLines += $importLine
        $newLines += $lines[$insertIndex..($lines.Length-1)]
        
        # Write back to file
        $newContent = $newLines -join "`n"
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        
        $importAdded++
        $filesModified += $file.FullName
        Write-Host "Added magic numbers import to: $($file.FullName)"
        Write-Host "  Import: $importLine"
    }
}

Write-Host ""
Write-Host "Magic numbers import addition completed!"
Write-Host "Files processed: $filesProcessed"
Write-Host "Imports added: $importAdded"
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