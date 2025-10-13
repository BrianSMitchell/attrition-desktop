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

# Common database field names to look for (as simple string patterns)
$dbFieldNames = @(
    "user_id", "empire_id", "location_coord", "catalog_key", "tech_key", "unit_key", "defense_key",
    "fleet_id", "from_coord", "to_coord", "owner_id", "balance_after",
    "id", "name", "email", "username", "password", "level", "status", "type", "amount", "credits", "energy",
    "created_at", "updated_at", "started_at", "completed_at", "arrives_at", "founded_at", "completes_at",
    "construction_started", "construction_completed", "credits_cost",
    "territories", "home_system", "is_active", "is_completed", "pending_upgrade",
    "result", "system_name", "planet_type", "subject", "content", "read"
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
    
    foreach ($fieldName in $dbFieldNames) {
        # Look for the field in quotes (SQL queries)
        $quotedPattern = "[`'`"]$fieldName[`'`"]"
        $quotedMatches = [regex]::Matches($content, $quotedPattern)
        
        # Look for object property access
        $propPattern = "\.$fieldName\b(?![`w`.])"
        $propMatches = [regex]::Matches($content, $propPattern)
        
        $allMatches = $quotedMatches + $propMatches
        
        foreach ($match in $allMatches) {
            # Skip if it's already using DB_FIELDS or DB_TABLES
            $context = $content.Substring([Math]::Max(0, $match.Index - 50), [Math]::Min(100, $content.Length - [Math]::Max(0, $match.Index - 50)))
            if ($context -match "DB_FIELDS|DB_TABLES") { continue }
            
            # Skip obvious false positives
            if ($context -match "console\.|Math\.|Object\.|Array\.|String\.|JSON\.") { continue }
            if ($context -match "\.prototype\.|\.length|\.toString|\.valueOf") { continue }
            
            $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Length
            $matchContext = $match.Value
            
            $fileMatches += "Line $lineNumber : $fieldName ($matchContext)"
        }
    }
    
    if ($fileMatches.Count -gt 0) {
        $totalMatches += $fileMatches.Count
        $matchingFiles += $file.FullName
        
        Write-Host ""
        Write-Host "Hardcoded database fields in $($file.FullName):" -ForegroundColor Yellow
        foreach ($match in ($fileMatches | Select-Object -Unique | Select-Object -First 10)) {
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
    Write-Host "Files with database field references (first 20):"
    $matchingFiles | Select-Object -First 20 | ForEach-Object {
        Write-Host "  $_"
    }
}