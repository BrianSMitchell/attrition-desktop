# Business Logic Thresholds Analysis - Simplified
Write-Host "🎯 Business Logic Thresholds Analysis" -ForegroundColor Cyan

$sourceDirs = @("packages/client/src", "packages/server/src", "packages/shared/src")
$allPatterns = @()

foreach ($dir in $sourceDirs) {
    if (Test-Path $dir) {
        Write-Host "📁 Scanning $dir..." -ForegroundColor Yellow
        
        $files = Get-ChildItem -Path $dir -Recurse -Include "*.ts", "*.tsx" | 
                 Where-Object { $_.FullName -notmatch "(node_modules|dist|build|test)" }
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if ($content) {
                # Find numeric comparisons
                $matches = [regex]::Matches($content, 'if\s*\([^)]*[><=!]+\s*\d+[^)]*\)')
                foreach ($match in $matches) {
                    $allPatterns += "$($file.Name): $($match.Value)"
                }
                
                # Find array length comparisons
                $lengthMatches = [regex]::Matches($content, '\.length\s*[><=!]+\s*\d+')
                foreach ($match in $lengthMatches) {
                    $allPatterns += "$($file.Name): $($match.Value)"
                }
                
                # Find Math.max/min patterns
                $mathMatches = [regex]::Matches($content, 'Math\.(max|min)\([^)]*,\s*\d+[^)]*\)')
                foreach ($match in $mathMatches) {
                    $allPatterns += "$($file.Name): $($match.Value)"
                }
            }
        }
    }
}

Write-Host "`n📊 RESULTS" -ForegroundColor Green
Write-Host "Total patterns found: $($allPatterns.Count)" -ForegroundColor Yellow

Write-Host "`n📋 Sample Patterns (First 15):" -ForegroundColor Cyan
$allPatterns | Select-Object -First 15 | ForEach-Object {
    Write-Host "  • $_" -ForegroundColor White
}

if ($allPatterns.Count -gt 15) {
    Write-Host "  ... and $($allPatterns.Count - 15) more patterns" -ForegroundColor DarkGray
}

Write-Host "`n✅ Analysis completed!" -ForegroundColor Green