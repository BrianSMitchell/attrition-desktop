# String Constants Validation Script
# Scans for hardcoded strings that should be replaced with constants

param(
    [string]$Path = "packages\client\src",
    [switch]$ShowConstants,
    [switch]$ShowMissed,
    [switch]$Summary,
    [string]$FilePattern = "*.tsx,*.ts"
)

Write-Host "🔍 String Constants Validation Script" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Define expected constants from our string-constants.ts file
$Constants = @{
    "LOADING_MESSAGES" = @("Loading...", "Loading data...", "Attrition")
    "BUTTON_TEXT" = @("Save", "Cancel", "Submit", "Start", "Refresh")
    "FORM_LABELS" = @("Username", "Password", "Email")
    "FORM_PLACEHOLDERS" = @("Enter username", "Enter password", "Enter email")
    "ERROR_TEXT" = @("Error", "Network error", "Validation error")
    "SUCCESS_TEXT" = @("Success", "Saved", "Updated")
    "DISPLAY_TEXT" = @("Online", "Offline", "Unavailable")
    "GAME_TEXT" = @("Credits", "Energy", "Construction")
    "STATUS_MESSAGES" = @("Pending", "Active", "Completed")
}

# Get all files to scan
$files = Get-ChildItem -Path $Path -Include $FilePattern.Split(',') -Recurse | Where-Object { 
    $_.FullName -notmatch "node_modules" -and 
    $_.FullName -notmatch "\.d\.ts$" -and
    $_.FullName -notmatch "test|spec" 
}

$results = @{
    FilesScanned = 0
    TotalStrings = 0
    ConstantsFound = 0
    MissedOpportunities = @()
    FilesUsingConstants = @()
    TopOffenders = @()
}

Write-Host "📁 Scanning $($files.Count) files in $Path" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $files) {
    $results.FilesScanned++
    $content = Get-Content $file.FullName -Raw
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
    
    $fileResults = @{
        Path = $relativePath
        MissedStrings = @()
        ConstantUsage = @()
        HardcodedCount = 0
    }
    
    # Check for constant usage
    foreach ($constantType in $Constants.Keys) {
        if ($content -match "$constantType\.") {
            $matches = [regex]::Matches($content, "$constantType\.(\w+)")
            foreach ($match in $matches) {
                $fileResults.ConstantUsage += "$constantType.$($match.Groups[1].Value)"
                $results.ConstantsFound++
            }
        }
    }
    
    # Look for hardcoded strings that should be constants
    $stringMatches = [regex]::Matches($content, '"([^"]{3,})"')
    foreach ($match in $stringMatches) {
        $stringValue = $match.Groups[1].Value
        $results.TotalStrings++
        
        # Skip technical strings (imports, URLs, etc.)
        if ($stringValue -match '^(https?://|\.\/|\.\.\/|[a-z-]+\.[a-z]+|[a-z]+\/[a-z])' -or
            $stringValue -match '^(import|export|from|className|data-)' -or
            $stringValue.Length -gt 50) {
            continue
        }
        
        # Check if this string should be a constant
        foreach ($constantType in $Constants.Keys) {
            foreach ($expectedString in $Constants[$constantType]) {
                if ($stringValue -eq $expectedString -or $stringValue -like "*$expectedString*") {
                    $fileResults.MissedStrings += @{
                        String = $stringValue
                        Line = ($content.Substring(0, $match.Index) -split "`n").Count
                        SuggestedConstant = "$constantType.$($expectedString.ToUpper().Replace(' ', '_').Replace('.', ''))"
                    }
                    $fileResults.HardcodedCount++
                }
            }
        }
    }
    
    if ($fileResults.ConstantUsage.Count -gt 0) {
        $results.FilesUsingConstants += $fileResults
    }
    
    if ($fileResults.HardcodedCount -gt 0) {
        $results.MissedOpportunities += $fileResults
        $results.TopOffenders += @{
            Path = $relativePath
            Count = $fileResults.HardcodedCount
        }
    }
}

