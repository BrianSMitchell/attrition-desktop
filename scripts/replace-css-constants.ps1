# CSS Constants Replacement Script
# Systematically replaces hardcoded CSS class combinations with constants

Write-Host "=== CSS Constants Replacement Script ===" -ForegroundColor Cyan
Write-Host "Replacing hardcoded CSS class combinations with constants..." -ForegroundColor Yellow

$sourceDir = "C:\Projects\Attrition\packages\client\src"
$replacements = @{
    # Most common patterns from scan results
    classNames = @(
        @{
            pattern = 'bg-gray-800 border border-gray-700 rounded p-4'
            constant = 'CARD_CLASSES.BASIC'
            import = 'CARD_CLASSES'
        },
        @{
            pattern = 'flex items-center justify-center'
            constant = 'LAYOUT_CLASSES.FLEX_CENTER'
            import = 'LAYOUT_CLASSES'
        },
        @{
            pattern = 'flex items-center justify-between'
            constant = 'LAYOUT_CLASSES.FLEX_BETWEEN' 
            import = 'LAYOUT_CLASSES'
        },
        @{
            pattern = 'p-3 bg-yellow-500 bg-opacity-20 border border-yellow-400 border-opacity-50 rounded-lg text-yellow-300 text-sm backdrop-blur-sm'
            constant = 'ALERT_CLASSES.WARNING'
            import = 'ALERT_CLASSES'
        },
        @{
            pattern = 'p-3 bg-red-500 bg-opacity-20 border border-red-400 border-opacity-50 rounded-lg text-red-300 text-sm backdrop-blur-sm'
            constant = 'ALERT_CLASSES.ERROR'
            import = 'ALERT_CLASSES'
        },
        @{
            pattern = 'p-3 bg-orange-500 bg-opacity-20 border border-orange-400 border-opacity-50 rounded-lg text-orange-300 text-sm backdrop-blur-sm'
            constant = 'ALERT_CLASSES.INFO'
            import = 'ALERT_CLASSES'
        },
        @{
            pattern = 'animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2'
            constant = 'LOADING_CLASSES.SPINNER_YELLOW'
            import = 'LOADING_CLASSES'
        },
        @{
            pattern = 'animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2'
            constant = 'LOADING_CLASSES.SPINNER_WHITE'
            import = 'LOADING_CLASSES'
        },
        @{
            pattern = 'animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'
            constant = 'LOADING_CLASSES.SPINNER_SMALL'
            import = 'LOADING_CLASSES'
        },
        @{
            pattern = 'min-h-screen flex items-center justify-center'
            constant = 'LAYOUT_CLASSES.FULLSCREEN_CENTER'
            import = 'LAYOUT_CLASSES'
        },
        @{
            pattern = 'w-full px-4 py-3 bg-gray-800 bg-opacity-50 border border-gray-600 border-opacity-50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-50 backdrop-blur-sm transition-all duration-300'
            constant = 'INPUT_CLASSES.PRIMARY'
            import = 'INPUT_CLASSES'
        },
        @{
            pattern = 'mb-4 p-3 bg-red-600 bg-opacity-20 border border-red-600 rounded text-red-400 text-sm'
            constant = 'ALERT_CLASSES.ERROR_ALT'
            import = 'ALERT_CLASSES'
        }
    )
}

$results = @{
    filesModified = @()
    replacementsMade = 0
    importsAdded = @()
}

# Function to safely read and write files
function Get-SafeFileContent {
    param([string]$filePath)
    try {
        return Get-Content -Path $filePath -Raw -ErrorAction Stop
    }
    catch {
        Write-Host "Warning: Could not read $filePath" -ForegroundColor Yellow
        return $null
    }
}

