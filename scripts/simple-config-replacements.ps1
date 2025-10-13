param(
    [switch]$DryRun = $false,
    [switch]$Verbose = $false
)

Write-Host "Configuration Keys Bulk Replacement" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

if ($DryRun) {
    Write-Host "DRY RUN MODE - No files will be modified" -ForegroundColor Yellow
}

# Define replacements
$replacements = @(
    @{From = "=== 'development'"; To = "=== ENV_VALUES.DEVELOPMENT"}
    @{From = "=== 'production'"; To = "=== ENV_VALUES.PRODUCTION"}
    @{From = "=== 'test'"; To = "=== ENV_VALUES.TEST"}
    @{From = '=== "development"'; To = "=== ENV_VALUES.DEVELOPMENT"}
    @{From = '=== "production"'; To = "=== ENV_VALUES.PRODUCTION"}
    @{From = '=== "test"'; To = "=== ENV_VALUES.TEST"}
)

# Find TypeScript files
$files = Get-ChildItem -Path "packages" -Recurse -Include "*.ts" -Exclude "*.d.ts", "configuration-keys.ts", "env-vars.ts"

Write-Host "Found $($files.Count) TypeScript files to process" -ForegroundColor Cyan

$modifiedFiles = 0
$totalReplacements = 0

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8
    if ($null -eq $content) {
        $content = ""
    }
    $originalContent = $content
    $fileModified = $false
    $fileReplacements = 0
    
    foreach ($replacement in $replacements) {
        $oldContent = $content
        $content = $content.Replace($replacement.From, $replacement.To)
        if ($content -ne $oldContent) {
            $count = ($oldContent.Split($replacement.From).Count - 1)
            $fileReplacements += $count
            $fileModified = $true
        }
    }
    
    if ($fileModified) {
        # Add import if needed and not already present
        if (-not $content.Contains("ENV_VALUES") -or -not $content.Contains("@shared/constants/configuration-keys")) {
            $lines = $content -split "`n"
            $insertIndex = 0
            
            # Find where to insert import (after other imports)
            for ($i = 0; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match "^import " -or $lines[$i] -match "^from ") {
                    $insertIndex = $i + 1
                } elseif ($lines[$i].Trim() -eq "" -and $insertIndex -gt 0) {
                    break
                }
            }
            
            # Insert the import
            $importLine = "import { ENV_VALUES } from '@shared/constants/configuration-keys';"
            $newLines = @()
            $newLines += $lines[0..($insertIndex-1)]
            $newLines += $importLine
            $newLines += $lines[$insertIndex..($lines.Count-1)]
            $content = $newLines -join "`n"
        }
        
        if (-not $DryRun) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8 -NoNewline
        }
        
        $modifiedFiles++
        $totalReplacements += $fileReplacements
        
        if ($Verbose) {
            $relativePath = $file.FullName.Replace((Get-Location).Path, "")
            Write-Host "Modified: $relativePath ($fileReplacements replacements)" -ForegroundColor Green
        }
    }
}

Write-Host "`nSUMMARY" -ForegroundColor Magenta
Write-Host "=======" -ForegroundColor Magenta
Write-Host "Files processed: $($files.Count)" -ForegroundColor White
Write-Host "Files modified: $modifiedFiles" -ForegroundColor Green
Write-Host "Total replacements: $totalReplacements" -ForegroundColor Green

if ($DryRun) {
    Write-Host "`nDRY RUN COMPLETE - Run without -DryRun to apply changes" -ForegroundColor Yellow
} else {
    Write-Host "`nBULK REPLACEMENT COMPLETE!" -ForegroundColor Green
}