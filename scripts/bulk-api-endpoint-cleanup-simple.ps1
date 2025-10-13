# API Endpoint Cleanup Script - Phase 1
# Replaces most common hardcoded API endpoint strings with API_ENDPOINTS constants

$projectRoot = "C:\Projects\Attrition"
$replacementCount = 0
$modifiedFiles = @()

# Define basic replacement mappings (avoiding duplicate keys)
$replacements = @{
    # Game endpoints
    "'/api/game/dashboard'" = "API_ENDPOINTS.GAME.DASHBOARD"
    '"/api/game/dashboard"' = "API_ENDPOINTS.GAME.DASHBOARD"
    "'/api/game/territories'" = "API_ENDPOINTS.GAME.TERRITORIES.BASE"
    '"/api/game/territories"' = "API_ENDPOINTS.GAME.TERRITORIES.BASE"
    "'/api/game/fleets'" = "API_ENDPOINTS.GAME.FLEETS.BASE"
    '"/api/game/fleets"' = "API_ENDPOINTS.GAME.FLEETS.BASE"
    "'/api/game/structures'" = "API_ENDPOINTS.GAME.STRUCTURES.BASE"
    '"/api/game/structures"' = "API_ENDPOINTS.GAME.STRUCTURES.BASE"
    "'/api/game/tech'" = "API_ENDPOINTS.GAME.TECH.BASE"
    '"/api/game/tech"' = "API_ENDPOINTS.GAME.TECH.BASE"
    "'/api/game/units'" = "API_ENDPOINTS.GAME.UNITS.BASE"
    '"/api/game/units"' = "API_ENDPOINTS.GAME.UNITS.BASE"
    
    # Universe endpoints
    "'/api/universe'" = "API_ENDPOINTS.UNIVERSE.BASE"
    '"/api/universe"' = "API_ENDPOINTS.UNIVERSE.BASE"
    "'/api/universe/info'" = "API_ENDPOINTS.UNIVERSE.INFO"
    '"/api/universe/info"' = "API_ENDPOINTS.UNIVERSE.INFO"
    "'/api/universe/status'" = "API_ENDPOINTS.UNIVERSE.STATUS"
    '"/api/universe/status"' = "API_ENDPOINTS.UNIVERSE.STATUS"
    
    # Authentication endpoints
    "'/auth/login'" = "API_ENDPOINTS.AUTH.LOGIN"
    '"/auth/login"' = "API_ENDPOINTS.AUTH.LOGIN"
    "'/auth/logout'" = "API_ENDPOINTS.AUTH.LOGOUT"
    '"/auth/logout"' = "API_ENDPOINTS.AUTH.LOGOUT"
    "'/auth/register'" = "API_ENDPOINTS.AUTH.REGISTER"
    '"/auth/register"' = "API_ENDPOINTS.AUTH.REGISTER"
    "'/auth/verify'" = "API_ENDPOINTS.AUTH.VERIFY"
    '"/auth/verify"' = "API_ENDPOINTS.AUTH.VERIFY"
    "'/auth/refresh'" = "API_ENDPOINTS.AUTH.REFRESH"
    '"/auth/refresh"' = "API_ENDPOINTS.AUTH.REFRESH"
    
    # System endpoints
    "'/health'" = "API_ENDPOINTS.SYSTEM.HEALTH"
    '"/health"' = "API_ENDPOINTS.SYSTEM.HEALTH"
    "'/api/health'" = "API_ENDPOINTS.SYSTEM.HEALTH"
    '"/api/health"' = "API_ENDPOINTS.SYSTEM.HEALTH"
    "'/status'" = "API_ENDPOINTS.SYSTEM.STATUS"
    '"/status"' = "API_ENDPOINTS.SYSTEM.STATUS"
    "'/api/status'" = "API_ENDPOINTS.SYSTEM.STATUS"
    '"/api/status"' = "API_ENDPOINTS.SYSTEM.STATUS"
    "'/version'" = "API_ENDPOINTS.SYSTEM.VERSION"
    '"/version"' = "API_ENDPOINTS.SYSTEM.VERSION"
    "'/api/version'" = "API_ENDPOINTS.SYSTEM.VERSION"
    '"/api/version"' = "API_ENDPOINTS.SYSTEM.VERSION"
    
    # V1 Legacy endpoints  
    "'/api/v1'" = "API_ENDPOINTS.V1.BASE"
    '"/api/v1"' = "API_ENDPOINTS.V1.BASE"
    "'/api/v1/territories'" = "API_ENDPOINTS.V1.TERRITORIES"
    '"/api/v1/territories"' = "API_ENDPOINTS.V1.TERRITORIES"
    "'/api/v1/buildings'" = "API_ENDPOINTS.V1.BUILDINGS"
    '"/api/v1/buildings"' = "API_ENDPOINTS.V1.BUILDINGS"
    "'/api/v1/fleets'" = "API_ENDPOINTS.V1.FLEETS"
    '"/api/v1/fleets"' = "API_ENDPOINTS.V1.FLEETS"
    "'/api/v1/technology'" = "API_ENDPOINTS.V1.TECHNOLOGY"
    '"/api/v1/technology"' = "API_ENDPOINTS.V1.TECHNOLOGY"
    "'/api/v1/units'" = "API_ENDPOINTS.V1.UNITS"
    '"/api/v1/units"' = "API_ENDPOINTS.V1.UNITS"
    "'/api/v1/empire'" = "API_ENDPOINTS.V1.EMPIRE"
    '"/api/v1/empire"' = "API_ENDPOINTS.V1.EMPIRE"
    
    # Admin endpoints
    "'/api/admin'" = "API_ENDPOINTS.ADMIN.BASE"
    '"/api/admin"' = "API_ENDPOINTS.ADMIN.BASE"
    "'/api/admin/status'" = "API_ENDPOINTS.ADMIN.STATUS"
    '"/api/admin/status"' = "API_ENDPOINTS.ADMIN.STATUS"
    
    # Sync endpoints
    "'/api/sync'" = "API_ENDPOINTS.SYNC.BASE"
    '"/api/sync"' = "API_ENDPOINTS.SYNC.BASE"
    "'/api/sync/status'" = "API_ENDPOINTS.SYNC.STATUS"
    '"/api/sync/status"' = "API_ENDPOINTS.SYNC.STATUS"
    
    # Messages endpoints
    "'/api/messages'" = "API_ENDPOINTS.MESSAGES.BASE"
    '"/api/messages"' = "API_ENDPOINTS.MESSAGES.BASE"
}

