# API Endpoints Constants Replacement Script
Write-Host "🔄 Replacing hardcoded API endpoint strings with constants..." -ForegroundColor Green

# Define replacement mappings from hardcoded strings to API_ENDPOINTS constants
$replacements = @{
    '"/api/game"' = 'API_ENDPOINTS.GAME.BASE'
    '"/api/game/territories"' = 'API_ENDPOINTS.GAME.TERRITORIES'
    '"/api/game/bases"' = 'API_ENDPOINTS.GAME.BASES'
    '"/api/game/bases/summary"' = 'API_ENDPOINTS.GAME.BASES_SUMMARY'
    '"/api/game/structures"' = 'API_ENDPOINTS.GAME.STRUCTURES'
    '"/api/game/structures/catalog"' = 'API_ENDPOINTS.GAME.STRUCTURES_CATALOG'
    '"/api/game/structures/queue"' = 'API_ENDPOINTS.GAME.STRUCTURES_QUEUE'
    '"/api/game/structures/start"' = 'API_ENDPOINTS.GAME.STRUCTURES_START'
    '"/api/game/tech"' = 'API_ENDPOINTS.GAME.TECH'
    '"/api/game/tech/catalog"' = 'API_ENDPOINTS.GAME.TECH_CATALOG'
    '"/api/game/tech/status"' = 'API_ENDPOINTS.GAME.TECH_STATUS'
    '"/api/game/tech/queue"' = 'API_ENDPOINTS.GAME.TECH_QUEUE'
    '"/api/game/tech/start"' = 'API_ENDPOINTS.GAME.TECH_START'
    '"/api/game/fleets"' = 'API_ENDPOINTS.GAME.FLEETS'
    '"/api/game/fleets-overview"' = 'API_ENDPOINTS.GAME.FLEETS_OVERVIEW'
    '"/api/game/empire"' = 'API_ENDPOINTS.GAME.EMPIRE'
    '"/api/game/empire/credits/history"' = 'API_ENDPOINTS.GAME.EMPIRE_CREDITS_HISTORY'
    '"/api/game/dashboard"' = 'API_ENDPOINTS.GAME.DASHBOARD'
    '"/api/game/research"' = 'API_ENDPOINTS.GAME.RESEARCH'
    '"/api/game/units"' = 'API_ENDPOINTS.GAME.UNITS'
    '"/api/game/units/catalog"' = 'API_ENDPOINTS.GAME.UNITS_CATALOG'
    '"/api/game/units/status"' = 'API_ENDPOINTS.GAME.UNITS_STATUS'
    '"/api/game/units/start"' = 'API_ENDPOINTS.GAME.UNITS_START'
    '"/api/game/units/queue"' = 'API_ENDPOINTS.GAME.UNITS_QUEUE'
    '"/api/game/defenses"' = 'API_ENDPOINTS.GAME.DEFENSES'
    '"/api/game/defenses/catalog"' = 'API_ENDPOINTS.GAME.DEFENSES_CATALOG'
    '"/api/game/defenses/status"' = 'API_ENDPOINTS.GAME.DEFENSES_STATUS'
    '"/api/game/defenses/queue"' = 'API_ENDPOINTS.GAME.DEFENSES_QUEUE'
    '"/api/v1"' = 'API_ENDPOINTS.V1.BASE'
    '"/api/v1/territories"' = 'API_ENDPOINTS.V1.TERRITORIES'
    '"/api/v1/buildings"' = 'API_ENDPOINTS.V1.BUILDINGS'
    '"/api/v1/buildings/catalog"' = 'API_ENDPOINTS.V1.BUILDINGS_CATALOG'
    '"/api/v1/buildings/construct"' = 'API_ENDPOINTS.V1.BUILDINGS_CONSTRUCT'
    '"/api/v1/buildings/cancel"' = 'API_ENDPOINTS.V1.BUILDINGS_CANCEL'
    '"/api/v1/buildings/status"' = 'API_ENDPOINTS.V1.BUILDINGS_STATUS'
    '"/api/v1/buildings/queue"' = 'API_ENDPOINTS.V1.BUILDINGS_QUEUE'
    '"/api/v1/buildings/upgrade"' = 'API_ENDPOINTS.V1.BUILDINGS_UPGRADE'
    '"/api/v1/fleets"' = 'API_ENDPOINTS.V1.FLEETS'
    '"/api/v1/fleets/create"' = 'API_ENDPOINTS.V1.FLEETS_CREATE'
    '"/api/v1/fleets/status"' = 'API_ENDPOINTS.V1.FLEETS_STATUS'
    '"/api/v1/technology"' = 'API_ENDPOINTS.V1.TECHNOLOGY'
    '"/api/v1/technology/catalog"' = 'API_ENDPOINTS.V1.TECHNOLOGY_CATALOG'
    '"/api/v1/technology/research"' = 'API_ENDPOINTS.V1.TECHNOLOGY_RESEARCH'
    '"/api/v1/technology/queue"' = 'API_ENDPOINTS.V1.TECHNOLOGY_QUEUE'
    '"/api/v1/units"' = 'API_ENDPOINTS.V1.UNITS'
    '"/api/v1/units/catalog"' = 'API_ENDPOINTS.V1.UNITS_CATALOG'
    '"/api/v1/units/status"' = 'API_ENDPOINTS.V1.UNITS_STATUS'
    '"/api/v1/units/base-units"' = 'API_ENDPOINTS.V1.UNITS_BASE'
    '"/api/v1/empire"' = 'API_ENDPOINTS.V1.EMPIRE'
    '"/api/v1/empire/dashboard"' = 'API_ENDPOINTS.V1.EMPIRE_DASHBOARD'
    '"/api/auth/login"' = 'API_ENDPOINTS.AUTH.LOGIN'
    '"/api/auth/refresh"' = 'API_ENDPOINTS.AUTH.REFRESH'
    '"/api/auth/logout"' = 'API_ENDPOINTS.AUTH.LOGOUT'
    '"/api/admin"' = 'API_ENDPOINTS.ADMIN.BASE'
    '"/api/admin/users"' = 'API_ENDPOINTS.ADMIN.USERS'
    '"/api/admin/empires"' = 'API_ENDPOINTS.ADMIN.EMPIRES'
    '"/api/sync"' = 'API_ENDPOINTS.SYNC.BASE'
    '"/api/messages"' = 'API_ENDPOINTS.MESSAGES.BASE'
    '"/api/messages/mark-read"' = 'API_ENDPOINTS.MESSAGES.MARK_READ'
    '"/api/messages/delete"' = 'API_ENDPOINTS.MESSAGES.DELETE'
    '"/api/system/status"' = 'API_ENDPOINTS.SYSTEM.STATUS'
    '"/api/system/health"' = 'API_ENDPOINTS.SYSTEM.HEALTH'
}

