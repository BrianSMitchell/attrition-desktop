# Add File Paths Constants Imports Script
Write-Host "Adding missing file paths constants imports to files..." -ForegroundColor Green

$importsAdded = 0
$filesProcessed = 0
$modifiedFiles = @()

# Get all TypeScript and JavaScript files that might contain file paths constants
$files = Get-ChildItem -Path "packages" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
         Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*" -and $_.FullName -notlike "*file-paths.ts" }

Write-Host "Scanning $($files.Count) files for file paths constants usage..."

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if (!$content) { continue }
    
    # Check if file uses any of the file paths constants but doesn't import them
    $usesConstants = ($content -match "FILE_EXTENSIONS\." -or $content -match "FILE_PATHS\." -or $content -match "DIRECTORY_PATHS\.")
    $hasImport = $content -match "import.*FILE_EXTENSIONS|import.*FILE_PATHS|import.*DIRECTORY_PATHS"
    
    if ($usesConstants -and !$hasImport) {
        $filesProcessed++
        
        # Determine the correct import path based on file location
        $relativePath = $file.FullName.Replace($PWD, "").Replace('\', '/')
        $importPath = ""
        
        # Determine what constants are being used
        $importsList = @()
        if ($content -match "FILE_EXTENSIONS\.") { $importsList += "FILE_EXTENSIONS" }
        if ($content -match "FILE_PATHS\.") { $importsList += "FILE_PATHS" }
        if ($content -match "DIRECTORY_PATHS\.") { $importsList += "DIRECTORY_PATHS" }
        
        $importsString = $importsList -join ", "
        
        # Determine import path based on package location
        if ($relativePath -match "packages/server/") {
            $importPath = "import { $importsString } from '../../../shared/src/constants/file-paths';"
        }
        elseif ($relativePath -match "packages/client/") {
            $importPath = "import { $importsString } from '../../../shared/src/constants/file-paths';"
        }
        elseif ($relativePath -match "packages/shared/") {
            $importPath = "import { $importsString } from './constants/file-paths';"
        }
        else {
            # For scripts and other locations, use relative path
            $importPath = "import { $importsString } from './packages/shared/src/constants/file-paths';"
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
        Write-Host "  Added import: $($file.Name) ($importsString)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Green
Write-Host "Files scanned: $($files.Count)"
Write-Host "Files with file paths constants usage: $filesProcessed"
Write-Host "Import statements added: $importsAdded"

if ($modifiedFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "Files with added imports:" -ForegroundColor Cyan
    foreach ($file in $modifiedFiles) {
        Write-Host "  $file" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "File paths constants imports addition completed!" -ForegroundColor Green