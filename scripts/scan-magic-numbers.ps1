# Magic Numbers and Configuration Keys Scanner
# Scans for hardcoded numeric values and configuration strings that should use constants

Write-Host "=== Magic Numbers & Configuration Keys Scanner ===" -ForegroundColor Cyan
Write-Host "Scanning for hardcoded numeric values and configuration keys..." -ForegroundColor Yellow

$sourceDir = "C:\Projects\Attrition\packages"
$scanResults = @{
    magicNumbers = @()
    configurationKeys = @()
    timeoutValues = @()
    environmentKeys = @()
    networkPorts = @()
    statusCodes = @()
    repeatCounts = @()
}

# Function to safely read file content
function Get-SafeFileContent {
    param([string]$filePath)
    try {
        return Get-Content -Path $filePath -Raw -ErrorAction Stop
    }
    catch {
        Write-Host "Warning: Could not read $filePath" -ForegroundColor Yellow
        return ""
    }
}

Write-Host "`n1. Scanning for Magic Numbers..." -ForegroundColor Green

# Common magic number patterns to look for
$magicNumberPatterns = @{
    timeouts = @(1000, 2000, 3000, 5000, 10000, 15000, 30000, 60000)
    retryLimits = @(3, 5, 10, 100)
    bufferSizes = @(1024, 4096, 8192)
    gameNumbers = @(100, 750, 1000, 10000, 100000)
    percentages = @(25, 50, 75, 100)
    ports = @(3000, 3001, 8000, 8080, 80, 443)
    statusCodes = @(0, 1, 2, 200, 201, 400, 401, 403, 404, 500)
}

# Scan TypeScript/JavaScript files
Get-ChildItem -Path $sourceDir -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | ForEach-Object {
    $content = Get-SafeFileContent $_.FullName
    if (-not $content) { return }
    
    $relativePath = $_.FullName.Replace("C:\Projects\Attrition\", "")
    
    # Skip already processed constants files
    if ($relativePath -match "constants|magic-numbers|configuration-keys|css-constants|color-constants") {
        return
    }
    
    # Look for setTimeout/setInterval with magic numbers
    $timeoutMatches = [regex]::Matches($content, 'set(?:Timeout|Interval)\s*\(\s*[^,]+,\s*(\d+)', 'IgnoreCase')
    foreach ($match in $timeoutMatches) {
        $timeoutValue = [int]$match.Groups[1].Value
        if ($magicNumberPatterns.timeouts -contains $timeoutValue) {
            $scanResults.timeoutValues += @{
                file = $relativePath
                line = ($content.Substring(0, $match.Index) -split "`n").Count
                value = $timeoutValue
                context = $match.Value
                type = "setTimeout/setInterval"
            }
        }
    }
    
    # Look for hardcoded retry limits and loop bounds
    $retryMatches = [regex]::Matches($content, '(?:retry|attempt|max).*?(\d+)', 'IgnoreCase')
    foreach ($match in $retryMatches) {
        $retryValue = [int]$match.Groups[1].Value
        if ($magicNumberPatterns.retryLimits -contains $retryValue) {
            $scanResults.magicNumbers += @{
                file = $relativePath
                line = ($content.Substring(0, $match.Index) -split "`n").Count
                value = $retryValue
                context = $match.Value
                type = "Retry/Attempt Limit"
            }
        }
    }
    
    # Look for port numbers
    $portMatches = [regex]::Matches($content, '(?:port|PORT)[^\d]*(\d{2,5})', 'IgnoreCase')
    foreach ($match in $portMatches) {
        $portValue = [int]$match.Groups[1].Value
        if ($magicNumberPatterns.ports -contains $portValue) {
            $scanResults.networkPorts += @{
                file = $relativePath
                line = ($content.Substring(0, $match.Index) -split "`n").Count
                value = $portValue
                context = $match.Value
                type = "Network Port"
            }
        }
    }
    
    # Look for status codes
    $statusMatches = [regex]::Matches($content, '(?:status|code|response)[^\d]*(\d{1,3})', 'IgnoreCase')
    foreach ($match in $statusMatches) {
        $statusValue = [int]$match.Groups[1].Value
        if ($magicNumberPatterns.statusCodes -contains $statusValue) {
            $scanResults.statusCodes += @{
                file = $relativePath
                line = ($content.Substring(0, $match.Index) -split "`n").Count
                value = $statusValue
                context = $match.Value
                type = "Status Code"
            }
        }
    }
    
    # Look for percentage values (25, 50, 75, 100)
    $percentMatches = [regex]::Matches($content, '\b(25|50|75|100)\s*[%]?', 'IgnoreCase')
    foreach ($match in $percentMatches) {
        $percentValue = [int]$match.Groups[1].Value
        $scanResults.magicNumbers += @{
            file = $relativePath
            line = ($content.Substring(0, $match.Index) -split "`n").Count
            value = $percentValue
            context = $match.Value
            type = "Percentage Value"
        }
    }
}

Write-Host "`n2. Scanning for Configuration Keys..." -ForegroundColor Green

# Common configuration key patterns
$configKeyPatterns = @(
    'NODE_ENV',
    'PORT',
    'HOST',
    'API_URL',
    'SOCKET_URL',
    'JWT_SECRET',
    'DATABASE_URL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'VITE_\w+',
    'REACT_APP_\w+',
    'process\.env\.',
    'localStorage\.getItem',
    'localStorage\.setItem',
    'sessionStorage\.getItem',
    'sessionStorage\.setItem'
)

# Scan for configuration keys
Get-ChildItem -Path $sourceDir -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | ForEach-Object {
    $content = Get-SafeFileContent $_.FullName
    if (-not $content) { return }
    
    $relativePath = $_.FullName.Replace("C:\Projects\Attrition\", "")
    
    # Skip constants files
    if ($relativePath -match "constants|magic-numbers|configuration-keys") {
        return
    }
    
    foreach ($pattern in $configKeyPatterns) {
        $matches = [regex]::Matches($content, $pattern, 'IgnoreCase')
        foreach ($match in $matches) {
            $scanResults.configurationKeys += @{
                file = $relativePath
                line = ($content.Substring(0, $match.Index) -split "`n").Count
                pattern = $pattern
                context = $match.Value
                type = "Configuration Key"
            }
        }
    }
    
    # Look for hardcoded environment strings
    $envStringMatches = [regex]::Matches($content, '(?:development|production|test|staging)', 'IgnoreCase')
    foreach ($match in $envStringMatches) {
        $scanResults.environmentKeys += @{
            file = $relativePath
            line = ($content.Substring(0, $match.Index) -split "`n").Count
            value = $match.Value
            context = $match.Value
            type = "Environment Value"
        }
    }
}

# Output Results
Write-Host "`n=== SCAN RESULTS ===" -ForegroundColor Cyan

Write-Host "`nTimeout Values: $($scanResults.timeoutValues.Count)" -ForegroundColor Yellow
$scanResults.timeoutValues | Group-Object -Property value | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  Value: $($_.Name)ms - Found $($_.Count) times" -ForegroundColor White
    $_.Group | Select-Object -First 3 | ForEach-Object {
        Write-Host "    $($_.file):$($_.line) - $($_.context)" -ForegroundColor Gray
    }
}

Write-Host "`nMagic Numbers: $($scanResults.magicNumbers.Count)" -ForegroundColor Yellow
$magicGroups = $scanResults.magicNumbers | Group-Object -Property value | Sort-Object Count -Descending
$magicGroups | Select-Object -First 10 | ForEach-Object {
    Write-Host "  Value: $($_.Name) - Found $($_.Count) times" -ForegroundColor White
    $_.Group | Select-Object -First 2 | ForEach-Object {
        Write-Host "    $($_.file):$($_.line) - $($_.type)" -ForegroundColor Gray
    }
}

Write-Host "`nNetwork Ports: $($scanResults.networkPorts.Count)" -ForegroundColor Yellow
$scanResults.networkPorts | Group-Object -Property value | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  Port: $($_.Name) - Found $($_.Count) times" -ForegroundColor White
    $_.Group | Select-Object -First 2 | ForEach-Object {
        Write-Host "    $($_.file):$($_.line)" -ForegroundColor Gray
    }
}

