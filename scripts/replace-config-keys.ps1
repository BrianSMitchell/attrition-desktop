# Configuration Keys Replacement Script
# Replaces common hardcoded configuration keys with constants

Write-Host "=== Configuration Keys Replacement Script ===" -ForegroundColor Cyan
Write-Host "Replacing hardcoded configuration keys with constants..." -ForegroundColor Yellow

$sourceDirs = @(
    "C:\Projects\Attrition\packages\client\src",
    "C:\Projects\Attrition\packages\server\src"
)

$results = @{
    filesModified = @()
    replacementsMade = 0
    importsAdded = @()
}

# Define safe configuration key replacements
$replacements = @{
    envComparisons = @(
        @{
            pattern = 'process\.env\.NODE_ENV\s*===\s*["'']development["'']'
            replacement = 'process.env.NODE_ENV === ENV_VALUES.DEVELOPMENT'
            import = 'ENV_VALUES'
            description = 'NODE_ENV development comparison'
        },
        @{
            pattern = 'process\.env\.NODE_ENV\s*===\s*["'']production["'']'
            replacement = 'process.env.NODE_ENV === ENV_VALUES.PRODUCTION'
            import = 'ENV_VALUES'
            description = 'NODE_ENV production comparison'
        },
        @{
            pattern = 'process\.env\.NODE_ENV\s*===\s*["'']test["'']'
            replacement = 'process.env.NODE_ENV === ENV_VALUES.TEST'
            import = 'ENV_VALUES'
            description = 'NODE_ENV test comparison'
        }
    )
    
    storageKeys = @(
        @{
            pattern = 'localStorage\.getItem\(["'']([a-zA-Z0-9_-]+)["'']\)'
            replacement = 'localStorage.getItem($1_KEY)'
            import = 'STORAGE_KEYS'
            description = 'localStorage.getItem with hardcoded key'
            requiresKeyConstant = $true
        }
    )
}

function Get-SafeFileContent {
    param([string]$filePath)
    try {
        return Get-Content -Path $filePath -Raw -ErrorAction Stop
    }
    catch {
        return $null
    }
}

function Set-SafeFileContent {
    param([string]$filePath, [string]$content)
    try {
        Set-Content -Path $filePath -Value $content -Encoding UTF8 -ErrorAction Stop
        return $true
    }
    catch {
        Write-Host "Error writing to $filePath - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

foreach ($sourceDir in $sourceDirs) {
    if (-not (Test-Path $sourceDir)) {
        Write-Host "Skipping non-existent directory: $sourceDir" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "`nProcessing: $sourceDir" -ForegroundColor Green
    
    Get-ChildItem -Path $sourceDir -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | ForEach-Object {
        $content = Get-SafeFileContent $_.FullName
        if ($null -eq $content) { return }
        
        $relativePath = $_.FullName.Replace("C:\Projects\Attrition\", "")
        
        # Skip constants files and tests
        if ($_.Name -match "constants|magic-numbers|configuration-keys|\.test\.|\.spec\.") {
            return
        }
        
        $originalContent = $content
        $fileImports = @()
        $fileReplacements = 0
        
        # Process environment comparison replacements
        foreach ($replacement in $replacements.envComparisons) {
            if ($content -match $replacement.pattern) {
                $content = $content -replace $replacement.pattern, $replacement.replacement
                $fileReplacements++
                
                if ($fileImports -notcontains $replacement.import) {
                    $fileImports += $replacement.import
                }
                
                Write-Host "    Replaced $($replacement.description) in $($_.Name)" -ForegroundColor Gray
            }
        }
        
        # Add imports if replacements were made
        if ($fileReplacements -gt 0) {
            foreach ($importName in $fileImports) {
                $importPath = "@shared/constants/configuration-keys"
                $importStatement = "import { $importName } from '$importPath';"
                
                # Check if import already exists
                if ($content -notmatch [regex]::Escape($importStatement)) {
                    # Add import after existing imports
                    $lines = $content -split "`n"
                    $lastImportIndex = -1
                    
                    for ($i = 0; $i -lt $lines.Length; $i++) {
                        if ($lines[$i] -match "^import\s") {
                            $lastImportIndex = $i
                        }
                    }
                    
                    if ($lastImportIndex -ge 0) {
                        $lines = $lines[0..$lastImportIndex] + $importStatement + $lines[($lastImportIndex + 1)..($lines.Length - 1)]
                        $content = $lines -join "`n"
                    } else {
                        # Add at the very top
                        $content = $importStatement + "`n" + $content
                    }
                }
            }
            
            # Write the modified content back
            if (Set-SafeFileContent $_.FullName $content) {
                $results.filesModified += $relativePath
                $results.replacementsMade += $fileReplacements
                $results.importsAdded += $fileImports
                
                Write-Host "  Modified: $relativePath ($fileReplacements replacements)" -ForegroundColor White
            }
        }
    }
}

# Output Results
Write-Host "`n=== REPLACEMENT RESULTS ===" -ForegroundColor Cyan

Write-Host "`nFiles Modified: $($results.filesModified.Count)" -ForegroundColor Yellow
$results.filesModified | ForEach-Object {
    Write-Host "  $_" -ForegroundColor White
}

Write-Host "`nTotal Replacements: $($results.replacementsMade)" -ForegroundColor Yellow

$uniqueImports = $results.importsAdded | Sort-Object -Unique
Write-Host "`nUnique Imports Added: $($uniqueImports.Count)" -ForegroundColor Yellow
$uniqueImports | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Green
}

if ($results.replacementsMade -gt 0) {
    Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Cyan
    Write-Host "1. Test the application to ensure configuration key replacements work correctly" -ForegroundColor Green
    Write-Host "2. Run TypeScript compilation to check for import errors" -ForegroundColor Green
    Write-Host "3. Consider additional configuration key patterns" -ForegroundColor Green
} else {
    Write-Host "`nNo replacements made - either no patterns found or already using constants!" -ForegroundColor Green
}

# Save results
$outputFile = "C:\Projects\Attrition\config-keys-replacement-results.json"
$results | ConvertTo-Json -Depth 3 | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "`nResults saved to: $outputFile" -ForegroundColor Cyan

Write-Host "`n=== Configuration Keys Replacement Complete ===" -ForegroundColor Green