# Enhanced String Constants Scanner
Write-Host "Enhanced String Constants Scanner"
Write-Host "================================="

# Categories to scan for
$categories = @{
    "Actions" = @("Save", "Cancel", "Submit", "Start", "Delete", "Create", "Edit", "Update", "Refresh")
    "Loading" = @("Loading", "Please wait", "Processing", "Initializing", "Connecting")
    "Status" = @("Online", "Offline", "Active", "Inactive", "Available", "Unavailable", "Pending", "Complete", "Success", "Error")
    "Navigation" = @("Home", "Back", "Next", "Dashboard", "Settings", "Profile", "Help", "Login", "Logout")
    "Validation" = @("Required", "Invalid", "Please enter", "Field is required")
    "Game" = @("Empire", "Fleet", "Building", "Research", "Credits", "Energy", "Level", "Construction")
}

$files = Get-ChildItem "packages\client\src" -Include "*.tsx" -Recurse
$results = @{}

foreach ($category in $categories.Keys) {
    $results[$category] = @{
        Count = 0
        Files = @()
    }
    
    foreach ($targetString in $categories[$category]) {
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if ($content -and ($content -match "`"[^`"]*$([regex]::Escape($targetString))[^`"]*`"")) {
                $results[$category].Count++
                if ($results[$category].Files -notcontains $file.Name) {
                    $results[$category].Files += $file.Name
                }
            }
        }
    }
}

# Display results
Write-Host ""
Write-Host "CATEGORY RESULTS:"
Write-Host "================"
foreach ($category in $categories.Keys) {
    if ($results[$category].Count -gt 0) {
        Write-Host "$category`: $($results[$category].Count) opportunities in $($results[$category].Files.Count) files"
    }
}

# Show priority order
Write-Host ""
Write-Host "PRIORITY ORDER (by opportunity count):"
Write-Host "======================================"
$sorted = $results.GetEnumerator() | Where-Object { $_.Value.Count -gt 0 } | Sort-Object { $_.Value.Count } -Descending
foreach ($item in $sorted) {
    Write-Host "$($item.Key)`: $($item.Value.Count) opportunities"
}