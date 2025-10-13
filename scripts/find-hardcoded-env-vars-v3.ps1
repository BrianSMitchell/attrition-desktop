# Simple Environment Variable Scanner
# Scans TypeScript and JavaScript files for hardcoded process.env references

Write-Host "Scanning for hardcoded environment variable references..." -ForegroundColor Green
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
$envVarCounts = @{}
$fileResults = @()

# Process each directory
foreach ($dir in $searchDirs) {
    $fullPath = Join-Path $PWD $dir
    if (!(Test-Path $fullPath)) {
        Write-Host "Directory not found: $fullPath" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Scanning directory: $dir" -ForegroundColor Cyan
    
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
                
                # Look for process.env patterns
                if ($line -match "process\.env\.(\w+)") {
                    $matches = [regex]::Matches($line, "process\.env\.(\w+)")
                    
                    foreach ($match in $matches) {
                        $envVarName = $match.Groups[1].Value
                        $totalMatches++
                        
                        # Track counts
                        if ($envVarCounts.ContainsKey($envVarName)) {
                            $envVarCounts[$envVarName]++
                        } else {
                            $envVarCounts[$envVarName] = 1
                        }
                        
                        $fileMatches += @{
                            Line = $lineNumber
                            VarName = $envVarName
                            Content = $line.Trim()
                        }
                    }
                }
            }
            
            if ($fileMatches.Count -gt 0) {
                $fileResults += @{
                    File = $file.FullName.Replace($PWD, "").TrimStart('\')
                    Matches = $fileMatches
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
Write-Host "Total environment variable references: $totalMatches"
Write-Host ""

# Show top environment variables by usage
Write-Host "=== ENVIRONMENT VARIABLES BY USAGE ===" -ForegroundColor Yellow
$sortedEnvVars = $envVarCounts.GetEnumerator() | Sort-Object Value -Descending
foreach ($envVar in $sortedEnvVars) {
    Write-Host "  $($envVar.Name): $($envVar.Value) references" -ForegroundColor White
}

Write-Host ""
Write-Host "=== FILES WITH ENVIRONMENT VARIABLES ===" -ForegroundColor Yellow

foreach ($result in $fileResults) {
    Write-Host ""
    Write-Host "File: $($result.File)" -ForegroundColor Cyan
    foreach ($match in $result.Matches) {
        Write-Host "  Line $($match.Line): $($match.VarName)" -ForegroundColor White
        Write-Host "    $($match.Content)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Scan completed!" -ForegroundColor Green