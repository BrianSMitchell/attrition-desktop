#!/usr/bin/env pwsh

Write-Host "Adding DB_FIELDS imports to files that use database field constants..."

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
    "*database-fields.ts"  # Exclude the constants file itself
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

Write-Host "Found $($allFiles.Count) files to check for DB_FIELDS usage"

foreach ($file in $allFiles) {
    $filesProcessed++
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    # Check if file uses DB_FIELDS constants
    if ($content -match "DB_FIELDS\." -and $content -notmatch "import.*DB_FIELDS") {
        # Determine import path based on file location
        $relativePath = $file.FullName.Replace((Get-Location).Path, "").Replace("\", "/")
        
        $importPath = ""
        if ($relativePath -like "*/packages/server/*") {
            $importPath = "../../../constants/database-fields"
        }
        elseif ($relativePath -like "*/packages/shared/*") {
            $importPath = "../../server/src/constants/database-fields"
        }
        elseif ($relativePath -like "*/tests/*") {
            $importPath = "../packages/server/src/constants/database-fields"
        }
        else {
            # Default fallback
            $importPath = "./constants/database-fields"
        }
        
        # Add import at the top of the file
        $lines = $content -split "`r?`n"
        $importLine = "import { DB_FIELDS } from '$importPath';"
        
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
        Write-Host "Added DB_FIELDS import to: $($file.FullName)"
    }
}

Write-Host ""
Write-Host "DB_FIELDS import addition completed!"
Write-Host "Files processed: $filesProcessed"
Write-Host "Imports added: $importAdded"
Write-Host "Files modified: $($filesModified.Count)"

if ($filesModified.Count -gt 0) {
    Write-Host ""
    Write-Host "Modified files:"
    foreach ($file in $filesModified) {
        Write-Host "  $file"
    }
}