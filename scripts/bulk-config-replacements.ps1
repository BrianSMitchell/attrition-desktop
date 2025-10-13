#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Bulk Configuration Key Replacements
.DESCRIPTION
    Efficiently replaces hardcoded configuration keys with standardized constants
    across multiple files in the Attrition codebase.
.NOTES
    Part of the Configuration Keys standardization initiative
#>

param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"
$WarningPreference = "Continue"

# Color output functions
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }

Write-Host "🔄 Configuration Keys Bulk Replacement Script" -ForegroundColor Magenta
Write-Host "=============================================" -ForegroundColor Magenta

if ($DryRun) {
    Write-Warning "DRY RUN MODE - No files will be modified"
}

# Define replacement patterns for bulk operations (simple string replacements)
$replacements = @(
    @{Pattern = "=== 'development'"; Replacement = "=== ENV_VALUES.DEVELOPMENT"; Type = "ENV_VALUES"}
    @{Pattern = "=== 'production'"; Replacement = "=== ENV_VALUES.PRODUCTION"; Type = "ENV_VALUES"}
    @{Pattern = "=== 'test'"; Replacement = "=== ENV_VALUES.TEST"; Type = "ENV_VALUES"}
    @{Pattern = '=== "development"'; Replacement = "=== ENV_VALUES.DEVELOPMENT"; Type = "ENV_VALUES"}
    @{Pattern = '=== "production"'; Replacement = "=== ENV_VALUES.PRODUCTION"; Type = "ENV_VALUES"}
    @{Pattern = '=== "test"'; Replacement = "=== ENV_VALUES.TEST"; Type = "ENV_VALUES"}
)

# Define import requirements for each pattern type
$importRequirements = @{
    "ENV_VALUES" = 'import { ENV_VALUES } from ''@shared/constants/configuration-keys'';'
}

# File patterns to target
$targetFiles = @(
    "packages/server/src/**/*.ts"
    "packages/client/src/**/*.ts"
    "packages/client/src/**/*.tsx"
    "packages/shared/src/**/*.ts"
    "packages/desktop/src/**/*.ts"
    "packages/desktop/src/**/*.js"
)

# Files to exclude (already processed or should not be modified)
$excludePatterns = @(
    "**/node_modules/**"
    "**/dist/**"
    "**/build/**"
    "**/*.d.ts"
    "**/*.map"
    "**/*.min.js"
    "**/configuration-keys.ts"
    "**/env-vars.ts"
)

Write-Info "Scanning for target files..."

# Get all target files
$allFiles = @()
foreach ($pattern in $targetFiles) {
    $files = Get-ChildItem -Path $pattern -Recurse -File -ErrorAction SilentlyContinue
    if ($files) {
        $allFiles += $files
    }
}

# Filter out excluded files
$filteredFiles = $allFiles | Where-Object {
    $filePath = $_.FullName
    $include = $true
    foreach ($exclude in $excludePatterns) {
        if ($filePath -like $exclude) {
            $include = $false
            break
        }
    }
    $include
}

Write-Info "Found $($filteredFiles.Count) files to process"

$processedFiles = 0
$modifiedFiles = 0
$errors = 0
$replacementCounts = @{}

foreach ($file in $filteredFiles) {
    $processedFiles++
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
    
    if ($Verbose) {
        Write-Host "Processing: $relativePath" -ForegroundColor Gray
    }
    
    try {
        # Read file content
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        $originalContent = $content
        $fileModified = $false
        $fileReplacements = @{}
        $requiredImports = @()
        
        # Apply all replacement patterns
        foreach ($replacement in $replacements) {
            $pattern = $replacement.Pattern
            $newValue = $replacement.Replacement
            $importType = $replacement.Type
            
            # Simple string replacement
            $beforeCount = ($content | Select-String -Pattern [regex]::Escape($pattern) -AllMatches).Matches.Count
            if ($beforeCount -gt 0) {
                $content = $content -replace [regex]::Escape($pattern), $newValue
                $fileReplacements[$pattern] = $beforeCount
                $fileModified = $true
                
                # Add required import type
                $requiredImports += $importType
            }
        }
        
        # Add required imports if file was modified
        if ($fileModified -and $requiredImports.Count -gt 0) {
            $uniqueImports = $requiredImports | Select-Object -Unique
            $hasExistingImport = $content -match 'from.*@shared/constants/configuration-keys'
            
            if (-not $hasExistingImport) {
                # Find the best place to insert import
                $importLines = @()
                foreach ($importType in $uniqueImports) {
                    if ($importRequirements.ContainsKey($importType)) {
                        $importLines += $importRequirements[$importType]
                    }
                }
                
                # Combine multiple imports into one line if possible
                if ($importLines.Count -gt 1) {
                    $importNames = ($uniqueImports | Where-Object { $importRequirements.ContainsKey($_) }) -join ', '
                    $combinedImport = "import { $importNames } from '@shared/constants/configuration-keys';"
                    $importLines = @($combinedImport)
                }
                
                # Insert import after existing imports
                $lines = $content -split "`r?`n"
                $insertIndex = 0
                for ($i = 0; $i -lt $lines.Count; $i++) {
                    if ($lines[$i] -match "^import " -or $lines[$i] -match "^from ") {
                        $insertIndex = $i + 1
                    } elseif ($lines[$i].Trim() -eq "" -and $insertIndex -gt 0) {
                        break
                    }
                }
                
                # Insert the import lines
                $newLines = @()
                $newLines += $lines[0..$insertIndex]
                $newLines += $importLines
                if ($insertIndex -lt $lines.Count - 1) {
                    $newLines += $lines[($insertIndex + 1)..($lines.Count - 1)]
                }
                
                $content = $newLines -join "`n"
            }
            
            # Update replacement counts
            foreach ($pattern in $fileReplacements.Keys) {
                if (-not $replacementCounts.ContainsKey($pattern)) {
                    $replacementCounts[$pattern] = 0
                }
                $replacementCounts[$pattern] += $fileReplacements[$pattern]
            }
            
            # Write file if not dry run
            if (-not $DryRun) {
                Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
            }
            
            $modifiedFiles++
            if ($Verbose) {
                Write-Success "Modified: $relativePath ($($fileReplacements.Values | Measure-Object -Sum | Select-Object -ExpandProperty Sum) replacements)"
            }
        }
        
    } catch {
        $errors++
        Write-Error "Error processing $relativePath`: $($_.Exception.Message)"
    }
}

Write-Host "`n📊 BULK REPLACEMENT SUMMARY" -ForegroundColor Magenta
Write-Host "=========================" -ForegroundColor Magenta
Write-Info "Files processed: $processedFiles"
Write-Info "Files modified: $modifiedFiles"
if ($errors -gt 0) {
    Write-Warning "Errors encountered: $errors"
}

if ($replacementCounts.Count -gt 0) {
    Write-Host "`n🔄 Replacement Details:" -ForegroundColor Yellow
    foreach ($pattern in $replacementCounts.Keys | Sort-Object) {
        Write-Host "  • $pattern → $($replacementCounts[$pattern]) replacements" -ForegroundColor White
    }
    
    $totalReplacements = ($replacementCounts.Values | Measure-Object -Sum).Sum
    Write-Success "Total replacements: $totalReplacements"
} else {
    Write-Info "No replacements needed"
}

if ($DryRun) {
    Write-Warning "DRY RUN COMPLETE - Run without -DryRun to apply changes"
} else {
    Write-Success "BULK REPLACEMENT COMPLETE!"
}