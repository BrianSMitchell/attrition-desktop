# File Paths & URLs Replacement Script
# Replaces hardcoded file paths and extensions with centralized constants

Write-Host "File Paths & URLs Standardization - Replacement Script" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""

# Define the most common file paths and extensions to replace
$replacements = @{
    # File Extensions (in quotes)
    "'\.ts'" = "FILE_EXTENSIONS.TYPESCRIPT"
    "'\.tsx'" = "FILE_EXTENSIONS.TYPESCRIPT_REACT" 
    "'\.js'" = "FILE_EXTENSIONS.JAVASCRIPT"
    "'\.jsx'" = "FILE_EXTENSIONS.JAVASCRIPT_REACT"
    "'\.json'" = "FILE_EXTENSIONS.JSON"
    "'\.md'" = "FILE_EXTENSIONS.MARKDOWN"
    "'\.log'" = "FILE_EXTENSIONS.LOG"
    "'\.css'" = "FILE_EXTENSIONS.CSS"
    "'\.html'" = "FILE_EXTENSIONS.HTML"
    
    # Double quotes versions
    '"\.ts"' = "FILE_EXTENSIONS.TYPESCRIPT"
    '"\.tsx"' = "FILE_EXTENSIONS.TYPESCRIPT_REACT"
    '"\.js"' = "FILE_EXTENSIONS.JAVASCRIPT"
    '"\.jsx"' = "FILE_EXTENSIONS.JAVASCRIPT_REACT"
    '"\.json"' = "FILE_EXTENSIONS.JSON"
    '"\.md"' = "FILE_EXTENSIONS.MARKDOWN"
    '"\.log"' = "FILE_EXTENSIONS.LOG"
    '"\.css"' = "FILE_EXTENSIONS.CSS"
    '"\.html"' = "FILE_EXTENSIONS.HTML"
    
    # Common file paths
    "'package\.json'" = "FILE_PATHS.PACKAGE_JSON"
    '"package\.json"' = "FILE_PATHS.PACKAGE_JSON"
    "'README\.md'" = "FILE_PATHS.README"
    '"README\.md"' = "FILE_PATHS.README"
    "'index\.ts'" = "FILE_PATHS.INDEX_TS"
    '"index\.ts"' = "FILE_PATHS.INDEX_TS"
    "'index\.js'" = "FILE_PATHS.INDEX_JS"
    '"index\.js"' = "FILE_PATHS.INDEX_JS"
    "'index\.html'" = "FILE_PATHS.INDEX_HTML"
    '"index\.html"' = "FILE_PATHS.INDEX_HTML"
    
    # Directory paths
    "'node_modules'" = "DIRECTORY_PATHS.NODE_MODULES"
    '"node_modules"' = "DIRECTORY_PATHS.NODE_MODULES"
    "'\*node_modules\*'" = "DIRECTORY_PATHS.NODE_MODULES"
    '"\*node_modules\*"' = "DIRECTORY_PATHS.NODE_MODULES"
    "'dist'" = "DIRECTORY_PATHS.DIST"
    '"dist"' = "DIRECTORY_PATHS.DIST"
    "'\*dist\*'" = "DIRECTORY_PATHS.DIST"
    '"\*dist\*"' = "DIRECTORY_PATHS.DIST"
    "'__tests__'" = "DIRECTORY_PATHS.TESTS"
    '"__tests__"' = "DIRECTORY_PATHS.TESTS"
    "'coverage'" = "DIRECTORY_PATHS.COVERAGE"
    '"coverage"' = "DIRECTORY_PATHS.COVERAGE"
}

$totalReplacements = 0
$filesModified = 0
$modifiedFiles = @()

# Get all TypeScript and JavaScript files
$files = Get-ChildItem -Path "packages" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
         Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*" -and $_.FullName -notlike "*file-paths.ts" }

Write-Host "Processing $($files.Count) files..."

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if (!$content) { continue }
    
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($pattern in $replacements.Keys) {
        $newValue = $replacements[$pattern]
        
        # Use case-insensitive matching for file extensions and paths
        $regex = [regex]::new($pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        $matches = $regex.Matches($content)
        if ($matches.Count -gt 0) {
            $content = $regex.Replace($content, $newValue)
            $fileReplacements += $matches.Count
        }
    }
    
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $filesModified++
        $totalReplacements += $fileReplacements
        $relativePath = $file.FullName.Replace($PWD, "").TrimStart('\')
        $modifiedFiles += $relativePath
        Write-Host "  Modified: $($file.Name) ($fileReplacements replacements)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "=== RESULTS ===" -ForegroundColor Green
Write-Host "Files modified: $filesModified"
Write-Host "Total replacements: $totalReplacements"

if ($modifiedFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "Modified files:" -ForegroundColor Cyan
    foreach ($file in $modifiedFiles) {
        Write-Host "  $file" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "File paths and URLs replacement completed!" -ForegroundColor Green