# Find all TypeScript, JavaScript files
$fileExtensions = @("*.ts", "*.tsx", "*.js", "*.jsx")
$allFiles = @()

foreach ($extension in $fileExtensions) {
    $files = Get-ChildItem -Path $projectRoot -Filter $extension -Recurse | Where-Object {
        $_.FullName -notmatch "node_modules" -and 
        $_.FullName -notmatch "\.git" -and
        $_.FullName -notmatch "dist" -and
        $_.FullName -notmatch "build" -and
        $_.FullName -notmatch "coverage" -and
        $_.FullName -notmatch "\.next"
    }
    $allFiles += $files
}

Write-Host "Found $($allFiles.Count) files to process" -ForegroundColor Green

# Process each file
foreach ($file in $allFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if (-not $content) { continue }
        
        $originalContent = $content
        $fileModified = $false
        $fileReplacements = 0
        
        # Apply string replacements
        foreach ($pattern in $replacements.Keys) {
            $replacement = $replacements[$pattern]
            if ($content.Contains($pattern)) {
                $content = $content.Replace($pattern, $replacement)
                $fileReplacements++
                $fileModified = $true
            }
        }
        
        if ($fileModified) {
            # Write the modified content back to file
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            $replacementCount += $fileReplacements
            $modifiedFiles += $file.FullName
            Write-Host "Modified: $($file.FullName) ($fileReplacements replacements)" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "Error processing $($file.FullName): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nBulk API endpoint cleanup completed!" -ForegroundColor Green
Write-Host "Total replacements: $replacementCount" -ForegroundColor Green
Write-Host "Files modified: $($modifiedFiles.Count)" -ForegroundColor Green

if ($modifiedFiles.Count -gt 0) {
    Write-Host "`nModified files:" -ForegroundColor Cyan
    $modifiedFiles | Sort-Object | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
}