# Files to process (excluding constants files and tests)
$directories = @(
    "packages\server\src\routes",
    "packages\server\src\__tests__",
    "packages\client\src\services",
    "packages\client\src\components"
)

$totalReplacements = 0
$filesModified = 0

foreach ($directory in $directories) {
    if (Test-Path $directory) {
        Write-Host "📁 Processing directory: $directory" -ForegroundColor Cyan
        
        $files = Get-ChildItem -Path $directory -Recurse -Include *.ts,*.tsx,*.js,*.jsx | Where-Object { 
            $_.Name -notlike "*constants*" -and 
            $_.FullName -notlike "*node_modules*"
        }
        
        foreach ($file in $files) {
            $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
            $originalContent = $content
            $fileReplacements = 0
            
            if ($content) {
                foreach ($pattern in $replacements.Keys) {
                    $replacement = $replacements[$pattern]
                    
                    # Use regex replace for exact matches
                    $matches = [regex]::Matches($content, [regex]::Escape($pattern))
                    if ($matches.Count -gt 0) {
                        $content = $content -replace [regex]::Escape($pattern), $replacement
                        $fileReplacements += $matches.Count
                        $totalReplacements += $matches.Count
                    }
                }
                
                # Only write file if changes were made
                if ($content -ne $originalContent) {
                    Set-Content -Path $file.FullName -Value $content -Encoding UTF8
                    $filesModified++
                    Write-Host "  ✅ $($file.FullName.Replace((Get-Location).Path + '\', '')) - $fileReplacements replacements" -ForegroundColor Green
                }
            }
        }
    }
}

Write-Host "`n📊 REPLACEMENT SUMMARY:" -ForegroundColor Yellow
Write-Host "Files modified: $filesModified" -ForegroundColor White
Write-Host "Total replacements: $totalReplacements" -ForegroundColor White

Write-Host "`n✅ API Endpoints replacement completed!" -ForegroundColor Green