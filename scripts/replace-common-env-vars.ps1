# Replace Common Environment Variables Script
Write-Host "Replacing common hardcoded environment variables..." -ForegroundColor Green

# Define the most common environment variables to replace
$replacements = @{
    'process\.env\.NODE_ENV' = 'process.env[ENV_VARS.NODE_ENV]'
    'process\.env\.DEBUG_RESOURCES' = 'process.env[ENV_VARS.DEBUG_RESOURCES]'
    'process\.env\.PORT' = 'process.env[ENV_VARS.PORT]'
    'process\.env\.JWT_SECRET' = 'process.env[ENV_VARS.JWT_SECRET]'
    'process\.env\.CORS_ORIGIN' = 'process.env[ENV_VARS.CORS_ORIGIN]'
    'process\.env\.SUPABASE_URL' = 'process.env[ENV_VARS.SUPABASE_URL]'
    'process\.env\.MONGODB_URI' = 'process.env[ENV_VARS.MONGODB_URI]'
    'process\.env\.HTTPS_PORT' = 'process.env[ENV_VARS.HTTPS_PORT]'
}

$totalReplacements = 0
$filesModified = 0
$modifiedFiles = @()

# Get all TypeScript and JavaScript files
$files = Get-ChildItem -Path "packages" -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
         Where-Object { $_.FullName -notlike "*node_modules*" -and $_.FullName -notlike "*dist*" -and $_.FullName -notlike "*env-vars.ts" }

Write-Host "Processing $($files.Count) files..."

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    if (!$content) { continue }
    
    $originalContent = $content
    $fileReplacements = 0
    
    foreach ($pattern in $replacements.Keys) {
        $newValue = $replacements[$pattern]
        $matches = [regex]::Matches($content, $pattern)
        if ($matches.Count -gt 0) {
            $content = $content -replace $pattern, $newValue
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
Write-Host "Environment variables replacement completed!" -ForegroundColor Green