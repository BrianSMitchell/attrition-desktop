# File Paths & URLs Scanner
# Scans TypeScript and JavaScript files for hardcoded file paths, URLs, and related constants

Write-Host "File Paths & URLs Scanner" -ForegroundColor Green
Write-Host "=========================" -ForegroundColor Green
Write-Host ""

# Define search directories
$searchDirs = @(
    "packages\server\src",
    "packages\client\src", 
    "packages\shared\src",
    "scripts"
)

# Common file extensions to scan
$extensions = @("*.ts", "*.tsx", "*.js", "*.jsx")

# Files to exclude
$excludePatterns = @(
    "*node_modules*",
    "*dist*",
    "*build*",
    "*.d.ts",
    "*coverage*",
    "*.min.js"
)

# Results tracking
$totalFiles = 0
$totalMatches = 0
$pathResults = @{
    "API_ENDPOINTS" = @()
    "FILE_PATHS" = @()
    "DIRECTORY_PATHS" = @()
    "FILE_EXTENSIONS" = @()
    "URLS_DOMAINS" = @()
    "ROUTE_PATHS" = @()
}

$fileResults = @()

Write-Host "Scanning for hardcoded file paths and URLs..." -ForegroundColor Cyan
Write-Host ""

# Process each directory
foreach ($dir in $searchDirs) {
    $fullPath = Join-Path $PWD $dir
    if (!(Test-Path $fullPath)) {
        Write-Host "Directory not found: $fullPath" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Scanning directory: $dir" -ForegroundColor Yellow
    
    # Get all files
    $files = @()
    foreach ($ext in $extensions) {
        $files += Get-ChildItem -Path $fullPath -Filter $ext -Recurse -File
    }
    
    # Filter out excluded files
    $filteredFiles = $files | Where-Object {
        $filePath = $_.FullName
        $shouldExclude = $false
        foreach ($pattern in $excludePatterns) {
            if ($filePath -like $pattern) {
                $shouldExclude = $true
                break
            }
        }
        return !$shouldExclude
    }
    
    $totalFiles += $filteredFiles.Count
    Write-Host "  Found $($filteredFiles.Count) files to scan"
    
    # Scan each file
    foreach ($file in $filteredFiles) {
        try {
            $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
            if (!$content) { continue }
            
            $lines = $content -split "`n"
            $fileMatches = @()
            
            for ($i = 0; $i -lt $lines.Count; $i++) {
                $line = $lines[$i]
                $lineNumber = $i + 1
                
                # Skip comments and imports
                $trimmedLine = $line.Trim()
                if ($trimmedLine -match "^//|^/\*|\*/|^import|^export.*from") {
                    continue
                }
                
                # API Endpoints - /api/... patterns
                if ($line -match "['`\"]\/api\/[^'`\"]*['`\"]") {
                    $matches = [regex]::Matches($line, "(['`\"])\/api\/[^'`\"]*\1")
                    foreach ($match in $matches) {
                        $endpoint = $match.Value.Trim("'", "`"", '"')
                        $pathResults.API_ENDPOINTS += @{
                            Path = $endpoint
                            File = $file.FullName.Replace($PWD, "").TrimStart('\')
                            Line = $lineNumber
                            Context = $line.Trim()
                        }
                        $totalMatches++
                    }
                }
                
                # HTTP/HTTPS URLs
                if ($line -match "https?://[^\s'`\"]+") {
                    $matches = [regex]::Matches($line, "https?://[^\s'`\"]+")
                    foreach ($match in $matches) {
                        $url = $match.Value
                        $pathResults.URLS_DOMAINS += @{
                            Path = $url
                            File = $file.FullName.Replace($PWD, "").TrimStart('\')
                            Line = $lineNumber
                            Context = $line.Trim()
                        }
                        $totalMatches++
                    }
                }
                
                # File extensions - .ext patterns in strings
                if ($line -match "['`\"]\.[a-zA-Z0-9]+['`\"]") {
                    $matches = [regex]::Matches($line, "(['`\""])\.[a-zA-Z0-9]+\1")
                    foreach ($match in $matches) {
                        $ext = $match.Value.Trim("'", "`"", '"')
                        if ($ext.Length -le 6) { # Reasonable extension length
                            $pathResults.FILE_EXTENSIONS += @{
                                Path = $ext
                                File = $file.FullName.Replace($PWD, "").TrimStart('\')
                                Line = $lineNumber
                                Context = $line.Trim()
                            }
                            $totalMatches++
                        }
                    }
                }
                
                # Directory paths - paths with slashes
                if ($line -match "['`\"][^'`\"]*[/\\][^'`\"]*['`\"]") {
                    $matches = [regex]::Matches($line, "(['`\""])[^'`\"]*[/\\][^'`\"]*\1")
                    foreach ($match in $matches) {
                        $path = $match.Value.Trim("'", "`"", '"')
                        # Filter out obvious non-paths
                        if ($path -notmatch "^https?://" -and $path -notmatch "^/api/" -and $path.Length -gt 2 -and $path.Length -lt 100) {
                            $category = if ($path -match "\.") { "FILE_PATHS" } else { "DIRECTORY_PATHS" }
                            $pathResults[$category] += @{
                                Path = $path
                                File = $file.FullName.Replace($PWD, "").TrimStart('\')
                                Line = $lineNumber
                                Context = $line.Trim()
                            }
                            $totalMatches++
                        }
                    }
                }
                
                # Route paths - React Router or Express routes
                if ($line -match "path\s*[:=]\s*['`\"][^'`\"]+['`\"]") {
                    $matches = [regex]::Matches($line, "path\s*[:=]\s*(['`\""])[^'`\"]*\1")
                    foreach ($match in $matches) {
                        $pathValue = $match.Value -replace "path\s*[:=]\s*", ""
                        $route = $pathValue.Trim("'", "`"", '"')
                        $pathResults.ROUTE_PATHS += @{
                            Path = $route
                            File = $file.FullName.Replace($PWD, "").TrimStart('\')
                            Line = $lineNumber
                            Context = $line.Trim()
                        }
                        $totalMatches++
                    }
                }
            }
            
        } catch {
            Write-Host "  Error reading file: $($file.Name) - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== SCAN RESULTS ===" -ForegroundColor Yellow
Write-Host "Total files scanned: $totalFiles"
Write-Host "Total path/URL references found: $totalMatches"
Write-Host ""

# Show results by category
foreach ($category in $pathResults.Keys) {
    $items = $pathResults[$category]
    if ($items.Count -gt 0) {
        Write-Host "$category ($($items.Count) found):" -ForegroundColor Cyan
        
        # Group by path and show unique paths with counts
        $grouped = $items | Group-Object Path | Sort-Object Count -Descending
        $showCount = [Math]::Min(20, $grouped.Count)
        
        for ($i = 0; $i -lt $showCount; $i++) {
            $group = $grouped[$i]
            Write-Host "  $($group.Name): $($group.Count) references" -ForegroundColor White
            
            # Show first few file locations
            $locations = $group.Group | Select-Object -First 3
            foreach ($location in $locations) {
                $shortFile = Split-Path $location.File -Leaf
                Write-Host "    $shortFile:$($location.Line)" -ForegroundColor Gray
            }
            if ($group.Count -gt 3) {
                Write-Host "    ... and $($group.Count - 3) more" -ForegroundColor Gray
            }
        }
        
        if ($grouped.Count -gt $showCount) {
            Write-Host "  ... and $($grouped.Count - $showCount) more unique paths" -ForegroundColor Gray
        }
        Write-Host ""
    }
}

Write-Host "File paths and URLs scan completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Review the results above to understand path usage patterns" -ForegroundColor White
Write-Host "2. Create centralized constants for commonly used paths" -ForegroundColor White
Write-Host "3. Run replacement scripts to standardize path usage" -ForegroundColor White