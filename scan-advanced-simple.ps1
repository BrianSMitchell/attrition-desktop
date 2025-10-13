# Advanced Constants Analysis Script - Simplified Version
Write-Host "🔍 Advanced Constants Analysis - Finding Additional Opportunities" -ForegroundColor Cyan
Write-Host "=================================================================================" -ForegroundColor Gray

# Define directories to scan
$sourceDirs = @("client/src", "server/src", "shared/src")

$businessLogic = @()
$validation = @()
$defaultObjects = @()
$gameValues = @()

foreach ($dir in $sourceDirs) {
    if (Test-Path $dir) {
        Write-Host "`n📁 Scanning $dir..." -ForegroundColor Yellow
        
        $files = Get-ChildItem -Path $dir -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
                 Where-Object { $_.FullName -notmatch "(node_modules|dist|build|test)" }
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if (-not $content) { continue }
            
            # 1. Business Logic - Numeric thresholds in conditions
            $businessMatches = [regex]::Matches($content, 'if\s*\(\s*\w+\s*[><=!]+\s*(\d+\.?\d*)')
            foreach ($match in $businessMatches) {
                $businessLogic += "$($file.Name): $($match.Value)"
            }
            
            # 2. Validation Patterns - Length checks
            $validationMatches = [regex]::Matches($content, '\.length\s*[><=!]+\s*(\d+)')
            foreach ($match in $validationMatches) {
                $validation += "$($file.Name): $($match.Value)"
            }
            
            # 3. Game-specific values
            $gamePatterns = @('health.*?(\d+)', 'damage.*?(\d+)', 'cost.*?(\d+)', 'level.*?(\d+)')
            foreach ($pattern in $gamePatterns) {
                $gameMatches = [regex]::Matches($content, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
                foreach ($match in $gameMatches) {
                    $gameValues += "$($file.Name): $($match.Value)"
                }
            }
            
            # 4. Default object patterns
            $objectMatches = [regex]::Matches($content, '\{\s*\w+:\s*["\d\w]+.*?\}')
            foreach ($match in $objectMatches) {
                if ($match.Value.Length -gt 20 -and $match.Value.Length -lt 150) {
                    $defaultObjects += "$($file.Name): $($match.Value.Substring(0, 80))..."
                }
            }
        }
    }
}

Write-Host "`n📊 ANALYSIS RESULTS" -ForegroundColor Green
Write-Host "=================================================================================" -ForegroundColor Gray

Write-Host "`n🎯 Business Logic Thresholds Found: $($businessLogic.Count)" -ForegroundColor Yellow
if ($businessLogic.Count -gt 0) {
    $businessLogic | Select-Object -First 10 | ForEach-Object {
        Write-Host "  • $_" -ForegroundColor White
    }
}

Write-Host "`n✅ Validation Patterns Found: $($validation.Count)" -ForegroundColor Yellow
if ($validation.Count -gt 0) {
    $validation | Select-Object -First 10 | ForEach-Object {
        Write-Host "  • $_" -ForegroundColor White
    }
}

Write-Host "`n🎮 Game Mechanics Found: $($gameValues.Count)" -ForegroundColor Yellow
if ($gameValues.Count -gt 0) {
    $gameValues | Select-Object -First 10 | ForEach-Object {
        Write-Host "  • $_" -ForegroundColor White
    }
}

Write-Host "`n📦 Default Objects Found: $($defaultObjects.Count)" -ForegroundColor Yellow
if ($defaultObjects.Count -gt 0) {
    $defaultObjects | Select-Object -First 5 | ForEach-Object {
        Write-Host "  • $_" -ForegroundColor White
    }
}

$total = $businessLogic.Count + $validation.Count + $gameValues.Count + $defaultObjects.Count
Write-Host "`n🎯 SUMMARY" -ForegroundColor Cyan
Write-Host "Total Additional Constant Opportunities: $total" -ForegroundColor Yellow

if ($total -gt 0) {
    Write-Host "`n💡 PRIORITY RECOMMENDATIONS:" -ForegroundColor Green
    Write-Host "1. Business Logic Thresholds - Create THRESHOLDS constants" -ForegroundColor White
    Write-Host "2. Game Mechanics Values - Create GAME_VALUES constants" -ForegroundColor White
    Write-Host "3. Validation Rules - Create VALIDATION_RULES constants" -ForegroundColor White
    Write-Host "4. Default Templates - Create DEFAULT_OBJECTS constants" -ForegroundColor White
} else {
    Write-Host "`n🎉 Excellent! Codebase is well optimized for constants." -ForegroundColor Green
}

Write-Host "`n✅ Analysis completed!" -ForegroundColor Green