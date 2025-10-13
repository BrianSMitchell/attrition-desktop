# Add ENV_VARS Imports Script
Write-Host "Adding missing ENV_VARS imports to files..." -ForegroundColor Green

$importsAdded = 0
$filesProcessed = 0
$modifiedFiles = @()

# Get all TypeScript and JavaScript files that might contain ENV_VARS references
$files = Get-ChildItem -Path "packages" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
         Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*" -and $_.FullName -notlike "*env-vars.ts" }

Write-Host "Scanning $($files.Count) files for ENV_VARS usage..."

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if (!$content) { continue }
    
    # Check if file uses ENV_VARS but doesn't import it
    if ($content -match "ENV_VARS\." -and $content -notmatch "import.*ENV_VARS") {
        $filesProcessed++
        
        # Determine the correct import path based on file location
        $relativePath = $file.FullName.Replace($PWD, "").Replace('\', '/')
        $importPath = ""
        
        # Determine import path based on package location
        if ($relativePath -match "packages/server/") {
            $importPath = "import { ENV_VARS } from '../../../shared/src/constants/env-vars';"
        }
        elseif ($relativePath -match "packages/client/") {
            $importPath = "import { ENV_VARS } from '../../../shared/src/constants/env-vars';"
        }
        elseif ($relativePath -match "packages/shared/") {
            $importPath = "import { ENV_VARS } from './constants/env-vars';"
        }
        else {
            # For scripts and other locations, use relative path
            $importPath = "import { ENV_VARS } from './packages/shared/src/constants/env-vars';"
        }
        
        # Find the best place to insert the import
        $lines = $content -split "`n"
        $insertIndex = 0
        
        # Look for existing imports to insert after them
        for ($i = 0; $i -lt $lines.Count; $i++) {
            $line = $lines[$i].Trim()
            if ($line -match "^import\s+" -or $line -match "^const\s+.*=\s+require") {
                $insertIndex = $i + 1
            }
            elseif ($line -and $line -notmatch "^//" -and $line -notmatch "^/\*" -and $line -ne "") {
                # First non-comment, non-empty line - insert before this
                break
            }
        }
        
        # Insert the import
        $newLines = @()
        for ($i = 0; $i -lt $lines.Count; $i++) {
            if ($i -eq $insertIndex) {
                $newLines += $importPath
                $newLines += ""
            }
            $newLines += $lines[$i]
        }
        
        # Write the modified content back to the file
        $newContent = $newLines -join "`n"
        Set-Content -Path $file.FullName -Value $newContent -NoNewline
        
        $importsAdded++
        $relativePath = $file.FullName.Replace($PWD, "").TrimStart('\')
        $modifiedFiles += $relativePath
        Write-Host "  Added import: $($file.Name)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Green
Write-Host "Files scanned: $($files.Count)"
Write-Host "Files with ENV_VARS usage: $filesProcessed"
Write-Host "Import statements added: $importsAdded"

if ($modifiedFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "Files with added imports:" -ForegroundColor Cyan
    foreach ($file in $modifiedFiles) {
        Write-Host "  $file" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "ENV_VARS imports addition completed!" -ForegroundColor Green