# Business Logic Thresholds Analysis Script
# Identifies hardcoded numeric comparisons and business logic patterns

Write-Host "🎯 Business Logic Thresholds Analysis" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Gray

$sourceDirs = @("packages/client/src", "packages/server/src", "packages/shared/src")
$patterns = @()

foreach ($dir in $sourceDirs) {
    if (Test-Path $dir) {
        Write-Host "`n📁 Scanning $dir..." -ForegroundColor Yellow
        
        $files = Get-ChildItem -Path $dir -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
                 Where-Object { $_.FullName -notmatch "(node_modules|dist|build|test|constants)" }
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            if (-not $content) { continue }
            
            # Pattern 1: Numeric comparisons in conditions
            $numericComparisons = [regex]::Matches($content, 'if\s*\([^)]*[><=!]+\s*(\d+)[^)]*\)')
            foreach ($match in $numericComparisons) {
                $patterns += [PSCustomObject]@{
                    File = $file.Name
                    Pattern = $match.Value.Trim()
                    Value = $match.Groups[1].Value
                    Type = "NumericComparison"
                    Line = ($content.Substring(0, $match.Index) -split "`n").Count
                }
            }
            
            # Pattern 2: Array length comparisons
            $arrayComparisons = [regex]::Matches($content, '\.length\s*[><=!]+\s*(\d+)')
            foreach ($match in $arrayComparisons) {
                $patterns += [PSCustomObject]@{
                    File = $file.Name
                    Pattern = $match.Value.Trim()
                    Value = $match.Groups[1].Value
                    Type = "ArrayLength"
                    Line = ($content.Substring(0, $match.Index) -split "`n").Count
                }
            }
            
            # Pattern 3: Math operations with thresholds
            $mathOperations = [regex]::Matches($content, 'Math\.(max|min)\([^)]*,\s*(\d+)[^)]*\)')
            foreach ($match in $mathOperations) {
                $patterns += [PSCustomObject]@{
                    File = $file.Name
                    Pattern = $match.Value.Trim()
                    Value = $match.Groups[2].Value
                    Type = "MathOperation"
                    Line = ($content.Substring(0, $match.Index) -split "`n").Count
                }
            }
            
            # Pattern 4: Error count patterns
            $errorPatterns = [regex]::Matches($content, '(errorCount|successCount)\s*[><=!]+\s*(\d+)')
            foreach ($match in $errorPatterns) {
                $patterns += [PSCustomObject]@{
                    File = $file.Name
                    Pattern = $match.Value.Trim()
                    Value = $match.Groups[2].Value
                    Type = "CounterThreshold"
                    Line = ($content.Substring(0, $match.Index) -split "`n").Count
                }
            }
        }
    }
}

Write-Host "`n📊 BUSINESS LOGIC THRESHOLDS ANALYSIS" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Gray

Write-Host "`nTotal patterns found: $($patterns.Count)" -ForegroundColor Yellow

# Group by type and value
$grouped = $patterns | Group-Object -Property Type | Sort-Object Name
foreach ($group in $grouped) {
    Write-Host "`n🔍 $($group.Name): $($group.Count) patterns" -ForegroundColor Cyan
    
    $valueGroups = $group.Group | Group-Object -Property Value | Sort-Object Name
    foreach ($valueGroup in $valueGroups | Select-Object -First 5) {
        Write-Host "  • Value '$($valueGroup.Name)': $($valueGroup.Count) occurrences" -ForegroundColor White
        $sampleFiles = $valueGroup.Group | Select-Object -First 3 -ExpandProperty File | Sort-Object -Unique
        Write-Host "    Files: $($sampleFiles -join ', ')" -ForegroundColor DarkGray
    }
}

Write-Host "`n📋 DETAILED PATTERNS (First 15)" -ForegroundColor Yellow
$patterns | Select-Object -First 15 | ForEach-Object {
    Write-Host "  $($_.File):$($_.Line) - $($_.Type) - $($_.Pattern)" -ForegroundColor White
}

if ($patterns.Count -gt 15) {
    Write-Host "  ... and $($patterns.Count - 15) more patterns" -ForegroundColor DarkGray
}

Write-Host "`n✅ Analysis completed!" -ForegroundColor Green