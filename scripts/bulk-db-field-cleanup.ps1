#!/usr/bin/env pwsh

Write-Host "Starting targeted database field cleanup..."

# Define base directories to search
$baseDirs = @(
    "packages\server\src",
    "packages\shared\src", 
    "tests"
)

# Define patterns to exclude
$excludePatterns = @(
    "node_modules",
    "dist",
    "build", 
    ".next",
    "coverage",
    "**/*.min.js",
    "**/*.bundle.js",
    "*database-fields.ts"  # Exclude the constants file itself
)

$totalReplacements = 0
$filesModified = @()

# Define targeted replacements - focus on SQL-like quoted field references
$dbFieldReplacements = @{
    # Buildings table fields
    "'empire_id'" = "DB_FIELDS.BUILDINGS.EMPIRE_ID"
    '"empire_id"' = "DB_FIELDS.BUILDINGS.EMPIRE_ID"
    "'location_coord'" = "DB_FIELDS.BUILDINGS.LOCATION_COORD"
    '"location_coord"' = "DB_FIELDS.BUILDINGS.LOCATION_COORD"
    "'catalog_key'" = "DB_FIELDS.BUILDINGS.CATALOG_KEY"
    '"catalog_key"' = "DB_FIELDS.BUILDINGS.CATALOG_KEY"
    "'level'" = "DB_FIELDS.BUILDINGS.LEVEL"
    '"level"' = "DB_FIELDS.BUILDINGS.LEVEL"
    "'is_active'" = "DB_FIELDS.BUILDINGS.IS_ACTIVE"
    '"is_active"' = "DB_FIELDS.BUILDINGS.IS_ACTIVE"
    "'pending_upgrade'" = "DB_FIELDS.BUILDINGS.PENDING_UPGRADE"
    '"pending_upgrade"' = "DB_FIELDS.BUILDINGS.PENDING_UPGRADE"
    "'construction_started'" = "DB_FIELDS.BUILDINGS.CONSTRUCTION_STARTED"
    '"construction_started"' = "DB_FIELDS.BUILDINGS.CONSTRUCTION_STARTED"
    "'construction_completed'" = "DB_FIELDS.BUILDINGS.CONSTRUCTION_COMPLETED"
    '"construction_completed"' = "DB_FIELDS.BUILDINGS.CONSTRUCTION_COMPLETED"
    "'credits_cost'" = "DB_FIELDS.BUILDINGS.CREDITS_COST"
    '"credits_cost"' = "DB_FIELDS.BUILDINGS.CREDITS_COST"
    
    # Common fields across tables
    "'id'" = "DB_FIELDS.BUILDINGS.ID"
    '"id"' = "DB_FIELDS.BUILDINGS.ID"
    "'created_at'" = "DB_FIELDS.BUILDINGS.CREATED_AT"
    '"created_at"' = "DB_FIELDS.BUILDINGS.CREATED_AT"
    "'updated_at'" = "DB_FIELDS.BUILDINGS.UPDATED_AT"
    '"updated_at"' = "DB_FIELDS.BUILDINGS.UPDATED_AT"
    
    # Empires table specific
    "'user_id'" = "DB_FIELDS.EMPIRES.USER_ID"
    '"user_id"' = "DB_FIELDS.EMPIRES.USER_ID"
    "'name'" = "DB_FIELDS.EMPIRES.NAME"
    '"name"' = "DB_FIELDS.EMPIRES.NAME"
    "'home_system'" = "DB_FIELDS.EMPIRES.HOME_SYSTEM"
    '"home_system"' = "DB_FIELDS.EMPIRES.HOME_SYSTEM"
    "'territories'" = "DB_FIELDS.EMPIRES.TERRITORIES"
    '"territories"' = "DB_FIELDS.EMPIRES.TERRITORIES"
    "'credits'" = "DB_FIELDS.EMPIRES.CREDITS"
    '"credits"' = "DB_FIELDS.EMPIRES.CREDITS"
    "'energy'" = "DB_FIELDS.EMPIRES.ENERGY"
    '"energy"' = "DB_FIELDS.EMPIRES.ENERGY"
    
    # Users table specific
    "'email'" = "DB_FIELDS.USERS.EMAIL"
    '"email"' = "DB_FIELDS.USERS.EMAIL"
    "'username'" = "DB_FIELDS.USERS.USERNAME"
    '"username"' = "DB_FIELDS.USERS.USERNAME"
    "'password_hash'" = "DB_FIELDS.USERS.PASSWORD_HASH"
    '"password_hash"' = "DB_FIELDS.USERS.PASSWORD_HASH"
    
    # Tech queue specific  
    "'tech_key'" = "DB_FIELDS.TECH_QUEUE.TECH_KEY"
    '"tech_key"' = "DB_FIELDS.TECH_QUEUE.TECH_KEY"
    "'status'" = "DB_FIELDS.TECH_QUEUE.STATUS"
    '"status"' = "DB_FIELDS.TECH_QUEUE.STATUS"
    "'started_at'" = "DB_FIELDS.TECH_QUEUE.STARTED_AT"
    '"started_at"' = "DB_FIELDS.TECH_QUEUE.STARTED_AT"
    "'completes_at'" = "DB_FIELDS.TECH_QUEUE.COMPLETES_AT"
    '"completes_at"' = "DB_FIELDS.TECH_QUEUE.COMPLETES_AT"
    
    # Unit queue specific
    "'unit_key'" = "DB_FIELDS.UNIT_QUEUE.UNIT_KEY"
    '"unit_key"' = "DB_FIELDS.UNIT_QUEUE.UNIT_KEY"
    
    # Defense queue specific
    "'defense_key'" = "DB_FIELDS.DEFENSE_QUEUE.DEFENSE_KEY"
    '"defense_key"' = "DB_FIELDS.DEFENSE_QUEUE.DEFENSE_KEY"
    
    # Fleet specific
    "'fleet_id'" = "DB_FIELDS.FLEET_MOVEMENTS.FLEET_ID"
    '"fleet_id"' = "DB_FIELDS.FLEET_MOVEMENTS.FLEET_ID"
    "'from_coord'" = "DB_FIELDS.FLEET_MOVEMENTS.FROM_COORD"
    '"from_coord"' = "DB_FIELDS.FLEET_MOVEMENTS.FROM_COORD"
    "'to_coord'" = "DB_FIELDS.FLEET_MOVEMENTS.TO_COORD"
    '"to_coord"' = "DB_FIELDS.FLEET_MOVEMENTS.TO_COORD"
    "'arrives_at'" = "DB_FIELDS.FLEET_MOVEMENTS.ARRIVES_AT"
    '"arrives_at"' = "DB_FIELDS.FLEET_MOVEMENTS.ARRIVES_AT"
    
    # Locations specific
    "'owner_id'" = "DB_FIELDS.LOCATIONS.OWNER_ID"
    '"owner_id"' = "DB_FIELDS.LOCATIONS.OWNER_ID"
    "'result'" = "DB_FIELDS.LOCATIONS.RESULT"
    '"result"' = "DB_FIELDS.LOCATIONS.RESULT"
    "'system_name'" = "DB_FIELDS.LOCATIONS.SYSTEM_NAME"
    '"system_name"' = "DB_FIELDS.LOCATIONS.SYSTEM_NAME"
    "'planet_type'" = "DB_FIELDS.LOCATIONS.PLANET_TYPE"
    '"planet_type"' = "DB_FIELDS.LOCATIONS.PLANET_TYPE"
    
    # Credit transactions specific
    "'amount'" = "DB_FIELDS.CREDIT_TRANSACTIONS.AMOUNT"
    '"amount"' = "DB_FIELDS.CREDIT_TRANSACTIONS.AMOUNT"
    "'type'" = "DB_FIELDS.CREDIT_TRANSACTIONS.TYPE"
    '"type"' = "DB_FIELDS.CREDIT_TRANSACTIONS.TYPE"
    "'note'" = "DB_FIELDS.CREDIT_TRANSACTIONS.NOTE"
    '"note"' = "DB_FIELDS.CREDIT_TRANSACTIONS.NOTE"
    "'balance_after'" = "DB_FIELDS.CREDIT_TRANSACTIONS.BALANCE_AFTER"
    '"balance_after"' = "DB_FIELDS.CREDIT_TRANSACTIONS.BALANCE_AFTER"
    
    # Messages specific
    "'subject'" = "DB_FIELDS.MESSAGES.SUBJECT"
    '"subject"' = "DB_FIELDS.MESSAGES.SUBJECT"
    "'content'" = "DB_FIELDS.MESSAGES.CONTENT"
    '"content"' = "DB_FIELDS.MESSAGES.CONTENT"
    "'read'" = "DB_FIELDS.MESSAGES.read"
    '"read"' = "DB_FIELDS.MESSAGES.read"
    
    # Research projects specific
    "'is_completed'" = "DB_FIELDS.RESEARCH_PROJECTS.IS_COMPLETED"
    '"is_completed"' = "DB_FIELDS.RESEARCH_PROJECTS.IS_COMPLETED"
    "'completed_at'" = "DB_FIELDS.RESEARCH_PROJECTS.COMPLETED_AT"
    '"completed_at"' = "DB_FIELDS.RESEARCH_PROJECTS.COMPLETED_AT"
    
    # Colonies specific
    "'founded_at'" = "DB_FIELDS.COLONIES.FOUNDED_AT"
    '"founded_at"' = "DB_FIELDS.COLONIES.FOUNDED_AT"
}

