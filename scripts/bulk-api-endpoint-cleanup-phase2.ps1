# API Endpoint Cleanup Script - Phase 2
# Handles more complex patterns and remaining hardcoded endpoints

$projectRoot = "C:\Projects\Attrition"
$replacementCount = 0
$modifiedFiles = @()

# Define advanced replacement mappings
$replacements = @{
    # Template literals without quotes
    '/api/game/dashboard' = 'API_ENDPOINTS.GAME.DASHBOARD'
    '/api/game/territories' = 'API_ENDPOINTS.GAME.TERRITORIES.BASE'
    '/api/game/territories/bases' = 'API_ENDPOINTS.GAME.TERRITORIES.BASES'
    '/api/game/territories/stats' = 'API_ENDPOINTS.GAME.TERRITORIES.STATS'
    '/api/game/fleets' = 'API_ENDPOINTS.GAME.FLEETS.BASE'
    '/api/game/fleets/create' = 'API_ENDPOINTS.GAME.FLEETS.CREATE'
    '/api/game/fleets/move' = 'API_ENDPOINTS.GAME.FLEETS.MOVE'
    '/api/game/structures' = 'API_ENDPOINTS.GAME.STRUCTURES.BASE'
    '/api/game/structures/build' = 'API_ENDPOINTS.GAME.STRUCTURES.BUILD'
    '/api/game/tech' = 'API_ENDPOINTS.GAME.TECH.BASE'
    '/api/game/tech/research' = 'API_ENDPOINTS.GAME.TECH.RESEARCH'
    '/api/game/units' = 'API_ENDPOINTS.GAME.UNITS.BASE'
    '/api/game/units/recruit' = 'API_ENDPOINTS.GAME.UNITS.RECRUIT'
    '/api/game/units/status' = 'API_ENDPOINTS.GAME.UNITS.STATUS'
    '/api/game/units/train' = 'API_ENDPOINTS.GAME.UNITS.TRAIN'
    
    # Universe endpoints
    '/api/universe' = 'API_ENDPOINTS.UNIVERSE.BASE'
    '/api/universe/info' = 'API_ENDPOINTS.UNIVERSE.INFO'
    '/api/universe/status' = 'API_ENDPOINTS.UNIVERSE.STATUS'
    
    # Authentication endpoints
    '/auth/login' = 'API_ENDPOINTS.AUTH.LOGIN'
    '/auth/logout' = 'API_ENDPOINTS.AUTH.LOGOUT'
    '/auth/register' = 'API_ENDPOINTS.AUTH.REGISTER'
    '/auth/verify' = 'API_ENDPOINTS.AUTH.VERIFY'
    '/auth/refresh' = 'API_ENDPOINTS.AUTH.REFRESH'
    
    # System endpoints
    '/health' = 'API_ENDPOINTS.SYSTEM.HEALTH'
    '/api/health' = 'API_ENDPOINTS.SYSTEM.HEALTH'
    '/status' = 'API_ENDPOINTS.SYSTEM.STATUS'
    '/api/status' = 'API_ENDPOINTS.SYSTEM.STATUS'
    '/version' = 'API_ENDPOINTS.SYSTEM.VERSION'
    '/api/version' = 'API_ENDPOINTS.SYSTEM.VERSION'
    
    # V1 Legacy endpoints
    '/api/v1' = 'API_ENDPOINTS.V1.BASE'
    '/api/v1/territories' = 'API_ENDPOINTS.V1.TERRITORIES'
    '/api/v1/territories/base-stats' = 'API_ENDPOINTS.V1.BASE_STATS'
    '/api/v1/territories/capacities' = 'API_ENDPOINTS.V1.CAPACITIES'
    '/api/v1/territories/bases' = 'API_ENDPOINTS.V1.BASES_STATS'
    '/api/v1/buildings' = 'API_ENDPOINTS.V1.BUILDINGS'
    '/api/v1/buildings/catalog' = 'API_ENDPOINTS.V1.BUILDINGS_CATALOG'
    '/api/v1/buildings/construct' = 'API_ENDPOINTS.V1.BUILDINGS_CONSTRUCT'
    '/api/v1/buildings/cancel' = 'API_ENDPOINTS.V1.BUILDINGS_CANCEL'
    '/api/v1/buildings/status' = 'API_ENDPOINTS.V1.BUILDINGS_STATUS'
    '/api/v1/buildings/queue' = 'API_ENDPOINTS.V1.BUILDINGS_QUEUE'
    '/api/v1/buildings/upgrade' = 'API_ENDPOINTS.V1.BUILDINGS_UPGRADE'
    '/api/v1/fleets' = 'API_ENDPOINTS.V1.FLEETS'
    '/api/v1/fleets/create' = 'API_ENDPOINTS.V1.FLEETS_CREATE'
    '/api/v1/fleets/move' = 'API_ENDPOINTS.V1.FLEETS_MOVE'
    '/api/v1/fleets/status' = 'API_ENDPOINTS.V1.FLEETS_STATUS'
    '/api/v1/technology' = 'API_ENDPOINTS.V1.TECHNOLOGY'
    '/api/v1/technology/catalog' = 'API_ENDPOINTS.V1.TECHNOLOGY_CATALOG'
    '/api/v1/technology/research' = 'API_ENDPOINTS.V1.TECHNOLOGY_RESEARCH'
    '/api/v1/technology/queue' = 'API_ENDPOINTS.V1.TECHNOLOGY_QUEUE'
    '/api/v1/units' = 'API_ENDPOINTS.V1.UNITS'
    '/api/v1/units/catalog' = 'API_ENDPOINTS.V1.UNITS_CATALOG'
    '/api/v1/units/status' = 'API_ENDPOINTS.V1.UNITS_STATUS'
    '/api/v1/units/base-units' = 'API_ENDPOINTS.V1.UNITS_BASE'
    '/api/v1/empire' = 'API_ENDPOINTS.V1.EMPIRE'
    '/api/v1/empire/dashboard' = 'API_ENDPOINTS.V1.EMPIRE_DASHBOARD'
    
    # Admin endpoints
    '/api/admin' = 'API_ENDPOINTS.ADMIN.BASE'
    '/api/admin/status' = 'API_ENDPOINTS.ADMIN.STATUS'
    '/api/admin/users' = 'API_ENDPOINTS.ADMIN.USERS'
    '/api/admin/empires' = 'API_ENDPOINTS.ADMIN.EMPIRES'
    
    # Sync endpoints
    '/api/sync' = 'API_ENDPOINTS.SYNC.BASE'
    '/api/sync/status' = 'API_ENDPOINTS.SYNC.STATUS'
    
    # Messages endpoints
    '/api/messages' = 'API_ENDPOINTS.MESSAGES.BASE'
    '/api/messages/mark-read' = 'API_ENDPOINTS.MESSAGES.MARK_READ'
    '/api/messages/delete' = 'API_ENDPOINTS.MESSAGES.DELETE'
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
        $_.FullName -notmatch "\.next" -and
        $_.FullName -notmatch "desktop/resources"  # Skip built desktop assets
    }
    $allFiles += $files
}

