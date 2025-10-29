# Comprehensive String Constants Scanner
# Identifies various categories of hardcoded strings for centralization

Write-Host "🔍 Comprehensive String Constants Scanner" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Expanded categories to scan for
$stringCategories = @{
    "Actions" = @("Save", "Cancel", "Submit", "Start", "Stop", "Pause", "Resume", "Retry", "Refresh", "Update", "Delete", "Create", "Edit", "Copy", "Cut", "Paste")
    "Loading" = @("Loading", "Please wait", "Processing", "Initializing", "Connecting", "Syncing", "Uploading", "Downloading")
    "Status" = @("Online", "Offline", "Active", "Inactive", "Available", "Unavailable", "Pending", "Complete", "Failed", "Success", "Error")
    "Navigation" = @("Home", "Back", "Next", "Previous", "Dashboard", "Settings", "Profile", "Help", "About", "Login", "Logout")
    "Validation" = @("Required", "Invalid", "Valid", "Optional", "Must be", "Cannot be", "Please enter", "Please select", "Field is required")
    "Confirmation" = @("Are you sure", "Confirm", "Warning", "Notice", "Alert", "This action cannot be undone", "Do you want to", "Yes", "No")
    "Game Specific" = @("Empire", "Fleet", "Building", "Research", "Credits", "Energy", "Resources", "Level", "Upgrade", "Construction")
}

$files = Get-ChildItem "packages\client\src" -Include "*.tsx","*.ts" -Recurse | 
    Where-Object { $_.FullName -notmatch "node_modules|\.d\.ts|test|spec" }

$results = @()
$categoryStats = @{}

Write-Host "📁 Scanning $($files.Count) files for comprehensive string patterns..." -ForegroundColor Yellow
Write-Host ""

# Initialize category stats
foreach ($category in $stringCategories.Keys) {
    $categoryStats[$category] = @{
        TotalFound = 0
        FilesWithStrings = @()
    }
}

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
    $fileResults = @{
        File = $relativePath
        CategoriesFound = @{}
        TotalStrings = 0
    }
    
    # Check each category
    foreach ($category in $stringCategories.Keys) {
        $foundInCategory = @()
        
        foreach ($targetString in $stringCategories[$category]) {
            # Look for exact string matches in quotes
            if ($content -match "`"[^`"]*$([regex]::Escape($targetString))[^`"]*`"") {
                $foundInCategory += $targetString
                $categoryStats[$category].TotalFound++
            }
        }
        
        if ($foundInCategory.Count -gt 0) {
            $fileResults.CategoriesFound[$category] = $foundInCategory
            $fileResults.TotalStrings += $foundInCategory.Count
            
            if ($categoryStats[$category].FilesWithStrings -notcontains $relativePath) {
                $categoryStats[$category].FilesWithStrings += $relativePath
            }
        }
    }
    
    if ($fileResults.TotalStrings -gt 0) {
        $results += [PSCustomObject]$fileResults
    }
}

# Display Results by Category
Write-Host "📊 COMPREHENSIVE RESULTS BY CATEGORY:" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

foreach ($category in $stringCategories.Keys) {
    $stats = $categoryStats[$category]
    if ($stats.TotalFound -gt 0) {
        Write-Host ""
        Write-Host "📂 $category ($($stats.TotalFound) total occurrences):" -ForegroundColor Cyan
        Write-Host "   Files affected: $($stats.FilesWithStrings.Count)" -ForegroundColor White
        
        # Show top 3 files with most strings in this category
        $topFiles = $results | Where-Object { $_.CategoriesFound.ContainsKey($category) } | 
                    Sort-Object { $_.CategoriesFound[$category].Count } -Descending | 
                    Select-Object -First 3
        
        foreach ($topFile in $topFiles) {
            $stringsInCategory = $topFile.CategoriesFound[$category] -join ", "
            Write-Host "   • $($topFile.File): $stringsInCategory" -ForegroundColor Gray
        }
    }
}

# Overall Statistics
Write-Host ""
Write-Host "🎯 SUMMARY STATISTICS:" -ForegroundColor Magenta
Write-Host "=====================" -ForegroundColor Magenta
Write-Host "Total files with patterns: $($results.Count)" -ForegroundColor White
Write-Host "Total string opportunities: $(($results | Measure-Object -Property TotalStrings -Sum).Sum)" -ForegroundColor White

$totalCategories = ($categoryStats.Values | Where-Object { $_.TotalFound -gt 0 }).Count
Write-Host "Active categories: $totalCategories / $($stringCategories.Count)" -ForegroundColor White

# Recommendations
Write-Host ""
Write-Host "💡 PRIORITY RECOMMENDATIONS:" -ForegroundColor Magenta
Write-Host "============================" -ForegroundColor Magenta

$priorityCategories = $categoryStats.GetEnumerator() | 
                     Where-Object { $_.Value.TotalFound -gt 0 } |
                     Sort-Object { $_.Value.TotalFound } -Descending |
                     Select-Object -First 5

Write-Host "1. Focus on these categories for maximum impact:" -ForegroundColor White
foreach ($priority in $priorityCategories) {
    Write-Host "   • $($priority.Key): $($priority.Value.TotalFound) opportunities" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "2. Add these constants to string-constants.ts:" -ForegroundColor White
foreach ($priority in $priorityCategories) {
    $categoryName = $priority.Key.ToUpper() + "_TEXT"
    Write-Host "   export const $categoryName = { ... };" -ForegroundColor Gray
}

Write-Host ""
Write-Host "3. Top files to process next:" -ForegroundColor White
$topFiles = $results | Sort-Object TotalStrings -Descending | Select-Object -First 5
foreach ($file in $topFiles) {
    Write-Host "   • $($file.File) ($($file.TotalStrings) opportunities)" -ForegroundColor Cyan
}