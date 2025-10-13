# Ultra-Aggressive API Endpoint Cleanup Script
# Replaces all hardcoded API endpoint strings with API_ENDPOINTS constants

$projectRoot = "C:\Projects\Attrition"
$replacementCount = 0
$modifiedFiles = @()

# Define comprehensive replacement mappings
$replacements = @{
    # Game endpoints
    "'/api/game/dashboard'" = "API_ENDPOINTS.GAME.DASHBOARD"
    '"/api/game/dashboard"' = "API_ENDPOINTS.GAME.DASHBOARD"
    
    "'/api/game/territories'" = "API_ENDPOINTS.GAME.TERRITORIES.BASE"
    '"/api/game/territories"' = "API_ENDPOINTS.GAME.TERRITORIES.BASE"
    "`'/api/game/territories`'" = "API_ENDPOINTS.GAME.TERRITORIES.BASE"
    '`"/api/game/territories`"' = "API_ENDPOINTS.GAME.TERRITORIES.BASE"
    
    "'/api/game/territories/bases'" = "API_ENDPOINTS.GAME.TERRITORIES.BASES"
    '"/api/game/territories/bases"' = "API_ENDPOINTS.GAME.TERRITORIES.BASES"
    "`'/api/game/territories/bases`'" = "API_ENDPOINTS.GAME.TERRITORIES.BASES"
    '`"/api/game/territories/bases`"' = "API_ENDPOINTS.GAME.TERRITORIES.BASES"
    
    "'/api/game/territories/stats'" = "API_ENDPOINTS.GAME.TERRITORIES.STATS"
    '"/api/game/territories/stats"' = "API_ENDPOINTS.GAME.TERRITORIES.STATS"
    "`'/api/game/territories/stats`'" = "API_ENDPOINTS.GAME.TERRITORIES.STATS"
    '`"/api/game/territories/stats`"' = "API_ENDPOINTS.GAME.TERRITORIES.STATS"
    
    "'/api/game/fleets'" = "API_ENDPOINTS.GAME.FLEETS.BASE"
    '"/api/game/fleets"' = "API_ENDPOINTS.GAME.FLEETS.BASE"
    "`'/api/game/fleets`'" = "API_ENDPOINTS.GAME.FLEETS.BASE"
    '`"/api/game/fleets`"' = "API_ENDPOINTS.GAME.FLEETS.BASE"
    
    "'/api/game/fleets/create'" = "API_ENDPOINTS.GAME.FLEETS.CREATE"
    '"/api/game/fleets/create"' = "API_ENDPOINTS.GAME.FLEETS.CREATE"
    "`'/api/game/fleets/create`'" = "API_ENDPOINTS.GAME.FLEETS.CREATE"
    '`"/api/game/fleets/create`"' = "API_ENDPOINTS.GAME.FLEETS.CREATE"
    
    "'/api/game/fleets/move'" = "API_ENDPOINTS.GAME.FLEETS.MOVE"
    '"/api/game/fleets/move"' = "API_ENDPOINTS.GAME.FLEETS.MOVE"
    "`'/api/game/fleets/move`'" = "API_ENDPOINTS.GAME.FLEETS.MOVE"
    '`"/api/game/fleets/move`"' = "API_ENDPOINTS.GAME.FLEETS.MOVE"
    
    "'/api/game/structures'" = "API_ENDPOINTS.GAME.STRUCTURES.BASE"
    '"/api/game/structures"' = "API_ENDPOINTS.GAME.STRUCTURES.BASE"
    "`'/api/game/structures`'" = "API_ENDPOINTS.GAME.STRUCTURES.BASE"
    '`"/api/game/structures`"' = "API_ENDPOINTS.GAME.STRUCTURES.BASE"
    
    "'/api/game/structures/build'" = "API_ENDPOINTS.GAME.STRUCTURES.BUILD"
    '"/api/game/structures/build"' = "API_ENDPOINTS.GAME.STRUCTURES.BUILD"
    "`'/api/game/structures/build`'" = "API_ENDPOINTS.GAME.STRUCTURES.BUILD"
    '`"/api/game/structures/build`"' = "API_ENDPOINTS.GAME.STRUCTURES.BUILD"
    
    "'/api/game/tech'" = "API_ENDPOINTS.GAME.TECH.BASE"
    '"/api/game/tech"' = "API_ENDPOINTS.GAME.TECH.BASE"
    "`'/api/game/tech`'" = "API_ENDPOINTS.GAME.TECH.BASE"
    '`"/api/game/tech`"' = "API_ENDPOINTS.GAME.TECH.BASE"
    
    "'/api/game/tech/research'" = "API_ENDPOINTS.GAME.TECH.RESEARCH"
    '"/api/game/tech/research"' = "API_ENDPOINTS.GAME.TECH.RESEARCH"
    "`'/api/game/tech/research`'" = "API_ENDPOINTS.GAME.TECH.RESEARCH"
    '`"/api/game/tech/research`"' = "API_ENDPOINTS.GAME.TECH.RESEARCH"
    
    "'/api/game/units'" = "API_ENDPOINTS.GAME.UNITS.BASE"
    '"/api/game/units"' = "API_ENDPOINTS.GAME.UNITS.BASE"
    "`'/api/game/units`'" = "API_ENDPOINTS.GAME.UNITS.BASE"
    '`"/api/game/units`"' = "API_ENDPOINTS.GAME.UNITS.BASE"
    
    "'/api/game/units/recruit'" = "API_ENDPOINTS.GAME.UNITS.RECRUIT"
    '"/api/game/units/recruit"' = "API_ENDPOINTS.GAME.UNITS.RECRUIT"
    "`'/api/game/units/recruit`'" = "API_ENDPOINTS.GAME.UNITS.RECRUIT"
    '`"/api/game/units/recruit`"' = "API_ENDPOINTS.GAME.UNITS.RECRUIT"
    
    "'/api/game/units/status'" = "API_ENDPOINTS.GAME.UNITS.STATUS"
    '"/api/game/units/status"' = "API_ENDPOINTS.GAME.UNITS.STATUS"
    "`'/api/game/units/status`'" = "API_ENDPOINTS.GAME.UNITS.STATUS"
    '`"/api/game/units/status`"' = "API_ENDPOINTS.GAME.UNITS.STATUS"
    
    "'/api/game/units/train'" = "API_ENDPOINTS.GAME.UNITS.TRAIN"
    '"/api/game/units/train"' = "API_ENDPOINTS.GAME.UNITS.TRAIN"
    "`'/api/game/units/train`'" = "API_ENDPOINTS.GAME.UNITS.TRAIN"
    '`"/api/game/units/train`"' = "API_ENDPOINTS.GAME.UNITS.TRAIN"
    
    # Universe endpoints
    "'/api/universe'" = "API_ENDPOINTS.UNIVERSE.BASE"
    '"/api/universe"' = "API_ENDPOINTS.UNIVERSE.BASE"
    "`'/api/universe`'" = "API_ENDPOINTS.UNIVERSE.BASE"
    '`"/api/universe`"' = "API_ENDPOINTS.UNIVERSE.BASE"
    
    "'/api/universe/info'" = "API_ENDPOINTS.UNIVERSE.INFO"
    '"/api/universe/info"' = "API_ENDPOINTS.UNIVERSE.INFO"
    "`'/api/universe/info`'" = "API_ENDPOINTS.UNIVERSE.INFO"
    '`"/api/universe/info`"' = "API_ENDPOINTS.UNIVERSE.INFO"
    
    "'/api/universe/status'" = "API_ENDPOINTS.UNIVERSE.STATUS"
    '"/api/universe/status"' = "API_ENDPOINTS.UNIVERSE.STATUS"
    "`'/api/universe/status`'" = "API_ENDPOINTS.UNIVERSE.STATUS"
    '`"/api/universe/status`"' = "API_ENDPOINTS.UNIVERSE.STATUS"
    
    # Authentication endpoints
    "'/auth/login'" = "API_ENDPOINTS.AUTH.LOGIN"
    '"/auth/login"' = "API_ENDPOINTS.AUTH.LOGIN"
    "`'/auth/login`'" = "API_ENDPOINTS.AUTH.LOGIN"
    '`"/auth/login`"' = "API_ENDPOINTS.AUTH.LOGIN"
    
    "'/auth/logout'" = "API_ENDPOINTS.AUTH.LOGOUT"
    '"/auth/logout"' = "API_ENDPOINTS.AUTH.LOGOUT"
    "`'/auth/logout`'" = "API_ENDPOINTS.AUTH.LOGOUT"
    '`"/auth/logout`"' = "API_ENDPOINTS.AUTH.LOGOUT"
    
    "'/auth/register'" = "API_ENDPOINTS.AUTH.REGISTER"
    '"/auth/register"' = "API_ENDPOINTS.AUTH.REGISTER"
    "`'/auth/register`'" = "API_ENDPOINTS.AUTH.REGISTER"
    '`"/auth/register`"' = "API_ENDPOINTS.AUTH.REGISTER"
    
    "'/auth/verify'" = "API_ENDPOINTS.AUTH.VERIFY"
    '"/auth/verify"' = "API_ENDPOINTS.AUTH.VERIFY"
    "`'/auth/verify`'" = "API_ENDPOINTS.AUTH.VERIFY"
    '`"/auth/verify`"' = "API_ENDPOINTS.AUTH.VERIFY"
    
    "'/auth/refresh'" = "API_ENDPOINTS.AUTH.REFRESH"
    '"/auth/refresh"' = "API_ENDPOINTS.AUTH.REFRESH"
    "`'/auth/refresh`'" = "API_ENDPOINTS.AUTH.REFRESH"
    '`"/auth/refresh`"' = "API_ENDPOINTS.AUTH.REFRESH"
    
    # System endpoints
    "'/health'" = "API_ENDPOINTS.SYSTEM.HEALTH"
    '"/health"' = "API_ENDPOINTS.SYSTEM.HEALTH"
    "`'/health`'" = "API_ENDPOINTS.SYSTEM.HEALTH"
    '`"/health`"' = "API_ENDPOINTS.SYSTEM.HEALTH"
    
    "'/api/health'" = "API_ENDPOINTS.SYSTEM.HEALTH"
    '"/api/health"' = "API_ENDPOINTS.SYSTEM.HEALTH"
    "`'/api/health`'" = "API_ENDPOINTS.SYSTEM.HEALTH"
    '`"/api/health`"' = "API_ENDPOINTS.SYSTEM.HEALTH"
    
    "'/status'" = "API_ENDPOINTS.SYSTEM.STATUS"
    '"/status"' = "API_ENDPOINTS.SYSTEM.STATUS"
    "`'/status`'" = "API_ENDPOINTS.SYSTEM.STATUS"
    '`"/status`"' = "API_ENDPOINTS.SYSTEM.STATUS"
    
    "'/api/status'" = "API_ENDPOINTS.SYSTEM.STATUS"
    '"/api/status"' = "API_ENDPOINTS.SYSTEM.STATUS"
    "`'/api/status`'" = "API_ENDPOINTS.SYSTEM.STATUS"
    '`"/api/status`"' = "API_ENDPOINTS.SYSTEM.STATUS"
    
    "'/version'" = "API_ENDPOINTS.SYSTEM.VERSION"
    '"/version"' = "API_ENDPOINTS.SYSTEM.VERSION"
    "`'/version`'" = "API_ENDPOINTS.SYSTEM.VERSION"
    '`"/version`"' = "API_ENDPOINTS.SYSTEM.VERSION"
    
    "'/api/version'" = "API_ENDPOINTS.SYSTEM.VERSION"
    '"/api/version"' = "API_ENDPOINTS.SYSTEM.VERSION"
    "`'/api/version`'" = "API_ENDPOINTS.SYSTEM.VERSION"
    '`"/api/version`"' = "API_ENDPOINTS.SYSTEM.VERSION"
    
    # V1 Legacy endpoints  
    "'/api/v1'" = "API_ENDPOINTS.V1.BASE"
    '"/api/v1"' = "API_ENDPOINTS.V1.BASE"
    "`'/api/v1`'" = "API_ENDPOINTS.V1.BASE"
    '`"/api/v1`"' = "API_ENDPOINTS.V1.BASE"
    
    "'/api/v1/territories'" = "API_ENDPOINTS.V1.TERRITORIES"
    '"/api/v1/territories"' = "API_ENDPOINTS.V1.TERRITORIES"
    "`'/api/v1/territories`'" = "API_ENDPOINTS.V1.TERRITORIES"
    '`"/api/v1/territories`"' = "API_ENDPOINTS.V1.TERRITORIES"
    
    "'/api/v1/buildings'" = "API_ENDPOINTS.V1.BUILDINGS"
    '"/api/v1/buildings"' = "API_ENDPOINTS.V1.BUILDINGS"
    "`'/api/v1/buildings`'" = "API_ENDPOINTS.V1.BUILDINGS"
    '`"/api/v1/buildings`"' = "API_ENDPOINTS.V1.BUILDINGS"
    
    "'/api/v1/buildings/catalog'" = "API_ENDPOINTS.V1.BUILDINGS_CATALOG"
    '"/api/v1/buildings/catalog"' = "API_ENDPOINTS.V1.BUILDINGS_CATALOG"
    "`'/api/v1/buildings/catalog`'" = "API_ENDPOINTS.V1.BUILDINGS_CATALOG"
    '`"/api/v1/buildings/catalog`"' = "API_ENDPOINTS.V1.BUILDINGS_CATALOG"
    
    "'/api/v1/buildings/construct'" = "API_ENDPOINTS.V1.BUILDINGS_CONSTRUCT"
    '"/api/v1/buildings/construct"' = "API_ENDPOINTS.V1.BUILDINGS_CONSTRUCT"
    "`'/api/v1/buildings/construct`'" = "API_ENDPOINTS.V1.BUILDINGS_CONSTRUCT"
    '`"/api/v1/buildings/construct`"' = "API_ENDPOINTS.V1.BUILDINGS_CONSTRUCT"
    
    "'/api/v1/fleets'" = "API_ENDPOINTS.V1.FLEETS"
    '"/api/v1/fleets"' = "API_ENDPOINTS.V1.FLEETS"
    "`'/api/v1/fleets`'" = "API_ENDPOINTS.V1.FLEETS"
    '`"/api/v1/fleets`"' = "API_ENDPOINTS.V1.FLEETS"
    
    "'/api/v1/fleets/create'" = "API_ENDPOINTS.V1.FLEETS_CREATE"
    '"/api/v1/fleets/create"' = "API_ENDPOINTS.V1.FLEETS_CREATE"
    "`'/api/v1/fleets/create`'" = "API_ENDPOINTS.V1.FLEETS_CREATE"
    '`"/api/v1/fleets/create`"' = "API_ENDPOINTS.V1.FLEETS_CREATE"
    
    "'/api/v1/technology'" = "API_ENDPOINTS.V1.TECHNOLOGY"
    '"/api/v1/technology"' = "API_ENDPOINTS.V1.TECHNOLOGY"
    "`'/api/v1/technology`'" = "API_ENDPOINTS.V1.TECHNOLOGY"
    '`"/api/v1/technology`"' = "API_ENDPOINTS.V1.TECHNOLOGY"
    
    "'/api/v1/technology/catalog'" = "API_ENDPOINTS.V1.TECHNOLOGY_CATALOG"
    '"/api/v1/technology/catalog"' = "API_ENDPOINTS.V1.TECHNOLOGY_CATALOG"
    "`'/api/v1/technology/catalog`'" = "API_ENDPOINTS.V1.TECHNOLOGY_CATALOG"
    '`"/api/v1/technology/catalog`"' = "API_ENDPOINTS.V1.TECHNOLOGY_CATALOG"
    
    "'/api/v1/technology/research'" = "API_ENDPOINTS.V1.TECHNOLOGY_RESEARCH"
    '"/api/v1/technology/research"' = "API_ENDPOINTS.V1.TECHNOLOGY_RESEARCH"
    "`'/api/v1/technology/research`'" = "API_ENDPOINTS.V1.TECHNOLOGY_RESEARCH"
    '`"/api/v1/technology/research`"' = "API_ENDPOINTS.V1.TECHNOLOGY_RESEARCH"
    
    "'/api/v1/units'" = "API_ENDPOINTS.V1.UNITS"
    '"/api/v1/units"' = "API_ENDPOINTS.V1.UNITS"
    "`'/api/v1/units`'" = "API_ENDPOINTS.V1.UNITS"
    '`"/api/v1/units`"' = "API_ENDPOINTS.V1.UNITS"
    
    "'/api/v1/units/catalog'" = "API_ENDPOINTS.V1.UNITS_CATALOG"
    '"/api/v1/units/catalog"' = "API_ENDPOINTS.V1.UNITS_CATALOG"
    "`'/api/v1/units/catalog`'" = "API_ENDPOINTS.V1.UNITS_CATALOG"
    '`"/api/v1/units/catalog`"' = "API_ENDPOINTS.V1.UNITS_CATALOG"
    
    "'/api/v1/empire'" = "API_ENDPOINTS.V1.EMPIRE"
    '"/api/v1/empire"' = "API_ENDPOINTS.V1.EMPIRE"
    "`'/api/v1/empire`'" = "API_ENDPOINTS.V1.EMPIRE"
    '`"/api/v1/empire`"' = "API_ENDPOINTS.V1.EMPIRE"
    
    "'/api/v1/empire/dashboard'" = "API_ENDPOINTS.V1.EMPIRE_DASHBOARD"
    '"/api/v1/empire/dashboard"' = "API_ENDPOINTS.V1.EMPIRE_DASHBOARD"
    "`'/api/v1/empire/dashboard`'" = "API_ENDPOINTS.V1.EMPIRE_DASHBOARD"
    '`"/api/v1/empire/dashboard`"' = "API_ENDPOINTS.V1.EMPIRE_DASHBOARD"
    
    # Admin endpoints
    "'/api/admin'" = "API_ENDPOINTS.ADMIN.BASE"
    '"/api/admin"' = "API_ENDPOINTS.ADMIN.BASE"
    "`'/api/admin`'" = "API_ENDPOINTS.ADMIN.BASE"
    '`"/api/admin`"' = "API_ENDPOINTS.ADMIN.BASE"
    
    "'/api/admin/status'" = "API_ENDPOINTS.ADMIN.STATUS"
    '"/api/admin/status"' = "API_ENDPOINTS.ADMIN.STATUS"
    "`'/api/admin/status`'" = "API_ENDPOINTS.ADMIN.STATUS"
    '`"/api/admin/status`"' = "API_ENDPOINTS.ADMIN.STATUS"
    
    "'/api/admin/users'" = "API_ENDPOINTS.ADMIN.USERS"
    '"/api/admin/users"' = "API_ENDPOINTS.ADMIN.USERS"
    "`'/api/admin/users`'" = "API_ENDPOINTS.ADMIN.USERS"
    '`"/api/admin/users`"' = "API_ENDPOINTS.ADMIN.USERS"
    
    "'/api/admin/empires'" = "API_ENDPOINTS.ADMIN.EMPIRES"
    '"/api/admin/empires"' = "API_ENDPOINTS.ADMIN.EMPIRES"
    "`'/api/admin/empires`'" = "API_ENDPOINTS.ADMIN.EMPIRES"
    '`"/api/admin/empires`"' = "API_ENDPOINTS.ADMIN.EMPIRES"
    
    # Sync endpoints
    "'/api/sync'" = "API_ENDPOINTS.SYNC.BASE"
    '"/api/sync"' = "API_ENDPOINTS.SYNC.BASE"
    "`'/api/sync`'" = "API_ENDPOINTS.SYNC.BASE"
    '`"/api/sync`"' = "API_ENDPOINTS.SYNC.BASE"
    
    "'/api/sync/status'" = "API_ENDPOINTS.SYNC.STATUS"
    '"/api/sync/status"' = "API_ENDPOINTS.SYNC.STATUS"
    "`'/api/sync/status`'" = "API_ENDPOINTS.SYNC.STATUS"
    '`"/api/sync/status`"' = "API_ENDPOINTS.SYNC.STATUS"
    
    # Messages endpoints
    "'/api/messages'" = "API_ENDPOINTS.MESSAGES.BASE"
    '"/api/messages"' = "API_ENDPOINTS.MESSAGES.BASE"
    "`'/api/messages`'" = "API_ENDPOINTS.MESSAGES.BASE"
    '`"/api/messages`"' = "API_ENDPOINTS.MESSAGES.BASE"
}

