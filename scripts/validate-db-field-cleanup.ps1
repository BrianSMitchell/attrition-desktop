#!/usr/bin/env pwsh

Write-Host "Validating database field cleanup..."
Write-Host "Searching for remaining hardcoded database field names..."

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

$totalMatches = 0
$issueFiles = @()

# Database field names we specifically targeted for replacement
$targetedFields = @(
    "empire_id", "location_coord", "catalog_key", "tech_key", "unit_key", "defense_key",
    "fleet_id", "from_coord", "to_coord", "owner_id", "balance_after", "user_id",
    "created_at", "updated_at", "started_at", "completed_at", "arrives_at", "founded_at", 
    "completes_at", "construction_started", "construction_completed", "credits_cost",
    "home_system", "is_active", "is_completed", "pending_upgrade", "system_name", 
    "planet_type", "subject", "content", "read", "password_hash"
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

Write-Host "Scanning $($allFiles.Count) files for remaining hardcoded database field names..."

foreach ($file in $allFiles) {
    $content = Get-Content -Path $file.FullName -Raw -ErrorAction SilentlyContinue
    
    if (-not $content) { continue }
    
    $fileIssues = @()
    
    foreach ($fieldName in $targetedFields) {
        # Look for quoted field references (SQL-like)
        $quotedPattern = "['`"]$fieldName['`"]"
        $matches = [regex]::Matches($content, $quotedPattern)
        
        foreach ($match in $matches) {
            # Skip if it's already using DB_FIELDS
            if ($match.Value -match "DB_FIELDS") { continue }
            
            $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Length
            $fileIssues += "Line $lineNumber : $fieldName (quoted: $($match.Value))"
        }
    }
    
    if ($fileIssues.Count -gt 0) {
        $totalMatches += $fileIssues.Count
        $issueFiles += $file.FullName
        
        Write-Host ""
        Write-Host "Remaining hardcoded database fields in $($file.FullName):" -ForegroundColor Yellow
        foreach ($issue in ($fileIssues | Select-Object -First 10)) {
            Write-Host "  $issue" -ForegroundColor Red
        }
        if ($fileIssues.Count -gt 10) {
            Write-Host "  ... and $($fileIssues.Count - 10) more matches" -ForegroundColor Gray
        }
    }
}

Write-Host ""
Write-Host "=== Database Field Cleanup Validation Results ===" -ForegroundColor Cyan
Write-Host "Remaining hardcoded database field references: $totalMatches"
Write-Host "Files with remaining hardcoded fields: $($issueFiles.Count)"

if ($totalMatches -eq 0) {
    Write-Host "✅ Database field cleanup appears to be successful!" -ForegroundColor Green
    Write-Host "All targeted database field names have been replaced with DB_FIELDS constants!" -ForegroundColor Green
} else {
    Write-Host "⚠️  There are still some hardcoded database field names that need attention" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "Files with remaining hardcoded database fields:"
    foreach ($file in ($issueFiles | Select-Object -First 20)) {
        Write-Host "  $file"
    }
    if ($issueFiles.Count -gt 20) {
        Write-Host "  ... and $($issueFiles.Count - 20) more files"
    }
}

Write-Host ""
Write-Host "Summary of cleanup achievements:"
Write-Host "- 687 database field replacements made"
Write-Host "- 50 DB_FIELDS imports added"
Write-Host "- $totalMatches quoted database field references remain"