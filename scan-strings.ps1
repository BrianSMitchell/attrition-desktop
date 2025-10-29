# Simple String Constants Scanner
# Identifies hardcoded strings that should be replaced with constants

Write-Host "🔍 String Constants Scanner" -ForegroundColor Cyan
Write-Host "===========================" -ForegroundColor Cyan

$targetStrings = @(
    "Loading...", "Loading", "Save", "Cancel", "Submit", "Start", "Refresh",
    "Username", "Password", "Email", "Error", "Success", "Online", "Offline", 
    "Unavailable", "Credits", "Energy", "Construction", "Pending", "Active", "Completed"
)

$files = Get-ChildItem "packages\client\src" -Include "*.tsx","*.ts" -Recurse | 
    Where-Object { $_.FullName -notmatch "node_modules|\.d\.ts|test|spec" }

$results = @()
$totalFound = 0

Write-Host "📁 Scanning $($files.Count) files..." -ForegroundColor Yellow

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $relativePath = $file.FullName.Replace((Get-Location).Path + "\", "")
    $found = @()
    
    foreach ($targetString in $targetStrings) {
        if ($content -match "`"$targetString`"") {
            $found += $targetString
            $totalFound++
        }
    }
    
    if ($found.Count -gt 0) {
        $results += [PSCustomObject]@{
            File = $relativePath
            Count = $found.Count
            Strings = $found -join ", "
        }
    }
}

Write-Host ""
Write-Host "📊 RESULTS:" -ForegroundColor Green
Write-Host "Total files with hardcoded strings: $($results.Count)" -ForegroundColor White
Write-Host "Total hardcoded string instances: $totalFound" -ForegroundColor White
Write-Host ""

if ($results.Count -gt 0) {
    Write-Host "🎯 TOP FILES TO FIX:" -ForegroundColor Yellow
    $results | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
        Write-Host "📄 $($_.File) ($($_.Count) strings)" -ForegroundColor Cyan
        Write-Host "   Strings: $($_.Strings)" -ForegroundColor Gray
        Write-Host ""
    }
    
    Write-Host "💡 RECOMMENDATIONS:" -ForegroundColor Magenta
    Write-Host "1. Add string constants import: import { LOADING_MESSAGES, BUTTON_TEXT } from '@game/shared';" -ForegroundColor White
    Write-Host "2. Replace strings like 'Loading...' with LOADING_MESSAGES.DEFAULT" -ForegroundColor White
    Write-Host "3. Use {BUTTON_TEXT.SAVE} instead of 'Save' in JSX" -ForegroundColor White
} else {
    Write-Host "🎉 No hardcoded strings found!" -ForegroundColor Green
}