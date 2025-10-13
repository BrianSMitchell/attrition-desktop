Write-Host "Scanning for hardcoded error messages..." -ForegroundColor Green

# Simple patterns without complex regex
$patterns = @(
    '"Failed to',
    '"Cannot',
    '"Unable to',
    '"Invalid',
    '"Missing',
    '"Not found',
    '"Unauthorized',
    '"Authentication required',
    '"Token expired',
    '"Access denied',
    '"Database error',
    '"Connection error',
    '"Network error'
)

$directories = @(
    "packages\server\src",
    "packages\client\src"
)

$results = @()
$totalMatches = 0

foreach ($directory in $directories) {
    if (Test-Path $directory) {
        Write-Host "Scanning: $directory" -ForegroundColor Cyan
        
        $files = Get-ChildItem -Path $directory -Recurse -Include *.ts,*.tsx,*.js,*.jsx | Where-Object { 
            $_.Name -notlike "*constants*" -and 
            $_.Name -notlike "*response-formats*"
        }
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            
            if ($content) {
                foreach ($pattern in $patterns) {
                    if ($content -match [regex]::Escape($pattern)) {
                        $matches = [regex]::Matches($content, [regex]::Escape($pattern))
                        foreach ($match in $matches) {
                            $results += [PSCustomObject]@{
                                File = $file.FullName.Replace((Get-Location).Path + "\", "")
                                Pattern = $pattern
                                Position = $match.Index
                            }
                            $totalMatches++
                        }
                    }
                }
            }
        }
    }
}

Write-Host "Found $totalMatches hardcoded error messages" -ForegroundColor Yellow

# Group by pattern
$grouped = $results | Group-Object -Property Pattern | Sort-Object Count -Descending
Write-Host "Most common patterns:" -ForegroundColor Blue
$grouped | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Name) - $($_.Count) times" -ForegroundColor White
}

Write-Host "Scan completed!" -ForegroundColor Green