# Find all TypeScript and JavaScript files
$allFiles = @()
foreach ($dir in $baseDirs) {
    if (Test-Path $dir) {
        $files = Get-ChildItem -Path $dir -Recurse -Include "*.ts", "*.tsx", "*.js", "*.jsx" | 
                 Where-Object { 
                     $exclude = $false
                     foreach ($pattern in $excludePatterns) {
                         if ($_.FullName -like "*$pattern*") {
                             $exclude = $true
                             break
                         }
                     }
                     !$exclude
                 }
        $allFiles += $files
    }
}

Write-Host "Found $($allFiles.Count) files to process for database field cleanup"

foreach ($file in $allFiles) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    $originalContent = $content
    $fileReplacements = 0
    
    # Apply each replacement
    foreach ($pattern in $dbFieldReplacements.Keys) {
        $replacement = $dbFieldReplacements[$pattern]
        $beforeCount = ([regex]::Matches($content, [regex]::Escape($pattern))).Count
        $content = $content -replace [regex]::Escape($pattern), $replacement
        $afterCount = ([regex]::Matches($content, [regex]::Escape($pattern))).Count
        $replacements = $beforeCount - $afterCount
        $fileReplacements += $replacements
    }
    
    # Write back if changes were made
    if ($content -ne $originalContent) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $totalReplacements += $fileReplacements
        $filesModified += $file.FullName
        Write-Host "Modified: $($file.FullName) ($fileReplacements replacements)"
    }
}

Write-Host ""
Write-Host "Bulk database field cleanup completed!"
Write-Host "Total replacements: $totalReplacements"
Write-Host "Files modified: $($filesModified.Count)"

if ($filesModified.Count -gt 0) {
    Write-Host ""
    Write-Host "Modified files:"
    foreach ($file in $filesModified) {
        Write-Host "  $file"
    }
}