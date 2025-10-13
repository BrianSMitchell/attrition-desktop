#!/usr/bin/env pwsh

Write-Host "Scanning for hardcoded database field names..."

# Define base directories to search
$baseDirs = @(
    "packages\server\src",
    "packages\shared\src", 
    "tests",
    "scripts"
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

$totalMatches = 0
$matchingFiles = @()

# Common database field patterns to look for
$dbFieldPatterns = @(
    # SQL-like field references in queries
    "['`"]([a-z_]+_id)['`"]"
    "['\"](id)['\"]",                    # Primary key 'id'
    "['\"](name)['\"]",                  # Common 'name' field
    "['\"](email)['\"]",                 # Email field
    "['\"](username)['\"]",              # Username field
    "['\"](password)['\"]",              # Password field
    "['\"](created_at)['\"]",            # Timestamp fields
    "['\"](updated_at)['\"]",
    "['\"](started_at)['\"]",
    "['\"](completed_at)['\"]",
    "['\"](arrives_at)['\"]",
    "['\"](founded_at)['\"]",
    "['\"](completes_at)['\"]",
    "['\"](location_coord)['\"]",        # Game-specific fields
    "['\"](catalog_key)['\"]",
    "['\"](tech_key)['\"]",
    "['\"](unit_key)['\"]",
    "['\"](defense_key)['\"]",
    "['\"](level)['\"]",
    "['\"](status)['\"]",
    "['\"](type)['\"]",
    "['`"](name)['`"]"
    "['\"](credits)['\"]",
    "['\"](energy)['\"]",
    "['\"](territories)['\"]",
    "['\"](home_system)['\"]",
    "['\"](is_active)['\"]",
    "['\"](is_completed)['\"]",
    "['\"](pending_upgrade)['\"]",
    "['\"](construction_started)['\"]",
    "['\"](construction_completed)['\"]",
    "['\"](credits_cost)['\"]",
    "['\"](balance_after)['\"]",
    "['\"](owner_id)['\"]",
    "['\"](result)['\"]",
    "['`"](username)['`"]"
    "['\"](planet_type)['\"]",
    "['\"](subject)['\"]",
    "['\"](content)['\"]",
    "['`"](password)['`"]"
]"
    "['\"](fleet_id)['\"]",
    "['\"](from_coord)['\"]",
    "['\"](to_coord)['\"]",
    
    # Object property access patterns
    "\.([a-z_]+_id)\b(?![\w.])",         # obj.user_id
    "\.id\b(?![\w.])",                   # obj.id 
    "\.name\b(?![\w.])",                 # obj.name
    "\.email\b(?![\w.])",                # obj.email
    "\.username\b(?![\w.])",             # obj.username
    "\.created_at\b(?![\w.])",           # obj.created_at
    "\.updated_at\b(?![\w.])",           # obj.updated_at
    "\.level\b(?![\w.])",                # obj.level
    "\.status\b(?![\w.])",               # obj.status
    "\.credits\b(?![\w.])",              # obj.credits
    "\.energy\b(?![\w.])"                # obj.energy
)

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

Write-Host "Found $($allFiles.Count) files to scan for hardcoded database fields"

foreach ($file in $allFiles) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    # Skip if file already imports DB_FIELDS
    if ($content -match "import.*DB_FIELDS") { continue }
    
    $fileMatches = @()
    
    foreach ($pattern in $dbFieldPatterns) {
        $matches = [regex]::Matches($content, $pattern)
        foreach ($match in $matches) {
            $fieldName = if ($match.Groups.Count -gt 1) { $match.Groups[1].Value } else { $match.Value }
            
            # Skip if it's already using DB_FIELDS or DB_TABLES
            if ($match.Value -match "DB_FIELDS|DB_TABLES") { continue }
            
            # Skip common false positives
            if ($fieldName -in @("length", "prototype", "constructor", "toString", "valueOf")) { continue }
            
            $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Length
            $context = $match.Value
            
            $fileMatches += "Line $lineNumber : $fieldName ($context)"
        }
    }
    
    if ($fileMatches.Count -gt 0) {
        $totalMatches += $fileMatches.Count
        $matchingFiles += $file.FullName
        
        Write-Host ""
        Write-Host "Hardcoded database fields in $($file.FullName):" -ForegroundColor Yellow
        foreach ($match in ($fileMatches | Select-Object -First 10)) {
            Write-Host "  $match" -ForegroundColor Red
        }
        if ($fileMatches.Count -gt 10) {
            Write-Host "  ... and $($fileMatches.Count - 10) more matches" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "=== Database Field Scan Results ===" -ForegroundColor Cyan
Write-Host "Total hardcoded database field references: $totalMatches"
Write-Host "Files with hardcoded fields: $($matchingFiles.Count)"

if ($matchingFiles.Count -gt 0) {
    Write-Host ""
    Write-Host "Files with most database field references (first 20):"
    $matchingFiles | Select-Object -First 20 | ForEach-Object {
        Write-Host "  $_"
    }
}