# Sort top offenders
$results.TopOffenders = $results.TopOffenders | Sort-Object Count -Descending | Select-Object -First 10

# Display Results
Write-Host "📊 SUMMARY REPORT" -ForegroundColor Green
Write-Host "=================" -ForegroundColor Green
Write-Host "Files Scanned: $($results.FilesScanned)" -ForegroundColor White
Write-Host "Total Strings Found: $($results.TotalStrings)" -ForegroundColor White
Write-Host "Constants Already Used: $($results.ConstantsFound)" -ForegroundColor Green
Write-Host "Files Using Constants: $($results.FilesUsingConstants.Count)" -ForegroundColor Green
Write-Host "Files with Missed Opportunities: $($results.MissedOpportunities.Count)" -ForegroundColor Yellow
Write-Host ""

if ($ShowConstants -or $Summary) {
    Write-Host "✅ FILES USING CONSTANTS:" -ForegroundColor Green
    Write-Host "========================" -ForegroundColor Green
    foreach ($file in $results.FilesUsingConstants) {
        Write-Host "📄 $($file.Path)" -ForegroundColor Cyan
        foreach ($constant in $file.ConstantUsage) {
            Write-Host "   ✓ $constant" -ForegroundColor Green
        }
        Write-Host ""
    }
}

if ($ShowMissed -or $Summary) {
    Write-Host "⚠️  TOP FILES WITH MISSED OPPORTUNITIES:" -ForegroundColor Yellow
    Write-Host "=======================================" -ForegroundColor Yellow
    foreach ($offender in $results.TopOffenders) {
        Write-Host "📄 $($offender.Path) ($($offender.Count) hardcoded strings)" -ForegroundColor Red
    }
    Write-Host ""
    
    Write-Host "💡 SPECIFIC REPLACEMENT OPPORTUNITIES:" -ForegroundColor Yellow
    Write-Host "====================================" -ForegroundColor Yellow
    $topMissed = $results.MissedOpportunities | Sort-Object { $_.HardcodedCount } -Descending | Select-Object -First 5
    foreach ($file in $topMissed) {
        Write-Host "📄 $($file.Path)" -ForegroundColor Cyan
        foreach ($missed in $file.MissedStrings) {
            Write-Host "   Line $($missed.Line): `"$($missed.String)`" → $($missed.SuggestedConstant)" -ForegroundColor Yellow
        }
        Write-Host ""
    }
}

# Recommendations
Write-Host "🎯 RECOMMENDATIONS:" -ForegroundColor Magenta
Write-Host "==================" -ForegroundColor Magenta
Write-Host "1. Start with these high-impact files:" -ForegroundColor White
$results.TopOffenders | Select-Object -First 3 | ForEach-Object {
    Write-Host "   • $($_.Path) ($($_.Count) opportunities)" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "2. Import the string constants in these files:" -ForegroundColor White
Write-Host "   import { BUTTON_TEXT, LOADING_MESSAGES, ERROR_TEXT } from '@game/shared';" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Replace hardcoded strings with constants using Find & Replace in your editor" -ForegroundColor White
Write-Host ""

# Quick stats
$adoptionRate = if ($results.TotalStrings -gt 0) { [math]::Round(($results.ConstantsFound / $results.TotalStrings) * 100, 1) } else { 0 }
Write-Host "📈 Current Adoption Rate: $adoptionRate%" -ForegroundColor $(if ($adoptionRate -gt 50) { "Green" } elseif ($adoptionRate -gt 25) { "Yellow" } else { "Red" })
Write-Host ""

if ($results.MissedOpportunities.Count -eq 0) {
    Write-Host "🎉 Congratulations! No obvious hardcoded strings found that should be constants." -ForegroundColor Green
} else {
    Write-Host "🚀 Next Step: Focus on the top $($results.TopOffenders.Count) files to maximize impact!" -ForegroundColor Cyan
}
}