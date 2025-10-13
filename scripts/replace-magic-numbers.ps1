# Magic Numbers Replacement Script
# Replaces common hardcoded timeout and magic number values with constants

Write-Host "=== Magic Numbers Replacement Script ===" -ForegroundColor Cyan
Write-Host "Replacing hardcoded timeout and magic number values with constants..." -ForegroundColor Yellow

$sourceDirs = @(
    "C:\Projects\Attrition\packages\client\src",
    "C:\Projects\Attrition\packages\server\src"
)

$results = @{
    filesModified = @()
    replacementsMade = 0
    importsAdded = @()
}

# Define replacement patterns (most common and safe)
$replacements = @{
    timeouts = @(
        @{
            pattern = 'setTimeout\(([^,]+),\s*1000\)'
            replacement = 'setTimeout($1, TIMEOUTS.ONE_SECOND)'
            constant = 'TIMEOUTS'
            import = 'TIMEOUTS'
            description = '1000ms setTimeout'
        },
        @{
            pattern = 'setInterval\(([^,]+),\s*1000\)'
            replacement = 'setInterval($1, TIMEOUTS.ONE_SECOND)'
            constant = 'TIMEOUTS'
            import = 'TIMEOUTS'
            description = '1000ms setInterval'
        },
        @{
            pattern = 'setTimeout\(([^,]+),\s*3000\)'
            replacement = 'setTimeout($1, TIMEOUTS.THREE_SECONDS)'
            constant = 'TIMEOUTS'
            import = 'TIMEOUTS'
            description = '3000ms setTimeout'
        },
        @{
            pattern = 'setTimeout\(([^,]+),\s*5000\)'
            replacement = 'setTimeout($1, TIMEOUTS.FIVE_SECONDS)'
            constant = 'TIMEOUTS'
            import = 'TIMEOUTS'
            description = '5000ms setTimeout'
        }
    )
    
    environmentValues = @(
        @{
            pattern = '"development"'
            replacement = 'ENV_VALUES.DEVELOPMENT'
            constant = 'ENV_VALUES'
            import = 'ENV_VALUES'
            description = 'development environment string'
        },
        @{
            pattern = '"production"'
            replacement = 'ENV_VALUES.PRODUCTION'
            constant = 'ENV_VALUES'
            import = 'ENV_VALUES'
            description = 'production environment string'
        },
        @{
            pattern = '"test"'
            replacement = 'ENV_VALUES.TEST'
            constant = 'ENV_VALUES'
            import = 'ENV_VALUES'
            description = 'test environment string'
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
        
        # Skip constants files and tests (for now)
        if ($_.Name -match "constants|magic-numbers|configuration-keys|\.test\.|\.spec\.") {
            return
        }
        
        $originalContent = $content
        $fileImports = @()
        $fileReplacements = 0
        
        # Process timeout replacements
        foreach ($replacement in $replacements.timeouts) {
            if ($content -match $replacement.pattern) {
                $content = $content -replace $replacement.pattern, $replacement.replacement
                $fileReplacements++
                
                if ($fileImports -notcontains $replacement.import) {
                    $fileImports += $replacement.import
                }
                
                Write-Host "    Replaced $($replacement.description) in $($_.Name)" -ForegroundColor Gray
            }
        }
        
        # Process environment value replacements (only in non-critical contexts)
        foreach ($replacement in $replacements.environmentValues) {
            # Be more conservative - only replace in obvious comparison contexts
            $contextualPattern = "===\s*$($replacement.pattern)|==\s*$($replacement.pattern)|!==\s*$($replacement.pattern)|!=\s*$($replacement.pattern)"
            if ($content -match $contextualPattern) {
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
                $importPath = if ($importName -eq "TIMEOUTS") {
                    "@shared/constants/magic-numbers"
                } elseif ($importName -eq "ENV_VALUES") {
                    "@shared/constants/configuration-keys"
                } else {
                    "@shared/constants/magic-numbers"
                }
                
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
    Write-Host "1. Test the application to ensure timeout replacements work correctly" -ForegroundColor Green
    Write-Host "2. Run TypeScript compilation to check for import errors" -ForegroundColor Green
    Write-Host "3. Consider additional magic number replacements for retry limits, ports, etc." -ForegroundColor Green
} else {
    Write-Host "`nNo replacements made - either no patterns found or already using constants!" -ForegroundColor Green
}

# Save results
$outputFile = "C:\Projects\Attrition\magic-numbers-replacement-results.json"
$results | ConvertTo-Json -Depth 3 | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "`nResults saved to: $outputFile" -ForegroundColor Cyan

Write-Host "`n=== Magic Numbers Replacement Complete ===" -ForegroundColor Green