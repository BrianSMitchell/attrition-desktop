# Comprehensive CSS Constants Scanner for React/Tailwind Project
# Finds hardcoded CSS class names, inline styles, and CSS values that could be constants

Write-Host "=== CSS Constants Scanner ===" -ForegroundColor Cyan
Write-Host "Scanning packages/client for hardcoded CSS values..." -ForegroundColor Yellow

$scanResults = @{
    hardcodedTailwindClasses = @()
    hardcodedCSSModuleValues = @()
    inlineStyles = @()
    repeatedClassPatterns = @()
    customCSSClasses = @()
    colorValues = @()
}

$sourceDir = "C:\Projects\Attrition\packages\client\src"

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

Write-Host "`n1. Scanning TSX/JSX files for hardcoded Tailwind classes..." -ForegroundColor Green

# Common Tailwind patterns that appear frequently and could be constants
$commonTailwindPatterns = @(
    "bg-gray-\d+",
    "text-\w+-\d+",
    "border-\w+-\d+", 
    "p-\d+",
    "m-\d+",
    "w-\d+",
    "h-\d+",
    "rounded-\w+",
    "flex items-center",
    "flex justify-between",
    "animate-spin",
    "bg-opacity-\d+",
    "border-opacity-\d+"
)

# Scan TSX/JSX files
Get-ChildItem -Path $sourceDir -Recurse -Include "*.tsx", "*.jsx" | ForEach-Object {
    $content = Get-SafeFileContent $_.FullName
    $relativePath = $_.FullName.Replace("C:\Projects\Attrition\", "")
    
    # Find className attributes with complex class combinations
    $classNameMatches = [regex]::Matches($content, 'className=["'']([^"'']+)["'']', 'IgnoreCase')
    foreach ($match in $classNameMatches) {
        $classes = $match.Groups[1].Value
        
        # Look for complex class combinations that could be constants
        if ($classes -match "bg-\w+-\d+.*border.*rounded|flex.*items-.*justify-|animate-.*rounded-.*border") {
            $scanResults.hardcodedTailwindClasses += @{
                file = $relativePath
                line = ($content.Substring(0, $match.Index) -split "`n").Count
                classes = $classes
                type = "Complex Tailwind Combination"
            }
        }
        
        # Check for repeated color patterns
        foreach ($pattern in $commonTailwindPatterns) {
            if ($classes -match $pattern) {
                $scanResults.repeatedClassPatterns += @{
                    file = $relativePath
                    line = ($content.Substring(0, $match.Index) -split "`n").Count
                    pattern = $pattern
                    classes = $classes
                }
            }
        }
    }
    
    # Find template literal classNames
    $templateMatches = [regex]::Matches($content, 'className=\{`([^`]+)`\}', 'IgnoreCase')
    foreach ($match in $templateMatches) {
        $classes = $match.Groups[1].Value
        $scanResults.hardcodedTailwindClasses += @{
            file = $relativePath
            line = ($content.Substring(0, $match.Index) -split "`n").Count
            classes = $classes
            type = "Template Literal Classes"
        }
    }
    
    # Find inline style objects
    $styleMatches = [regex]::Matches($content, 'style=\{([^}]+)\}', 'IgnoreCase')
    foreach ($match in $styleMatches) {
        $styles = $match.Groups[1].Value
        $scanResults.inlineStyles += @{
            file = $relativePath
            line = ($content.Substring(0, $match.Index) -split "`n").Count
            styles = $styles
        }
    }
}

Write-Host "`n2. Scanning CSS files for hardcoded values..." -ForegroundColor Green

# Scan CSS and CSS module files
Get-ChildItem -Path $sourceDir -Recurse -Include "*.css", "*.scss", "*.module.css" | ForEach-Object {
    $content = Get-SafeFileContent $_.FullName
    $relativePath = $_.FullName.Replace("C:\Projects\Attrition\", "")
    
    # Find hardcoded color values
    $colorMatches = [regex]::Matches($content, '#[0-9a-fA-F]{3,6}|rgba?\([^)]+\)|hsl\([^)]+\)', 'IgnoreCase')
    foreach ($match in $colorMatches) {
        $scanResults.colorValues += @{
            file = $relativePath
            line = ($content.Substring(0, $match.Index) -split "`n").Count
            color = $match.Value
        }
    }
    
    # Find hardcoded dimensions and spacing
    $dimensionMatches = [regex]::Matches($content, '\b\d+px\b|\b\d+rem\b|\b\d+em\b', 'IgnoreCase')
    foreach ($match in $dimensionMatches) {
        $scanResults.hardcodedCSSModuleValues += @{
            file = $relativePath
            line = ($content.Substring(0, $match.Index) -split "`n").Count
            value = $match.Value
            type = "Dimension"
        }
    }
    
    # Find custom CSS classes (in index.css mainly)
    if ($_.Name -eq "index.css") {
        $customClassMatches = [regex]::Matches($content, '\.([a-zA-Z-]+)\s*\{', 'IgnoreCase')
        foreach ($match in $customClassMatches) {
            $className = $match.Groups[1].Value
            if ($className -like "*game-*" -or $className -like "*status-*" -or $className -like "*service-*") {
                $scanResults.customCSSClasses += @{
                    file = $relativePath
                    className = $className
                    line = ($content.Substring(0, $match.Index) -split "`n").Count
                }
            }
        }
    }
}

# Output Results
Write-Host "`n=== SCAN RESULTS ===" -ForegroundColor Cyan

Write-Host "`nHardcoded Tailwind Class Combinations: $($scanResults.hardcodedTailwindClasses.Count)" -ForegroundColor Yellow
$scanResults.hardcodedTailwindClasses | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.file):$($_.line) - $($_.type)" -ForegroundColor White
    Write-Host "    Classes: $($_.classes)" -ForegroundColor Gray
}

