# BasePage.tsx Focused String Scanner
Write-Host "BasePage.tsx String Analysis" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan

$targetFile = "packages\client\src\components\game\BasePage.tsx"

if (-not (Test-Path $targetFile)) {
    Write-Host "ERROR: File not found: $targetFile" -ForegroundColor Red
    exit 1
}

$content = Get-Content $targetFile -Raw
Write-Host "Analyzing file: $targetFile" -ForegroundColor Green
Write-Host ""

# Categories and their target strings based on our scan results
$categories = @{
    "LOADING_MESSAGES" = @("Loading")
    "STATUS_TEXT" = @("Active", "Error", "Online", "Offline")  
    "GAME_TEXT" = @("Fleet", "Building", "Research", "Credits", "Energy", "Empire")
    "BUTTON_TEXT" = @("Save", "Cancel", "Submit", "Edit", "Delete")
}

$totalFound = 0
$replacements = @()

Write-Host "STRING ANALYSIS BY CATEGORY:" -ForegroundColor Yellow
Write-Host "===============================" -ForegroundColor Yellow

foreach ($category in $categories.Keys) {
    $categoryFound = 0
    $categoryReplacements = @()
    
    foreach ($targetString in $categories[$category]) {
        # Find all exact matches in quotes
        $pattern = "`"[^`"]*$([regex]::Escape($targetString))[^`"]*`""
        $matches = [regex]::Matches($content, $pattern)
        
        if ($matches.Count -gt 0) {
            foreach ($match in $matches) {
                $categoryFound++
                $totalFound++
                
                # Extract the full quoted string
                $fullString = $match.Value
                
                # Create replacement suggestion
                $constantName = $targetString.ToUpper()
                $replacement = [PSCustomObject]@{
                    Original = $fullString
                    Constant = "$category.$constantName"
                    LineNumber = "TBD"  # Would need more complex parsing for exact line
                }
                
                $categoryReplacements += $replacement
                $replacements += $replacement
            }
        }
    }
    
    if ($categoryFound -gt 0) {
        Write-Host ""
        Write-Host "$category ($categoryFound found):" -ForegroundColor Cyan
        foreach ($replacement in $categoryReplacements) {
            Write-Host "   $($replacement.Original) → {$($replacement.Constant)}" -ForegroundColor White
        }
    }
}

Write-Host ""
Write-Host "IMPLEMENTATION PLAN FOR BASEPAGE.TSX:" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta

if ($totalFound -gt 0) {
    # Generate the import statement needed
    $neededImports = $categories.Keys | Where-Object { 
        $category = $_
        ($categories[$category] | ForEach-Object { 
            $pattern = "`"[^`"]*$([regex]::Escape($_))[^`"]*`""
            ([regex]::Matches($content, $pattern)).Count -gt 0 
        }) -contains $true
    }
    
    Write-Host ""
    Write-Host "1. ADD IMPORT STATEMENT:" -ForegroundColor Green
    $importLine = "import { " + ($neededImports -join ", ") + " } from '@shared/constants/string-constants';"
    Write-Host "   $importLine" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "2. REPLACE STRINGS (one at a time):" -ForegroundColor Green
    $priorityOrder = $replacements | Sort-Object { $_.Original.Length } -Descending
    for ($i = 0; $i -lt [Math]::Min(10, $priorityOrder.Count); $i++) {
        $replacement = $priorityOrder[$i]
        Write-Host "   Step $($i + 1): $($replacement.Original) → {$($replacement.Constant)}" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "3. VALIDATION STEPS:" -ForegroundColor Green
    Write-Host "   - Run: npm run build" -ForegroundColor Gray
    Write-Host "   - Test component rendering" -ForegroundColor Gray
    Write-Host "   - Check for TypeScript errors" -ForegroundColor Gray
    
    Write-Host ""
    Write-Host "EXPECTED IMPACT:" -ForegroundColor Magenta
    Write-Host "Total strings to replace: $totalFound" -ForegroundColor White
    Write-Host "Categories involved: $($neededImports.Count)" -ForegroundColor White
    Write-Host "Estimated time: $([Math]::Ceiling($totalFound / 5)) minutes (replacing 1 every ~30 seconds)" -ForegroundColor White
    
} else {
    Write-Host "No target strings found - file may already be migrated!" -ForegroundColor Green
}

Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Magenta
Write-Host "===========" -ForegroundColor Magenta
Write-Host "1. Open BasePage.tsx in your editor" -ForegroundColor White
Write-Host "2. Add the import statement shown above" -ForegroundColor White  
Write-Host "3. Replace strings one by one, testing after each" -ForegroundColor White
Write-Host "4. Update STRING_MIGRATION_GUIDE.md when complete" -ForegroundColor White