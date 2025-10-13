#!/usr/bin/env pwsh

Write-Host "Adding HTTP_STATUS imports to files that use HTTP status constants..."

# Define base directories to search
$baseDirs = @(
    "packages",
    "scripts", 
    "tests",
    "render-mcp",
    "supermemory-local"
)

# Define patterns to exclude
$excludePatterns = @(
    "node_modules",
    "dist",
    "build", 
    ".next",
    "coverage",
    "**/*.min.js",
    "**/*.bundle.js"
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

Write-Host "Found $($allFiles.Count) files to check for HTTP_STATUS usage"

foreach ($file in $allFiles) {
    $filesProcessed++
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    # Check if file uses HTTP_STATUS constants
    if ($content -match "HTTP_STATUS\." -and $content -notmatch "import.*HTTP_STATUS") {
        # Determine import path based on file location
        $relativePath = $file.FullName.Replace((Get-Location).Path, "").Replace("\", "/")
        
        $importPath = ""
        if ($relativePath -like "*/packages/shared/*") {
            $importPath = "../response-formats"
        }
        elseif ($relativePath -like "*/packages/client/*") {
            $importPath = "@shared/response-formats"
        }
        elseif ($relativePath -like "*/packages/server/*") {
            $importPath = "@shared/response-formats"
        }
        elseif ($relativePath -like "*/tests/*") {
            $importPath = "../packages/shared/src/response-formats"
        }
        elseif ($relativePath -like "*/scripts/*") {
            $importPath = "../packages/shared/src/response-formats"
        }
        elseif ($relativePath -like "*/render-mcp/*") {
            $importPath = "../packages/shared/src/response-formats"
        }
        elseif ($relativePath -like "*/supermemory-local/*") {
            $importPath = "../packages/shared/src/response-formats"
        }
        else {
            # Default fallback
            $importPath = "./response-formats"
        }
        
        # Add import at the top of the file
        $lines = $content -split "`r?`n"
        $importLine = "import { HTTP_STATUS } from '$importPath';"
        
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
        Write-Host "Added HTTP_STATUS import to: $($file.FullName)"
    }
}

Write-Host ""
Write-Host "HTTP_STATUS import addition completed!"
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