Write-Host "`nStatus Codes: $($scanResults.statusCodes.Count)" -ForegroundColor Yellow
$scanResults.statusCodes | Group-Object -Property value | Sort-Object Count -Descending | Select-Object -First 10 | ForEach-Object {
    Write-Host "  Code: $($_.Name) - Found $($_.Count) times" -ForegroundColor White
    $_.Group | Select-Object -First 2 | ForEach-Object {
        Write-Host "    $($_.file):$($_.line)" -ForegroundColor Gray
    }
}

Write-Host "`nConfiguration Keys: $($scanResults.configurationKeys.Count)" -ForegroundColor Yellow
$configGroups = $scanResults.configurationKeys | Group-Object -Property pattern | Sort-Object Count -Descending
$configGroups | Select-Object -First 10 | ForEach-Object {
    Write-Host "  Pattern: $($_.Name) - Found $($_.Count) times" -ForegroundColor White
    $_.Group | Select-Object -First 3 | ForEach-Object {
        Write-Host "    $($_.file):$($_.line)" -ForegroundColor Gray
    }
}

Write-Host "`nEnvironment Keys: $($scanResults.environmentKeys.Count)" -ForegroundColor Yellow
$scanResults.environmentKeys | Group-Object -Property value | Sort-Object Count -Descending | ForEach-Object {
    Write-Host "  Environment: $($_.Name) - Found $($_.Count) times" -ForegroundColor White
    $_.Group | Select-Object -First 2 | ForEach-Object {
        Write-Host "    $($_.file):$($_.line)" -ForegroundColor Gray
    }
}

Write-Host "`n=== RECOMMENDATIONS ===" -ForegroundColor Cyan
Write-Host "1. Replace timeout values with TIMEOUTS constants from magic-numbers.ts" -ForegroundColor Green
Write-Host "2. Replace magic numbers with appropriate constants" -ForegroundColor Green
Write-Host "3. Replace configuration keys with CONFIG_KEYS constants" -ForegroundColor Green
Write-Host "4. Replace environment strings with ENV_VALUES constants" -ForegroundColor Green

# Save results
$outputFile = "C:\Projects\Attrition\magic-numbers-scan-results.json"
$scanResults | ConvertTo-Json -Depth 3 | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "`nDetailed results saved to: $outputFile" -ForegroundColor Cyan

Write-Host "`n=== Magic Numbers & Configuration Keys Scan Complete ===" -ForegroundColor Green