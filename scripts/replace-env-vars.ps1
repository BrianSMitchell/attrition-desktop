# Environment Variables Replacement Script
# Replaces hardcoded process.env.VARIABLE_NAME with centralized constants

Write-Host "Environment Variables Standardization - Replacement Script" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

# Define search directories
$searchDirs = @(
    "packages\server\src",
    "packages\client\src", 
    "packages\shared\src",
    "scripts"
)

# Common file extensions to scan
$extensions = @("*.ts", "*.tsx", "*.js", "*.jsx")

# Files to exclude
$excludePatterns = @(
    "*node_modules*",
    "*dist*",
    "*build*",
    "*.d.ts",
    "*coverage*",
    "*.min.js",
    "*env-vars.ts"  # Don't modify our constants file
)

# Environment variables to replace - focusing on most common ones first
$envVarReplacements = @{
    'NODE_ENV' = 'ENV_VARS.NODE_ENV'
    'DEBUG_RESOURCES' = 'ENV_VARS.DEBUG_RESOURCES'
    'USE_REVERSE_PROXY_SSL' = 'ENV_VARS.USE_REVERSE_PROXY_SSL'
    'CORS_ORIGIN' = 'ENV_VARS.CORS_ORIGIN'
    'CREDIT_PAYOUT_PERIOD_MINUTES' = 'ENV_VARS.CREDIT_PAYOUT_PERIOD_MINUTES'
    'RENDER' = 'ENV_VARS.RENDER'
    'HTTPS_PORT' = 'ENV_VARS.HTTPS_PORT'
    'JWT_SECRET' = 'ENV_VARS.JWT_SECRET'
    'PORT' = 'ENV_VARS.PORT'
    'GAME_LOOP_ENABLED' = 'ENV_VARS.GAME_LOOP_ENABLED'
    'CITIZEN_PAYOUT_PERIOD_MINUTES' = 'ENV_VARS.CITIZEN_PAYOUT_PERIOD_MINUTES'
    'CI' = 'ENV_VARS.CI'
    'HOME' = 'ENV_VARS.HOME'
    'SMTP_HOST' = 'ENV_VARS.SMTP_HOST'
    'GITHUB_STEP_SUMMARY' = 'ENV_VARS.GITHUB_STEP_SUMMARY'
    'REACT_APP_VERSION' = 'ENV_VARS.REACT_APP_VERSION'
    'FORCE_HTTPS' = 'ENV_VARS.FORCE_HTTPS'
    'SLACK_WEBHOOK_URL' = 'ENV_VARS.SLACK_WEBHOOK_URL'
    'SUPABASE_URL' = 'ENV_VARS.SUPABASE_URL'
    'MONGODB_URI' = 'ENV_VARS.MONGODB_URI'
    'LOG_LEVEL' = 'ENV_VARS.LOG_LEVEL'
    'SUPABASE_ANON_KEY' = 'ENV_VARS.SUPABASE_ANON_KEY'
    'SUPABASE_SERVICE_ROLE_KEY' = 'ENV_VARS.SUPABASE_SERVICE_ROLE_KEY'
}

# Track results
$totalFiles = 0
$filesProcessed = 0
$totalReplacements = 0
$filesModified = 0
$modifiedFiles = @()

Write-Host "Target environment variables for replacement:"
foreach ($envVar in $envVarReplacements.Keys | Sort-Object) {
    Write-Host "  $envVar -> process.env[$($envVarReplacements[$envVar])]" -ForegroundColor Cyan
}
Write-Host ""

# Process each directory
foreach ($dir in $searchDirs) {
    $fullPath = Join-Path $PWD $dir
    if (!(Test-Path $fullPath)) {
        Write-Host "Directory not found: $fullPath" -ForegroundColor Yellow
        continue
    }
    
    Write-Host "Processing directory: $dir" -ForegroundColor Yellow
    
    # Get all files
    $files = @()
    foreach ($ext in $extensions) {
        $files += Get-ChildItem -Path $fullPath -Filter $ext -Recurse -File
    }
    
    # Filter out excluded files
    $filteredFiles = $files | Where-Object {
        $filePath = $_.FullName
        $shouldExclude = $false
        foreach ($pattern in $excludePatterns) {
            if ($filePath -like $pattern) {
                $shouldExclude = $true
                break
            }
        }
        return !$shouldExclude
    }
    
    $totalFiles += $filteredFiles.Count
    Write-Host "  Found $($filteredFiles.Count) files to process"
    
    # Process each file
    foreach ($file in $filteredFiles) {
        try {
            $content = Get-Content -Path $file.FullName -Raw -ErrorAction Stop
            if (!$content) { continue }
            
            $originalContent = $content
            $fileReplacements = 0
            
            # Apply replacements for each environment variable
            foreach ($envVar in $envVarReplacements.Keys) {
                $oldPattern = "process\.env\.$envVar"
                $newValue = "process.env[$($envVarReplacements[$envVar])]"
                
                # Use regex to find and replace
                $matches = [regex]::Matches($content, $oldPattern)
                if ($matches.Count -gt 0) {
                    $content = $content -replace $oldPattern, $newValue
                    $fileReplacements += $matches.Count
                }
            }
            
            # Save file if modifications were made
            if ($content -ne $originalContent) {
                Set-Content -Path $file.FullName -Value $content -NoNewline -ErrorAction Stop
                $filesModified++
                $totalReplacements += $fileReplacements
                
                $relativePath = $file.FullName.Replace($PWD, "").TrimStart('\')
                $modifiedFiles += @{
                    File = $relativePath
                    Replacements = $fileReplacements
                }
                
                Write-Host "    ✓ $($file.Name): $fileReplacements replacements" -ForegroundColor Green
            }
            
            $filesProcessed++
            
        } catch {
            Write-Host "    ✗ Error processing $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "=== REPLACEMENT RESULTS ===" -ForegroundColor Yellow
Write-Host "Total files scanned: $totalFiles"
Write-Host "Files processed: $filesProcessed"
Write-Host "Files modified: $filesModified"
Write-Host "Total replacements made: $totalReplacements"
Write-Host ""

if ($modifiedFiles.Count -gt 0) {
    Write-Host "=== MODIFIED FILES ===" -ForegroundColor Yellow
    foreach ($fileInfo in $modifiedFiles) {
        Write-Host "  $($fileInfo.File): $($fileInfo.Replacements) replacements" -ForegroundColor White
    }
    Write-Host ""
}

Write-Host "Environment variables replacement completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Run the import addition script to add missing ENV_VARS imports" -ForegroundColor White
Write-Host "2. Run validation script to verify all replacements" -ForegroundColor White
Write-Host "3. Test the application to ensure everything works correctly" -ForegroundColor White
        }
    }
}
