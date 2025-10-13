Write-Host "Adding ERROR_MESSAGES imports to modified files..." -ForegroundColor Green

# List of files that were modified by the replacement script
$modifiedFiles = @(
    "packages\server\src\routes\game\bases\index.ts",
    "packages\server\src\routes\game\index.ts", 
    "packages\server\src\routes\game\structures.ts",
    "packages\server\src\routes\v1\buildingRoutes.ts",
    "packages\server\src\routes\v1\territoryRoutes.ts",
    "packages\server\src\services\authService.ts",
    "packages\server\src\__tests__\basesRoutes.test.ts",
    "packages\client\src\components\auth\Auth.tsx",
    "packages\client\src\components\auth\Login.tsx",
    "packages\client\src\services\authService.ts",
    "packages\client\src\stores\slices\enhancedAuthSlice.ts"
)

$filesProcessed = 0
$importsAdded = 0

foreach ($filePath in $modifiedFiles) {
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -ErrorAction SilentlyContinue
        
        if ($content) {
            # Check if ERROR_MESSAGES is used but not imported
            if ($content -match 'ERROR_MESSAGES\.' -and $content -notmatch 'import.*ERROR_MESSAGES') {
                $lines = $content -split "`n"
                $newLines = @()
                $importAdded = $false
                
                # Find the right place to add the import
                for ($i = 0; $i -lt $lines.Length; $i++) {
                    $line = $lines[$i]
                    
                    # Add the import after existing imports but before the first non-import line
                    if (-not $importAdded -and $line -notmatch "^import" -and $line.Trim() -ne "" -and $line -notmatch "^//") {
                        # Determine the correct import path based on file location
                        if ($filePath -like "*server*") {
                            $newLines += "import { ERROR_MESSAGES } from '../constants/response-formats';"
                        } else {
                            $newLines += "import { ERROR_MESSAGES } from '@shared/constants/response-formats';"
                        }
                        $newLines += ""
                        $importAdded = $true
                        $importsAdded++
                    }
                    
                    $newLines += $line
                }
                
                if ($importAdded) {
                    # Write the modified content back to the file
                    $newContent = $newLines -join "`n"
                    Set-Content -Path $filePath -Value $newContent -Encoding UTF8
                    $relativePath = $filePath.Replace((Get-Location).Path + "\", "")
                    Write-Host "  Added import to: $relativePath" -ForegroundColor Green
                }
            } elseif ($content -match 'ERROR_MESSAGES\.') {
                $relativePath = $filePath.Replace((Get-Location).Path + "\", "")
                Write-Host "  Already has import: $relativePath" -ForegroundColor Yellow
            }
        }
        $filesProcessed++
    } else {
        Write-Host "  File not found: $filePath" -ForegroundColor Red
    }
}

Write-Host "`nSUMMARY:" -ForegroundColor Yellow
Write-Host "Files processed: $filesProcessed" -ForegroundColor White
Write-Host "Imports added: $importsAdded" -ForegroundColor White
Write-Host "Import addition completed!" -ForegroundColor Green