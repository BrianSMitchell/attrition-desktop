# API Endpoints Hardcoded Constants Scanner
Write-Host "Scanning for hardcoded API endpoint strings..." -ForegroundColor Green

# Define patterns 
$patterns = @(
    '"/api/[a-zA-Z0-9/_:-]+"',
    '"/v1/[a-zA-Z0-9/_:-]+"'
)

# Directories to scan
$directories = @(
    "packages\client\src",
    "packages\server\src"
)

$results = @()

foreach ($directory in $directories) {
    if (Test-Path $directory) {
        Write-Host "Scanning directory: $directory" -ForegroundColor Cyan
        
        $files = Get-ChildItem -Path $directory -Recurse -Include *.ts,*.tsx,*.js,*.jsx
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            
            if ($content) {
                foreach ($pattern in $patterns) {
                    if ($content -match $pattern) {
                        $matches = [regex]::Matches($content, $pattern)
                        
                        foreach ($match in $matches) {
                            $results += [PSCustomObject]@{
                                File = $file.FullName.Replace((Get-Location).Path + "\", "")
                                Pattern = $match.Value
                            }
                        }
                    }
                }
            }
        }
    }
}

Write-Host "Found $($results.Count) hardcoded API endpoint references" -ForegroundColor Yellow

# Group by pattern
$grouped = $results | Group-Object -Property Pattern | Sort-Object Count -Descending
$grouped | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Name) - $($_.Count) times" -ForegroundColor White
}

Write-Host "Scan completed!" -ForegroundColor Green