Write-Host "`nRepeated Tailwind Patterns: $($scanResults.repeatedClassPatterns.Count)" -ForegroundColor Yellow
$patternGroups = $scanResults.repeatedClassPatterns | Group-Object -Property pattern | Sort-Object Count -Descending
$patternGroups | Select-Object -First 5 | ForEach-Object {
    Write-Host "  Pattern: $($_.Name) - Found $($_.Count) times" -ForegroundColor White
    $_.Group | Select-Object -First 3 | ForEach-Object {
        Write-Host "    $($_.file):$($_.line)" -ForegroundColor Gray
    }
}

Write-Host "`nInline Styles: $($scanResults.inlineStyles.Count)" -ForegroundColor Yellow
$scanResults.inlineStyles | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.file):$($_.line)" -ForegroundColor White
    Write-Host "    $($_.styles)" -ForegroundColor Gray
}

Write-Host "`nHardcoded Color Values: $($scanResults.colorValues.Count)" -ForegroundColor Yellow
$colorGroups = $scanResults.colorValues | Group-Object -Property color | Sort-Object Count -Descending
$colorGroups | Select-Object -First 10 | ForEach-Object {
    Write-Host "  Color: $($_.Name) - Found $($_.Count) times" -ForegroundColor White
    $_.Group | Select-Object -First 2 | ForEach-Object {
        Write-Host "    $($_.file):$($_.line)" -ForegroundColor Gray
    }
}

Write-Host "`nCustom CSS Classes (from index.css): $($scanResults.customCSSClasses.Count)" -ForegroundColor Yellow
$scanResults.customCSSClasses | ForEach-Object {
    Write-Host "  .$($_.className) - $($_.file):$($_.line)" -ForegroundColor White
}

Write-Host "`nCSS Module Values: $($scanResults.hardcodedCSSModuleValues.Count)" -ForegroundColor Yellow
$scanResults.hardcodedCSSModuleValues | Select-Object -First 10 | ForEach-Object {
    Write-Host "  $($_.file):$($_.line) - $($_.type): $($_.value)" -ForegroundColor White
}

Write-Host "`n=== RECOMMENDATIONS ===" -ForegroundColor Cyan
Write-Host "1. Create CSS_CLASSES constants for repeated Tailwind combinations" -ForegroundColor Green
Write-Host "2. Create COLOR_PALETTE constants for hardcoded color values" -ForegroundColor Green
Write-Host "3. Create SPACING/DIMENSIONS constants for repeated size values" -ForegroundColor Green
Write-Host "4. Consider extracting custom CSS classes to a constants file" -ForegroundColor Green

# Save detailed results to file
$outputFile = "C:\Projects\Attrition\css-constants-scan-results.json"
$scanResults | ConvertTo-Json -Depth 3 | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "`nDetailed results saved to: $outputFile" -ForegroundColor Cyan

Write-Host "`n=== CSS Constants Scan Complete ===" -ForegroundColor Green