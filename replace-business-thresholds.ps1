# Business Logic Thresholds Replacement Script
# Replaces hardcoded threshold values with BUSINESS_THRESHOLDS constants

Write-Host "🎯 Replacing Business Logic Thresholds" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Gray

$sourceDirs = @("packages/client/src", "packages/server/src", "packages/shared/src")
$modifiedFiles = @()
$totalReplacements = 0

# Import statement to add to files
$importStatement = "import { BUSINESS_THRESHOLDS, THRESHOLD_HELPERS } from '@shared/constants/business-thresholds';"

# Define replacement patterns - only the safest, most obvious ones
$replacementPatterns = @(
    @{
        Pattern = 'if\s*\(\s*ms\s*<=\s*0\s*\)'
        Replacement = 'if (THRESHOLD_HELPERS.isCompleted(ms))'
        Description = "Time completion check"
    },
    @{
        Pattern = 'if\s*\(\s*(\w+)\.quantity\s*>\s*0\s*\)'
        Replacement = 'if (THRESHOLD_HELPERS.isPositiveQuantity($1.quantity))'
        Description = "Positive quantity check"
    },
    @{
        Pattern = 'if\s*\(\s*errorCount\s*===\s*1\s*\)'
        Replacement = 'if (THRESHOLD_HELPERS.isFirstError(errorCount))'
        Description = "First error check"
    },
    @{
        Pattern = 'if\s*\(\s*successCount\s*>\s*0\s*\)'
        Replacement = 'if (THRESHOLD_HELPERS.hasSuccess(successCount))'
        Description = "Success count check"
    },
    @{
        Pattern = 'if\s*\(\s*d\s*>=\s*0\s*\)'
        Replacement = 'if (d >= BUSINESS_THRESHOLDS.GAME_VALUES.MIN_DEFENSE_LEVEL)'
        Description = "Defense level check"
    },
    @{
        Pattern = 'if\s*\(\s*d\s*>\s*0\s*\)'
        Replacement = 'if (d > BUSINESS_THRESHOLDS.GAME_VALUES.MIN_DEFENSE_LEVEL)'
        Description = "Positive defense level check"
    },
    @{
        Pattern = '\.length\s*>\s*0'
        Replacement = '.length > BUSINESS_THRESHOLDS.ARRAYS.EMPTY_LENGTH'
        Description = "Array length check"
    },
    @{
        Pattern = '\.trim\(\)\.length\s*>\s*0'
        Replacement = '.trim().length > BUSINESS_THRESHOLDS.CONTENT.EMPTY_STRING_LENGTH'
        Description = "Trimmed string length check"
    },
    @{
        Pattern = 'Math\.max\(0,\s*Number\(([^)]+)\s*\|\|\s*0\)\)'
        Replacement = 'THRESHOLD_HELPERS.safeLevel($1)'
        Description = "Safe level parsing"
    }
)

function Add-ImportIfNeeded {
    param($FilePath)
    
    $content = Get-Content $FilePath -Raw
    
    # Check if import already exists
    if ($content -match 'from.*business-thresholds') {
        return $false
    }
    
    # Find the last import statement
    $lines = Get-Content $FilePath
    $lastImportIndex = -1
    
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -match '^import\s+') {
            $lastImportIndex = $i
        }
    }
    
    # Insert the import after the last import or at the top
    if ($lastImportIndex -ge 0) {
        $lines = $lines[0..$lastImportIndex] + $importStatement + $lines[($lastImportIndex + 1)..($lines.Length - 1)]
    } else {
        $lines = $importStatement + $lines
    }
    
    Set-Content $FilePath $lines -Encoding UTF8
    return $true
}

foreach ($dir in $sourceDirs) {
    if (Test-Path $dir) {
        Write-Host "`n📁 Processing $dir..." -ForegroundColor Yellow
        
        $files = Get-ChildItem -Path $dir -Recurse -Include "*.ts", "*.tsx" | 
                 Where-Object { $_.FullName -notmatch "(node_modules|dist|build|test|constants)" }
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if (-not $content) { continue }
            
            $originalContent = $content
            $fileReplacements = 0
            $needsImport = $false
            
            # Apply each replacement pattern
            foreach ($pattern in $replacementPatterns) {
                $matches = [regex]::Matches($content, $pattern.Pattern)
                if ($matches.Count -gt 0) {
                    $content = [regex]::Replace($content, $pattern.Pattern, $pattern.Replacement)
                    $fileReplacements += $matches.Count
                    $needsImport = $true
                    
                    Write-Host "    • $($pattern.Description): $($matches.Count) replacements in $($file.Name)" -ForegroundColor Green
                }
            }
            
            # If we made changes, save the file and add import
            if ($fileReplacements -gt 0) {
                Set-Content $file.FullName $content -Encoding UTF8
                
                if ($needsImport) {
                    $importAdded = Add-ImportIfNeeded -FilePath $file.FullName
                    if ($importAdded) {
                        Write-Host "    ✓ Added business-thresholds import to $($file.Name)" -ForegroundColor Cyan
                    }
                }
                
                $modifiedFiles += $file.Name
                $totalReplacements += $fileReplacements
                
                Write-Host "    ✅ Modified $($file.Name) - $fileReplacements replacements" -ForegroundColor White
            }
        }
    }
}

Write-Host "`n📊 REPLACEMENT SUMMARY" -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Gray
Write-Host "Files modified: $($modifiedFiles.Count)" -ForegroundColor Yellow
Write-Host "Total replacements: $totalReplacements" -ForegroundColor Yellow

if ($modifiedFiles.Count -gt 0) {
    Write-Host "`n📝 Modified Files:" -ForegroundColor Cyan
    $modifiedFiles | Sort-Object -Unique | ForEach-Object {
        Write-Host "  • $_" -ForegroundColor White
    }
    
    Write-Host "`n💡 Next Steps:" -ForegroundColor Green
    Write-Host "1. Run TypeScript compilation to check for errors" -ForegroundColor White
    Write-Host "2. Test the modified functionality" -ForegroundColor White
    Write-Host "3. Commit the changes if everything works correctly" -ForegroundColor White
} else {
    Write-Host "`nNo files needed modification - patterns already optimized!" -ForegroundColor Green
}

Write-Host "`n✅ Business thresholds replacement completed!" -ForegroundColor Green