Write-Host "Found $($allFiles.Count) files to process in Phase 2" -ForegroundColor Green

# Process each file
foreach ($file in $allFiles) {
    try {
        $content = Get-Content $file.FullName -Raw -Encoding UTF8
        if (-not $content) { continue }
        
        $originalContent = $content
        $fileModified = $false
        $fileReplacements = 0
        
        # Apply string replacements with more sophisticated context detection
        foreach ($pattern in $replacements.Keys) {
            $replacement = $replacements[$pattern]
            
            # Handle different contexts where endpoints appear
            $contexts = @(
                "`'$pattern`'",    # Template literal single quotes
                "`"$pattern`"",    # Template literal double quotes
                "``$pattern``",    # Template literal backticks (escaped)
                "\`$pattern\`",    # Backticks in template literals
                "url: '$pattern'", # URL property single quotes
                "url: `"$pattern`"", # URL property double quotes
                "endpoint: '$pattern'", # Endpoint property
                "endpoint: `"$pattern`"",
                "path: '$pattern'", # Path property
                "path: `"$pattern`"",
                "route: '$pattern'", # Route property
                "route: `"$pattern`"",
                "fetch('$pattern')", # Fetch calls
                "fetch(`"$pattern`")",
                "axios.get('$pattern')", # Axios calls
                "axios.get(`"$pattern`")",
                "axios.post('$pattern')",
                "axios.post(`"$pattern`")",
                "axios.put('$pattern')",
                "axios.put(`"$pattern`")",
                "axios.delete('$pattern')",
                "axios.delete(`"$pattern`")",
                "request.get('$pattern')", # Request calls
                "request.get(`"$pattern`")",
                "request.post('$pattern')",
                "request.post(`"$pattern`")",
                ".toEqual('$pattern')", # Test assertions
                ".toEqual(`"$pattern`")",
                ".toBe('$pattern')",
                ".toBe(`"$pattern`")",
                "expect('$pattern')", # Expect statements
                "expect(`"$pattern`")",
                "pathname === '$pattern'", # Pathname comparisons
                "pathname === `"$pattern`"",
                "location.pathname === '$pattern'",
                "location.pathname === `"$pattern`"",
                "match('$pattern')", # Match function calls
                "match(`"$pattern`")",
                "includes('$pattern')", # String includes
                "includes(`"$pattern`")",
                "startsWith('$pattern')", # String starts with
                "startsWith(`"$pattern`")",
                "endsWith('$pattern')", # String ends with
                "endsWith(`"$pattern`")"
            )
            
            foreach ($context in $contexts) {
                if ($content.Contains($context)) {
                    # Build the replacement context
                    $contextReplacement = $context.Replace($pattern, "`${$replacement}")
                    $content = $content.Replace($context, $contextReplacement)
                    $fileReplacements++
                    $fileModified = $true
                }
            }
            
            # Handle plain replacements as well (in case they're not in specific contexts)
            if ($content.Contains($pattern) -and -not ($content -match "API_ENDPOINTS\." -and $pattern -match "/api/")) {
                # Make sure we don't replace if API_ENDPOINTS is already used in this context
                # This is a simple check - more sophisticated logic could be added
                $content = $content.Replace($pattern, "`${$replacement}")
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

Write-Host "`nBulk API endpoint cleanup Phase 2 completed!" -ForegroundColor Green
Write-Host "Total replacements: $replacementCount" -ForegroundColor Green
Write-Host "Files modified: $($modifiedFiles.Count)" -ForegroundColor Green

if ($modifiedFiles.Count -gt 0) {
    Write-Host "`nModified files:" -ForegroundColor Cyan
    $modifiedFiles | Sort-Object | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
}