# Focused Source Code Constants Scanner
# Only scans actual source code (no node_modules, build artifacts, etc.)

Write-Host "=== Source Code Constants Scanner ===" -ForegroundColor Cyan
Write-Host "Scanning only source code for hardcoded constants..." -ForegroundColor Yellow

$results = @{
    timeouts = @()
    magicNumbers = @()
    configKeys = @()
    environmentValues = @()
}

# Define source directories to scan (exclude everything else)
$sourceDirs = @(
    "C:\Projects\Attrition\packages\client\src",
    "C:\Projects\Attrition\packages\server\src", 
    "C:\Projects\Attrition\packages\shared\src"
)

Write-Host "`nScanning directories:" -ForegroundColor Green
$sourceDirs | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

function Get-SafeFileContent {
    param([string]$filePath)
    try {
        return Get-Content -Path $filePath -Raw -ErrorAction Stop
    }
    catch {
        return ""
    }
}

# Known constants values to look for
$knownTimeouts = @(100, 200, 500, 1000, 2000, 3000, 5000, 10000, 15000, 30000, 60000)
$knownMagicNumbers = @(3, 5, 10, 25, 50, 75, 100, 750, 1000, 3000, 8000, 8080)
$knownPorts = @(80, 443, 3000, 3001, 8000, 8080)

foreach ($sourceDir in $sourceDirs) {
    if (-not (Test-Path $sourceDir)) {
        Write-Host "Skipping non-existent directory: $sourceDir" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "`nScanning: $sourceDir" -ForegroundColor Cyan
    
    Get-ChildItem -Path $sourceDir -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | ForEach-Object {
        $content = Get-SafeFileContent $_.FullName
        if (-not $content) { return }
        
        $relativePath = $_.FullName.Replace("C:\Projects\Attrition\", "")
        
        # Skip constants files (we don't want to scan our own constants)
        if ($_.Name -match "constants|magic-numbers|configuration-keys") {
            return
        }
        
        # 1. Scan for setTimeout/setInterval values
        $timeoutMatches = [regex]::Matches($content, 'set(?:Timeout|Interval)\s*\([^,]+,\s*(\d+)', 'IgnoreCase')
        foreach ($match in $timeoutMatches) {
            $value = $match.Groups[1].Value
            if ($value -match '^\d+$' -and [int]$value -in $knownTimeouts) {
                $results.timeouts += @{
                    file = $relativePath
                    line = ($content.Substring(0, $match.Index) -split "`n").Count
                    value = [int]$value
                    context = $match.Value
                }
            }
        }
        
        # 2. Scan for hardcoded numbers in common patterns
        $numberPatterns = @(
            'retry.*?(\d+)',
            'attempt.*?(\d+)', 
            'max.*?(\d+)',
            'limit.*?(\d+)',
            'port.*?(\d+)',
            'timeout.*?(\d+)'
        )
        
        foreach ($pattern in $numberPatterns) {
            $matches = [regex]::Matches($content, $pattern, 'IgnoreCase')
            foreach ($match in $matches) {
                $value = $match.Groups[1].Value
                if ($value -match '^\d+$') {
                    $numValue = [int]$value
                    if ($numValue -in $knownMagicNumbers -or $numValue -in $knownPorts) {
                        $results.magicNumbers += @{
                            file = $relativePath
                            line = ($content.Substring(0, $match.Index) -split "`n").Count
                            value = $numValue
                            context = $match.Value
                            pattern = $pattern
                        }
                    }
                }
            }
        }
        
        # 3. Scan for environment/configuration patterns
        $configPatterns = @(
            'process\.env\.',
            'NODE_ENV',
            'localStorage\.',
            'sessionStorage\.',
            '"development"',
            '"production"',
            '"test"'
        )
        
        foreach ($pattern in $configPatterns) {
            $matches = [regex]::Matches($content, $pattern, 'IgnoreCase')
            foreach ($match in $matches) {
                $results.configKeys += @{
                    file = $relativePath
                    line = ($content.Substring(0, $match.Index) -split "`n").Count
                    pattern = $pattern
                    context = $match.Value
                }
            }
        }
        
        # 4. Scan for hardcoded environment values
        $envMatches = [regex]::Matches($content, '\b(development|production|test|staging)\b', 'IgnoreCase')
        foreach ($match in $envMatches) {
            $results.environmentValues += @{
                file = $relativePath
                line = ($content.Substring(0, $match.Index) -split "`n").Count
                value = $match.Value.ToLower()
                context = $match.Value
            }
        }
    }
}

# Results Summary
Write-Host "`n=== SCAN RESULTS ===" -ForegroundColor Cyan

Write-Host "`nTimeout Values Found: $($results.timeouts.Count)" -ForegroundColor Yellow
$results.timeouts | Group-Object -Property value | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  ${$_.Name}ms - $($_.Count) occurrences" -ForegroundColor White
    $_.Group | Select-Object -First 3 | ForEach-Object {
        Write-Host "    $($_.file):$($_.line)" -ForegroundColor Gray
    }
}

Write-Host "`nMagic Numbers Found: $($results.magicNumbers.Count)" -ForegroundColor Yellow
$results.magicNumbers | Group-Object -Property value | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Name) - $($_.Count) occurrences" -ForegroundColor White
    $_.Group | Select-Object -First 3 | ForEach-Object {
        Write-Host "    $($_.file):$($_.line) - $($_.pattern)" -ForegroundColor Gray
    }
}

Write-Host "`nConfiguration Patterns Found: $($results.configKeys.Count)" -ForegroundColor Yellow
$results.configKeys | Group-Object -Property pattern | Sort-Object Count -Descending | Select-Object -First 5 | ForEach-Object {
    Write-Host "  $($_.Name) - $($_.Count) occurrences" -ForegroundColor White
}

Write-Host "`nEnvironment Values Found: $($results.environmentValues.Count)" -ForegroundColor Yellow
$results.environmentValues | Group-Object -Property value | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  '$($_.Name)' - $($_.Count) occurrences" -ForegroundColor White
    $_.Group | Select-Object -First 3 | ForEach-Object {
        Write-Host "    $($_.file):$($_.line)" -ForegroundColor Gray
    }
}

# Quick Analysis
$totalFindings = $results.timeouts.Count + $results.magicNumbers.Count + $results.configKeys.Count + $results.environmentValues.Count
Write-Host "`n=== ANALYSIS ===" -ForegroundColor Cyan
Write-Host "Total Findings: $totalFindings" -ForegroundColor Yellow

if ($totalFindings -gt 0) {
    Write-Host "`nNext Steps:" -ForegroundColor Green
    if ($results.timeouts.Count -gt 0) {
        Write-Host "  - Replace timeout values with TIMEOUTS constants" -ForegroundColor White
    }
    if ($results.magicNumbers.Count -gt 0) {
        Write-Host "  - Replace magic numbers with appropriate constants" -ForegroundColor White
    }
    if ($results.configKeys.Count -gt 0) {
        Write-Host "  - Replace config patterns with CONFIG_KEYS constants" -ForegroundColor White
    }
    if ($results.environmentValues.Count -gt 0) {
        Write-Host "  - Replace environment strings with ENV_VALUES constants" -ForegroundColor White
    }
} else {
    Write-Host "No hardcoded constants found - codebase is already well-structured!" -ForegroundColor Green
}

# Save results
$outputFile = "C:\Projects\Attrition\source-constants-scan-results.json"
$results | ConvertTo-Json -Depth 3 | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "`nResults saved to: $outputFile" -ForegroundColor Cyan

Write-Host "`n=== Source Constants Scan Complete ===" -ForegroundColor Green