function Set-SafeFileContent {
    param([string]$filePath, [string]$content)
    try {
        Set-Content -Path $filePath -Value $content -Encoding UTF8 -ErrorAction Stop
        return $true
    }
    catch {
        Write-Host "Error: Could not write to $filePath - $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

Write-Host "`n1. Processing TSX/JSX files for className replacements..." -ForegroundColor Green

# Process TSX/JSX files
Get-ChildItem -Path $sourceDir -Recurse -Include "*.tsx", "*.jsx" | ForEach-Object {
    $filePath = $_.FullName
    $relativePath = $filePath.Replace("C:\Projects\Attrition\", "")
    $content = Get-SafeFileContent $filePath
    
    if ($null -eq $content) { return }
    
    $originalContent = $content
    $fileImports = @()
    $fileReplacements = 0
    
    # Apply className replacements
    foreach ($replacement in $replacements.classNames) {
        $pattern = $replacement.pattern
        $constantName = $replacement.constant
        $importName = $replacement.import
        
        # Replace in className attributes
        $classNamePattern = "className=`"$([regex]::Escape($pattern))`""
        $classNameReplacement = "className={$constantName}"
        
        if ($content -match $classNamePattern) {
            $content = $content -replace $classNamePattern, $classNameReplacement
            $fileReplacements++
            
            # Track import needed
            if ($fileImports -notcontains $importName) {
                $fileImports += $importName
            }
            
            Write-Host "    Replaced: $pattern" -ForegroundColor Gray
            Write-Host "    With: $constantName" -ForegroundColor Green
        }
        
        # Also check for single quotes
        $classNamePatternSingle = "className='$([regex]::Escape($pattern))'"
        if ($content -match $classNamePatternSingle) {
            $content = $content -replace $classNamePatternSingle, $classNameReplacement
            $fileReplacements++
            
            if ($fileImports -notcontains $importName) {
                $fileImports += $importName
            }
        }
    }
    
    # Add imports if replacements were made
    if ($fileReplacements -gt 0) {
        $importStatement = ""
        if ($fileImports.Count -gt 0) {
            $importList = $fileImports -join ", "
            $importStatement = "import { $importList } from '../constants/css-constants';`n"
            
            # Check if import already exists
            if ($content -notmatch "from ['\`"].*css-constants['\`"]") {
                # Add import at the top after existing imports
                $lines = $content -split "`n"
                $lastImportIndex = -1
                
                for ($i = 0; $i -lt $lines.Length; $i++) {
                    if ($lines[$i] -match "^import\s") {
                        $lastImportIndex = $i
                    }
                }
                
                if ($lastImportIndex -ge 0) {
                    $lines = $lines[0..$lastImportIndex] + $importStatement.TrimEnd() + $lines[($lastImportIndex + 1)..($lines.Length - 1)]
                    $content = $lines -join "`n"
                } else {
                    # Add at the very top
                    $content = $importStatement + $content
                }
            }
        }
        
        # Write the modified content back
        if (Set-SafeFileContent $filePath $content) {
            $results.filesModified += $relativePath
            $results.replacementsMade += $fileReplacements
            $results.importsAdded += $fileImports
            
            Write-Host "  Modified: $relativePath ($fileReplacements replacements)" -ForegroundColor White
        }
    }
}

Write-Host "`n2. Processing CSS Module files for color value replacements..." -ForegroundColor Green

# Process CSS module files (simple color replacements)
$cssColorReplacements = @{
    '#4a9' = 'var(--game-primary-accent)'
    '#5ba' = 'var(--game-secondary-accent)' 
    '#398' = 'var(--game-tertiary-accent)'
    'rgba(0, 0, 0, 0.85)' = 'var(--game-dark-bg)'
    'rgba(0, 0, 0, 0.2)' = 'var(--game-darker-bg)'
    'rgba(255, 255, 255, 0.1)' = 'var(--game-subtle-border)'
    '#fff' = 'var(--game-primary-text)'
    '#aaa' = 'var(--game-secondary-text)'
    '#666' = 'var(--game-disabled-text)'
    '4px' = 'var(--radius-small)'
    '16px' = 'var(--spacing-lg)'
    '12px' = 'var(--spacing-md)'
    '8px' = 'var(--spacing-sm)'
}

Get-ChildItem -Path $sourceDir -Recurse -Include "*.module.css", "*.css" | ForEach-Object {
    $filePath = $_.FullName
    $relativePath = $filePath.Replace("C:\Projects\Attrition\", "")
    $content = Get-SafeFileContent $filePath
    
    if ($null -eq $content) { return }
    
    $originalContent = $content
    $fileReplacements = 0
    
    # Apply color/dimension replacements
    foreach ($oldValue in $cssColorReplacements.Keys) {
        $newValue = $cssColorReplacements[$oldValue]
        $oldValueEscaped = [regex]::Escape($oldValue)
        
        if ($content -match $oldValueEscaped) {
            $content = $content -replace $oldValueEscaped, $newValue
            $fileReplacements++
            
            Write-Host "    Replaced: $oldValue -> $newValue" -ForegroundColor Gray
        }
    }
    
    if ($fileReplacements -gt 0) {
        if (Set-SafeFileContent $filePath $content) {
            $results.filesModified += $relativePath
            $results.replacementsMade += $fileReplacements
            
            Write-Host "  Modified: $relativePath ($fileReplacements replacements)" -ForegroundColor White
        }
    }
}

# Output Results
Write-Host "`n=== REPLACEMENT RESULTS ===" -ForegroundColor Cyan

Write-Host "`nFiles Modified: $($results.filesModified.Count)" -ForegroundColor Yellow
$results.filesModified | ForEach-Object {
    Write-Host "  $_" -ForegroundColor White
}

Write-Host "`nTotal Replacements: $($results.replacementsMade)" -ForegroundColor Yellow

$uniqueImports = $results.importsAdded | Sort-Object -Unique
Write-Host "`nUnique Imports Added: $($uniqueImports.Count)" -ForegroundColor Yellow
$uniqueImports | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Green
}

# Save results
$outputFile = "C:\Projects\Attrition\css-replacement-results.json"
$results | ConvertTo-Json -Depth 3 | Out-File -FilePath $outputFile -Encoding UTF8
Write-Host "`nDetailed results saved to: $outputFile" -ForegroundColor Cyan

Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Cyan
Write-Host "1. Test the application to ensure all replacements work correctly" -ForegroundColor Green
Write-Host "2. Run TypeScript compilation to check for any import errors" -ForegroundColor Green  
Write-Host "3. Update index.css to use CSS variables where appropriate" -ForegroundColor Green
Write-Host "4. Consider adding CSS variables import to root CSS file" -ForegroundColor Green

Write-Host "`n=== CSS Constants Replacement Complete ===" -ForegroundColor Green