Write-Host "String Constants Scanner"
Write-Host "========================"

$targetStrings = @("Loading", "Save", "Cancel", "Submit", "Start", "Error", "Success")
$files = Get-ChildItem "packages\client\src" -Include "*.tsx" -Recurse

$results = @()
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $found = 0
    foreach ($str in $targetStrings) {
        if ($content -match "`"$str`"") { $found++ }
    }
    if ($found -gt 0) {
        $results += [PSCustomObject]@{ File = $file.Name; Count = $found }
    }
}

Write-Host "Files with hardcoded strings: $($results.Count)"
$results | Sort-Object Count -Descending | Select-Object -First 5