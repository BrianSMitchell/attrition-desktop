# Add API_ENDPOINTS imports to files that use the constants
# This script analyzes files and adds the necessary import statement

$projectRoot = "C:\Projects\Attrition"
$importCount = 0
$modifiedFiles = @()

# Import statement to add
$importStatement = "import { API_ENDPOINTS } from '../constants/api-endpoints';"

# Alternative import paths for different file structures
$importPaths = @{
    "packages/client/src" = "import { API_ENDPOINTS } from '@server/constants/api-endpoints';"
    "packages/server/src" = "import { API_ENDPOINTS } from '../constants/api-endpoints';"
    "packages/server/src/routes" = "import { API_ENDPOINTS } from '../../constants/api-endpoints';"
    "packages/server/src/routes/game" = "import { API_ENDPOINTS } from '../../../constants/api-endpoints';"
    "packages/server/src/routes/v1" = "import { API_ENDPOINTS } from '../../constants/api-endpoints';"
    "packages/server/src/__tests__" = "import { API_ENDPOINTS } from '../constants/api-endpoints';"
    "packages/server/src/middleware" = "import { API_ENDPOINTS } from '../constants/api-endpoints';"
    "packages/server/src/utils" = "import { API_ENDPOINTS } from '../constants/api-endpoints';"
}

# Find files that contain API_ENDPOINTS references
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
        $_.FullName -notmatch "desktop/resources"  # Skip built desktop assets
    }
    $candidateFiles += $files
}

Write-Host "Analyzing $($candidateFiles.Count) files for API_ENDPOINTS usage" -ForegroundColor Green

foreach ($file in $candidateFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if (-not $content) { continue }
        
        # Check if file uses API_ENDPOINTS but doesn't already import it
        if ($content -match "API_ENDPOINTS\." -and $content -notmatch "import.*API_ENDPOINTS") {
            
            # Skip the constants file itself
            if ($file.FullName -match "api-endpoints\.ts") { continue }
            
            # Determine correct import path based on file location
            $relativePath = $file.FullName.Replace($projectRoot, "").Replace("\", "/")
            $importToAdd = $importStatement # default
            
            foreach ($pathPattern in $importPaths.Keys) {
                if ($relativePath -match $pathPattern.Replace("/", "\\")) {
                    $importToAdd = $importPaths[$pathPattern]
                    break
                }
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
            Write-Host "Added import to: $($file.FullName)" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "Error processing $($file.FullName): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nAPI_ENDPOINTS import addition completed!" -ForegroundColor Green
Write-Host "Imports added: $importCount" -ForegroundColor Green
Write-Host "Files modified: $($modifiedFiles.Count)" -ForegroundColor Green

if ($modifiedFiles.Count -gt 0) {
    Write-Host "`nModified files:" -ForegroundColor Cyan
    $modifiedFiles | Sort-Object | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
}