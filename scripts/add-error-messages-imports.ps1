# Add ERROR_MESSAGES imports to files that use the constants
# This script analyzes files and adds the necessary import statement

$projectRoot = "C:\Projects\Attrition"
$importCount = 0
$modifiedFiles = @()

# Import paths for different file structures
$importPaths = @{
    "packages/client/src" = "import { ERROR_MESSAGES } from '@server/constants/response-formats';"
    "packages/server/src" = "import { ERROR_MESSAGES } from '../constants/response-formats';"
    "packages/server/src/routes" = "import { ERROR_MESSAGES } from '../../constants/response-formats';"
    "packages/server/src/routes/game" = "import { ERROR_MESSAGES } from '../../../constants/response-formats';"
    "packages/server/src/routes/v1" = "import { ERROR_MESSAGES } from '../../constants/response-formats';"
    "packages/server/src/services" = "import { ERROR_MESSAGES } from '../constants/response-formats';"
    "packages/server/src/middleware" = "import { ERROR_MESSAGES } from '../constants/response-formats';"
    "packages/server/src/__tests__" = "import { ERROR_MESSAGES } from '../constants/response-formats';"
    "tests/" = "import { ERROR_MESSAGES } from '../packages/server/src/constants/response-formats';"
}

# Find files that contain ERROR_MESSAGES references
$fileExtensions = @("*.ts", "*.tsx", "*.js", "*.jsx")
$candidateFiles = @()

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
    $candidateFiles += $files
}

Write-Host "Analyzing $($candidateFiles.Count) files for ERROR_MESSAGES usage" -ForegroundColor Green

foreach ($file in $candidateFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if (-not $content) { continue }
        
        # Check if file uses ERROR_MESSAGES but doesn't already import it
        if ($content -match "ERROR_MESSAGES\." -and $content -notmatch "import.*ERROR_MESSAGES") {
            
            # Skip the constants file itself
            if ($file.FullName -match "response-formats\.ts") { continue }
            
            # Determine correct import path based on file location
            $relativePath = $file.FullName.Replace($projectRoot, "").Replace("\", "/")
            $importToAdd = "import { ERROR_MESSAGES } from '../constants/response-formats';" # default
            
            # Find the best matching import path
            foreach ($pathPattern in $importPaths.Keys) {
                if ($relativePath -match $pathPattern.Replace("/", "\\")) {
                    $importToAdd = $importPaths[$pathPattern]
                    break
                }
            }
            
            # Special handling for desktop and other packages
            if ($relativePath -match "packages/desktop" -or 
                $relativePath -match "packages/client" -or 
                $relativePath -match "packages/npc-memory") {
                # Use a more generic import that may need to be adjusted
                $importToAdd = "import { ERROR_MESSAGES } from '../../server/src/constants/response-formats';"
            }
            
            # Find where to insert the import (after existing imports)
            $lines = $content -split "`r?`n"
            $insertIndex = 0
            $hasImports = $false
            
            for ($i = 0; $i -lt $lines.Length; $i++) {
                if ($lines[$i] -match "^import\s+" -or $lines[$i] -match "^export\s+.*from") {
                    $hasImports = $true
                    $insertIndex = $i + 1
                }
                elseif ($hasImports -and $lines[$i] -notmatch "^import\s+" -and $lines[$i] -notmatch "^export\s+.*from" -and $lines[$i].Trim() -ne "") {
                    break
                }
            }
            
            # Insert the import
            $newLines = @()
            for ($i = 0; $i -lt $lines.Length; $i++) {
                if ($i -eq $insertIndex -and $hasImports) {
                    $newLines += $importToAdd
                    $newLines += ""  # Empty line after imports
                }
                elseif ($i -eq 0 -and -not $hasImports) {
                    $newLines += $importToAdd
                    $newLines += ""
                    $newLines += $lines[$i]
                    continue
                }
                $newLines += $lines[$i]
            }
            
            # Write back to file
            $newContent = $newLines -join "`r`n"
            Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8
            
            $importCount++
            $modifiedFiles += $file.FullName
            Write-Host "Added ERROR_MESSAGES import to: $($file.FullName)" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "Error processing $($file.FullName): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nERROR_MESSAGES import addition completed!" -ForegroundColor Green
Write-Host "Imports added: $importCount" -ForegroundColor Green
Write-Host "Files modified: $($modifiedFiles.Count)" -ForegroundColor Green

if ($modifiedFiles.Count -gt 0) {
    Write-Host "`nModified files:" -ForegroundColor Cyan
    $modifiedFiles | Sort-Object | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
}