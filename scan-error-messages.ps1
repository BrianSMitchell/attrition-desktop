# Error Messages Scanner - Hardcoded Constants Detection
Write-Host "🔍 Scanning for hardcoded error message strings..." -ForegroundColor Green

# Define common error message patterns to search for
$patterns = @(
    '"[A-Z][a-z]+ (failed|error|not found|invalid|missing|required|unauthorized|forbidden|expired)"',
    '"(Failed to|Cannot|Unable to|Error:|Invalid|Missing|Not found|Unauthorized|Forbidden)[^"]*"',
    '"(Authentication|Authorization|Token|Session|Login|Logout)[^"]*"',
    '"(Database|Connection|Network|Service|Server)[^"]*error[^"]*"',
    '"(Required|Missing|Invalid)[^"]*field[^"]*"',
    '"(Insufficient|Not enough)[^"]*"',
    '"(Already exists|Already in progress|In progress)[^"]*"'
)

# Directories to scan
$directories = @(
    "packages\server\src",
    "packages\client\src", 
    "packages\shared\src"
)

$results = @()
$totalMatches = 0

Write-Host "📁 Scanning directories for error message patterns..." -ForegroundColor Cyan

foreach ($directory in $directories) {
    if (Test-Path $directory) {
        Write-Host "  Scanning: $directory" -ForegroundColor Yellow
        
        # Get files, excluding constants files and tests for now
        $files = Get-ChildItem -Path $directory -Recurse -Include *.ts,*.tsx,*.js,*.jsx | Where-Object { 
            $_.Name -notlike "*constants*" -and 
            $_.Name -notlike "*response-formats*" -and
            $_.FullName -notlike "*node_modules*"
        }
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            
            if ($content) {
                foreach ($pattern in $patterns) {
                    $matches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                    
                    foreach ($match in $matches) {
                        # Skip if it's already using ERROR_MESSAGES constant
                        if ($match.Value -notmatch "ERROR_MESSAGES") {
                            # Get line number
                            $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
                            
                            $results += [PSCustomObject]@{
                                File = $file.FullName.Replace((Get-Location).Path + "\", "")
                                Line = $lineNumber
                                Message = $match.Value
                                Length = $match.Value.Length
                                Category = "Unknown"
                            }
                            $totalMatches++
                        }
                    }
                }
            }
        }
    }
}

# Categorize error messages
foreach ($result in $results) {
    $msg = $result.Message
    if ($msg -match "(auth|login|logout|token|session)") { $result.Category = "Authentication" }
    elseif ($msg -match "(forbidden|access|permission|unauthorized)") { $result.Category = "Authorization" }
    elseif ($msg -match "(not found|missing|invalid|required)") { $result.Category = "Validation" }
    elseif ($msg -match "(database|connection|network|server)") { $result.Category = "System" }
    elseif ($msg -match "(failed|error|cannot|unable)") { $result.Category = "Generic" }
    else { $result.Category = "Other" }
}

# Group results for analysis
$byCategory = $results | Group-Object -Property Category | Sort-Object Count -Descending
$byFile = $results | Group-Object -Property File | Sort-Object Count -Descending
$topMessages = $results | Group-Object -Property Message | Sort-Object Count -Descending | Select-Object -First 15

Write-Host "`n📊 ERROR MESSAGES SCAN RESULTS:" -ForegroundColor Yellow
Write-Host "Total hardcoded error messages found: $totalMatches" -ForegroundColor White
Write-Host "Unique messages: $($topMessages.Count)" -ForegroundColor White
Write-Host "Files affected: $($byFile.Count)" -ForegroundColor White

Write-Host "`n🏷️ BY CATEGORY:" -ForegroundColor Blue
foreach ($category in $byCategory) {
    Write-Host "  $($category.Name): $($category.Count) messages" -ForegroundColor White
}

Write-Host "`n📁 TOP FILES WITH HARDCODED MESSAGES:" -ForegroundColor Red
$byFile | Select-Object -First 8 | ForEach-Object {
    Write-Host "  $($_.Name) - $($_.Count) messages" -ForegroundColor White
}

Write-Host "`n🔥 MOST COMMON ERROR MESSAGES:" -ForegroundColor Magenta
$topMessages | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.Name) ($($_.Count) times)" -ForegroundColor White
}

# Save detailed results
$outputFile = "error-messages-scan-results.json"
$results | ConvertTo-Json -Depth 3 | Set-Content $outputFile

Write-Host "`n💾 Detailed results saved to: $outputFile" -ForegroundColor Green
Write-Host "✅ Error messages scan completed!" -ForegroundColor Green