# Additional regex patterns for template literals and dynamic patterns
$regexReplacements = @{
    # Template literals with single paths
    '`/api/game/dashboard`' = 'API_ENDPOINTS.GAME.DASHBOARD'
    '`/api/game/territories`' = 'API_ENDPOINTS.GAME.TERRITORIES.BASE'
    '`/api/game/fleets`' = 'API_ENDPOINTS.GAME.FLEETS.BASE'
    '`/api/game/structures`' = 'API_ENDPOINTS.GAME.STRUCTURES.BASE'
    '`/api/game/tech`' = 'API_ENDPOINTS.GAME.TECH.BASE'
    '`/api/game/units`' = 'API_ENDPOINTS.GAME.UNITS.BASE'
    '`/api/universe`' = 'API_ENDPOINTS.UNIVERSE.BASE'
    '`/auth/login`' = 'API_ENDPOINTS.AUTH.LOGIN'
    '`/auth/logout`' = 'API_ENDPOINTS.AUTH.LOGOUT'
    '`/auth/register`' = 'API_ENDPOINTS.AUTH.REGISTER'
    '`/health`' = 'API_ENDPOINTS.SYSTEM.HEALTH'
    '`/status`' = 'API_ENDPOINTS.SYSTEM.STATUS'
    '`/version`' = 'API_ENDPOINTS.SYSTEM.VERSION'
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
        $originalContent = $content
        $fileModified = $false
        $fileReplacements = 0
        
        # Apply exact string replacements
        foreach ($pattern in $replacements.Keys) {
            if ($content -match [regex]::Escape($pattern)) {
                $content = $content.Replace($pattern, $replacements[$pattern])
                $fileReplacements++
                $fileModified = $true
            }
        }
        
        # Apply regex replacements for template literals
        foreach ($pattern in $regexReplacements.Keys) {
            if ($content -match [regex]::Escape($pattern)) {
                $content = $content.Replace($pattern, $regexReplacements[$pattern])
                $fileReplacements++
                $fileModified = $true
            }
        }
        
        # Additional aggressive patterns using regex
        # Handle URL construction patterns like `${baseUrl}/api/...`
        $urlConstructionPatterns = @{
            '(baseUrl\s*\+\s*)([\'""`])/api/game/dashboard([\'""`])' = '$1API_ENDPOINTS.GAME.DASHBOARD'
            '(baseUrl\s*\+\s*)([\'""`])/api/game/territories([\'""`])' = '$1API_ENDPOINTS.GAME.TERRITORIES.BASE'
            '(baseUrl\s*\+\s*)([\'""`])/api/game/fleets([\'""`])' = '$1API_ENDPOINTS.GAME.FLEETS.BASE'
            '(baseUrl\s*\+\s*)([\'""`])/auth/login([\'""`])' = '$1API_ENDPOINTS.AUTH.LOGIN'
            '(baseUrl\s*\+\s*)([\'""`])/health([\'""`])' = '$1API_ENDPOINTS.SYSTEM.HEALTH'
            '(baseUrl\s*\+\s*)([\'""`])/status([\'""`])' = '$1API_ENDPOINTS.SYSTEM.STATUS'
        }
        
        foreach ($pattern in $urlConstructionPatterns.Keys) {
            if ($content -match $pattern) {
                $content = $content -replace $pattern, $urlConstructionPatterns[$pattern]
                $fileReplacements++
                $fileModified = $true
            }
        }
        
        # Template literal patterns like `${base}/api/...`
        $templateLiteralPatterns = @{
            '(\$\{[^}]+\})/api/game/dashboard' = '${1}${API_ENDPOINTS.GAME.DASHBOARD}'
            '(\$\{[^}]+\})/api/game/territories' = '${1}${API_ENDPOINTS.GAME.TERRITORIES.BASE}'
            '(\$\{[^}]+\})/api/game/fleets' = '${1}${API_ENDPOINTS.GAME.FLEETS.BASE}'
            '(\$\{[^}]+\})/auth/login' = '${1}${API_ENDPOINTS.AUTH.LOGIN}'
            '(\$\{[^}]+\})/health' = '${1}${API_ENDPOINTS.SYSTEM.HEALTH}'
        }
        
        foreach ($pattern in $templateLiteralPatterns.Keys) {
            if ($content -match $pattern) {
                $content = $content -replace $pattern, $templateLiteralPatterns[$pattern]
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