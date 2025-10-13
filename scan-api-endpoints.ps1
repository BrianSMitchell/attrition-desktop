# API Endpoints Hardcoded Constants Scanner
# Scans for common API endpoint patterns that could be replaced with constants

Write-Host "🔍 Scanning for hardcoded API endpoint strings..." -ForegroundColor Green

# Define API endpoint patterns to search for
$patterns = @(
    '"/api/[a-zA-Z0-9/_:-]+"',
    '"/v1/[a-zA-Z0-9/_:-]+"',
    '"/auth/[a-zA-Z0-9/_:-]+"',
    '"/game/[a-zA-Z0-9/_:-]+"',
    '"/admin/[a-zA-Z0-9/_:-]+"',
    '"/sync/[a-zA-Z0-9/_:-]+"',
    '"/messages/[a-zA-Z0-9/_:-]+"',
    '"/universe/[a-zA-Z0-9/_:-]+"'
)

# Directories to scan
$directories = @(
    "packages\client\src",
    "packages\server\src", 
    "packages\shared\src",
    "packages\desktop\src"
)

# Initialize results
$results = @()

foreach ($directory in $directories) {
    if (Test-Path $directory) {
        Write-Host "📁 Scanning directory: $directory" -ForegroundColor Cyan
        
        foreach ($pattern in $patterns) {
            $files = Get-ChildItem -Path $directory -Recurse -Include *.ts,*.tsx,*.js,*.jsx | Where-Object { $_.Name -notlike "*.test.*" -and $_.Name -notlike "*.spec.*" }
            
            foreach ($file in $files) {
                $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
                
                if ($content -match $pattern) {
                    $matches = [regex]::Matches($content, $pattern)
                    
                    foreach ($match in $matches) {
                        # Skip if it's already a constant reference
                        if ($match.Value -notmatch "API_ENDPOINTS|ERROR_MESSAGES") {
                            $lineNumber = ($content.Substring(0, $match.Index) | Measure-Object -Character -Line).Lines + 1
                            
                            $results += [PSCustomObject]@{
                                File = $file.FullName.Replace((Get-Location).Path + "\", "")
                                Line = $lineNumber
                                Pattern = $match.Value
                                Context = ($content.Split("`n")[$lineNumber - 1]).Trim()
                            }
                        }
                    }
                }
            }
        }
    }
}

# Group results by pattern for better analysis
$groupedResults = $results | Group-Object -Property Pattern | Sort-Object Count -Descending

Write-Host "`n📊 API ENDPOINTS SCAN RESULTS:" -ForegroundColor Yellow
Write-Host "Found $($results.Count) hardcoded API endpoint references" -ForegroundColor Yellow

Write-Host "`n🔥 Most Common Hardcoded Patterns:" -ForegroundColor Red
$groupedResults | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Name) - $($_.Count) occurrences" -ForegroundColor White
}

# Save detailed results
$outputFile = "api-endpoints-scan-results.json"
$results | ConvertTo-Json -Depth 3 | Set-Content $outputFile

Write-Host "`n💾 Detailed results saved to: $outputFile" -ForegroundColor Green

# Summary by file extension
Write-Host "`n📈 BREAKDOWN BY FILE TYPE:" -ForegroundColor Blue
$results | Group-Object { [IO.Path]::GetExtension((Split-Path $_.File -Leaf)) } | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  $($_.Name): $($_.Count) matches" -ForegroundColor White
}

Write-Host "`nAPI Endpoints scan completed!" -ForegroundColor Green
