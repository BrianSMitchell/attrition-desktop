# File-Specific String Usage Scanner
Write-Host "File-Specific String Usage Analysis"
Write-Host "==================================="

$targetStrings = @(
    "Loading", "Please wait", "Processing", "Save", "Cancel", "Submit", 
    "Online", "Offline", "Active", "Inactive", "Success", "Error",
    "Home", "Dashboard", "Settings", "Profile", "Help",
    "Empire", "Fleet", "Building", "Research", "Credits", "Energy"
)

$files = Get-ChildItem "packages\client\src" -Include "*.tsx" -Recurse
$fileResults = @()

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
    if (-not $content) { continue }
    
    $stringCount = 0
    $foundStrings = @()
    
    foreach ($targetString in $targetStrings) {
        $matches = [regex]::Matches($content, "`"[^`"]*$([regex]::Escape($targetString))[^`"]*`"")
        if ($matches.Count -gt 0) {
            $stringCount += $matches.Count
            $foundStrings += "$targetString ($($matches.Count))"
        }
    }
    
    if ($stringCount -gt 0) {
        $fileResults += [PSCustomObject]@{
            File = $file.Name
            Count = $stringCount
            Strings = $foundStrings -join ", "
            Path = $file.FullName.Replace((Get-Location).Path + "\", "")
        }
    }
}

# Sort by count and display top files
$topFiles = $fileResults | Sort-Object Count -Descending | Select-Object -First 15

Write-Host ""
Write-Host "TOP 15 FILES WITH MOST STRING OPPORTUNITIES:"
Write-Host "============================================"
foreach ($fileResult in $topFiles) {
    Write-Host "$($fileResult.File): $($fileResult.Count) opportunities" -ForegroundColor Cyan
    Write-Host "  Path: $($fileResult.Path)" -ForegroundColor Gray
    Write-Host "  Found: $($fileResult.Strings)" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Write-Host "SUMMARY:"
Write-Host "========"
Write-Host "Total files with strings: $($fileResults.Count)"
Write-Host "Total opportunities: $(($fileResults | Measure-Object -Property Count -Sum).Sum)"