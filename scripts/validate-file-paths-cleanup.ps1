# File Paths & URLs Cleanup Validation
Write-Host "File Paths & URLs Cleanup - Validation" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green
Write-Host ""

# Target patterns we replaced
$targetPatterns = @(
    "'\\.ts'", '"\\.ts"',
    "'\\.tsx'", '"\\.tsx"',
    "'\\.js'", '"\\.js"',
    "'\\.jsx'", '"\\.jsx"',
    "'\\.json'", '"\\.json"',
    "'\\.md'", '"\\.md"',
    "'\\.log'", '"\\.log"',
    "'\\.css'", '"\\.css"',
    "'\\.html'", '"\\.html"',
    "'package\\.json'", '"package\\.json"',
    "'README\\.md'", '"README\\.md"',
    "'index\\.ts'", '"index\\.ts"',
    "'index\\.js'", '"index\\.js"',
    "'index\\.html'", '"index\\.html"',
    "'node_modules'", '"node_modules"',
    "'\*node_modules\*'", '"\*node_modules\*"',
    "'dist'", '"dist"',
    "'\*dist\*'", '"\*dist\*"',
    "'__tests__'", '"__tests__"',
    "'coverage'", '"coverage"'
)

Write-Host "Checking for remaining hardcoded file paths and extensions:"
Write-Host "Target patterns: $($targetPatterns.Count) patterns"
Write-Host ""

$files = Get-ChildItem -Path "packages" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
         Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*" }

Write-Host "Scanning $($files.Count) files..."

$totalRemaining = 0
$remainingByPattern = @{}

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if (!$content) { continue }
    
    foreach ($pattern in $targetPatterns) {
        $regex = [regex]::new($pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        $matches = $regex.Matches($content)
        if ($matches.Count -gt 0) {
            $totalRemaining += $matches.Count
            if (!$remainingByPattern.ContainsKey($pattern)) {
                $remainingByPattern[$pattern] = 0
            }
            $remainingByPattern[$pattern] += $matches.Count
        }
    }
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Yellow

if ($totalRemaining -eq 0) {
    Write-Host "SUCCESS: All target file paths and extensions standardized!" -ForegroundColor Green
    Write-Host "No hardcoded references found for target patterns." -ForegroundColor Green
} else {
    Write-Host "Remaining hardcoded references: $totalRemaining" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Top remaining patterns:" -ForegroundColor Yellow
    $sortedPatterns = $remainingByPattern.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 10
    foreach ($pattern in $sortedPatterns) {
        Write-Host "  $($pattern.Key): $($pattern.Value) references" -ForegroundColor White
    }
}

# Check file paths constants usage
Write-Host ""
Write-Host "Checking file paths constants usage..." -ForegroundColor Cyan
$constantsCount = 0
foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if ($content -and ($content -match "FILE_EXTENSIONS\." -or $content -match "FILE_PATHS\." -or $content -match "DIRECTORY_PATHS\.")) {
        $constantsCount++
    }
}

Write-Host "Files using file paths constants: $constantsCount" -ForegroundColor White
Write-Host ""

if ($totalRemaining -eq 0) {
    Write-Host "File Paths & URLs Standardization: COMPLETED!" -ForegroundColor Green
} else {
    Write-Host "Still need to clean up $totalRemaining references" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Validation completed!" -ForegroundColor Green