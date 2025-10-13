# Simple File Paths & URLs Scanner
Write-Host "File Paths & URLs Scanner" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""

$apiEndpoints = @()
$filePaths = @()
$urls = @()
$fileExtensions = @()

# Get all relevant files
$files = Get-ChildItem -Path "packages" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
         Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*" }

Write-Host "Scanning $($files.Count) files for paths and URLs..."
Write-Host ""

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if (!$content) { continue }
    
    $lines = $content -split "`n"
    
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        $lineNumber = $i + 1
        
        # Skip comments and imports
        if ($line -match "^\s*//|^\s*/\*|^\s*import|^\s*export.*from") {
            continue
        }
        
        # API Endpoints - look for /api/ patterns
        if ($line -match "/api/") {
            $pattern = "(['\"`])/api/[^'\"`]*(['\"`])"
            $matches = [regex]::Matches($line, $pattern)
            foreach ($match in $matches) {
                $endpoint = $match.Value.Trim("'", "`", '"')
                $apiEndpoints += @{
                    Path = $endpoint
                    File = $file.FullName.Replace($PWD, "").TrimStart('\')
                    Line = $lineNumber
                }
            }
        }
        
        # HTTP/HTTPS URLs
        if ($line -match "https?://") {
            $pattern = "https?://[^\s'\"`]+"
            $matches = [regex]::Matches($line, $pattern)
            foreach ($match in $matches) {
                $urls += @{
                    Path = $match.Value
                    File = $file.FullName.Replace($PWD, "").TrimStart('\')
                    Line = $lineNumber
                }
            }
        }
        
        # File extensions in quotes
        if ($line -match "'\.[a-zA-Z0-9]+'|`"\.[a-zA-Z0-9]+`"|`\.[a-zA-Z0-9]+`") {
            $pattern = "(['\"`])\.[a-zA-Z0-9]+\1"
            $matches = [regex]::Matches($line, $pattern)
            foreach ($match in $matches) {
                $ext = $match.Value.Trim("'", "`", '"')
                if ($ext.Length -le 6) {
                    $fileExtensions += @{
                        Path = $ext
                        File = $file.FullName.Replace($PWD, "").TrimStart('\')
                        Line = $lineNumber
                    }
                }
            }
        }
        
        # File paths with slashes or backslashes
        if ($line -match "['\"`][^'\"`]*[/\\][^'\"`]*['\"`]") {
            $pattern = "(['\"`])[^'\"`]*[/\\][^'\"`]*\1"
            $matches = [regex]::Matches($line, $pattern)
            foreach ($match in $matches) {
                $path = $match.Value.Trim("'", "`", '"')
                # Filter reasonable paths
                if ($path.Length -gt 2 -and $path.Length -lt 100 -and $path -notmatch "^https?://" -and $path -notmatch "^/api/") {
                    $filePaths += @{
                        Path = $path
                        File = $file.FullName.Replace($PWD, "").TrimStart('\')
                        Line = $lineNumber
                    }
                }
            }
        }
    }
}

# Display results
Write-Host "=== SCAN RESULTS ===" -ForegroundColor Yellow
Write-Host ""

if ($apiEndpoints.Count -gt 0) {
    Write-Host "API ENDPOINTS ($($apiEndpoints.Count) found):" -ForegroundColor Cyan
    $grouped = $apiEndpoints | Group-Object Path | Sort-Object Count -Descending | Select-Object -First 15
    foreach ($group in $grouped) {
        Write-Host "  $($group.Name): $($group.Count) references" -ForegroundColor White
    }
    Write-Host ""
}

if ($urls.Count -gt 0) {
    Write-Host "URLS ($($urls.Count) found):" -ForegroundColor Cyan
    $grouped = $urls | Group-Object Path | Sort-Object Count -Descending | Select-Object -First 10
    foreach ($group in $grouped) {
        Write-Host "  $($group.Name): $($group.Count) references" -ForegroundColor White
    }
    Write-Host ""
}

if ($fileExtensions.Count -gt 0) {
    Write-Host "FILE EXTENSIONS ($($fileExtensions.Count) found):" -ForegroundColor Cyan
    $grouped = $fileExtensions | Group-Object Path | Sort-Object Count -Descending | Select-Object -First 15
    foreach ($group in $grouped) {
        Write-Host "  $($group.Name): $($group.Count) references" -ForegroundColor White
    }
    Write-Host ""
}

if ($filePaths.Count -gt 0) {
    Write-Host "FILE PATHS ($($filePaths.Count) found):" -ForegroundColor Cyan
    $grouped = $filePaths | Group-Object Path | Sort-Object Count -Descending | Select-Object -First 20
    foreach ($group in $grouped) {
        Write-Host "  $($group.Name): $($group.Count) references" -ForegroundColor White
    }
    Write-Host ""
}

$totalFound = $apiEndpoints.Count + $urls.Count + $fileExtensions.Count + $filePaths.Count
Write-Host "Total paths/URLs found: $totalFound" -ForegroundColor Green
Write-Host ""
Write-Host "Scan completed!" -ForegroundColor Green