# Apply RLS Migration to Supabase Production Database
# This script helps you safely apply the RLS migration

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Attrition RLS Migration Applicator" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$migrationFile = Join-Path $PSScriptRoot "..\supabase\migrations\20250507_enable_rls_policies.sql"

# Check if migration file exists
if (-not (Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found!" -ForegroundColor Red
    Write-Host "Expected location: $migrationFile" -ForegroundColor Yellow
    exit 1
}

Write-Host "Migration file found!" -ForegroundColor Green
Write-Host "Location: $migrationFile`n" -ForegroundColor Gray

# Read the migration file
$migrationContent = Get-Content $migrationFile -Raw
$lineCount = ($migrationContent -split "`n").Count

Write-Host "Migration Statistics:" -ForegroundColor Cyan
Write-Host "- Lines: $lineCount" -ForegroundColor White
Write-Host "- Size: $([math]::Round((Get-Item $migrationFile).Length / 1KB, 2)) KB`n" -ForegroundColor White

Write-Host "This migration will:" -ForegroundColor Yellow
Write-Host "1. Enable Row Level Security on all 14 tables" -ForegroundColor White
Write-Host "2. Create helper functions (is_admin, get_user_empire_id)" -ForegroundColor White
Write-Host "3. Add comprehensive security policies" -ForegroundColor White
Write-Host "4. Grant necessary permissions`n" -ForegroundColor White

Write-Host "IMPORTANT PRE-FLIGHT CHECKS:" -ForegroundColor Red
Write-Host "- Have you backed up your Supabase database?" -ForegroundColor Yellow
Write-Host "- Are you applying this to the correct environment?" -ForegroundColor Yellow
Write-Host "- Have you reviewed the policies in the migration file?" -ForegroundColor Yellow
Write-Host ""

# Ask for confirmation
$confirmation = Read-Host "Do you want to proceed? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "`nMigration cancelled by user." -ForegroundColor Red
    exit 0
}

Write-Host "`nChoose your application method:`n" -ForegroundColor Cyan
Write-Host "1. Copy to clipboard (recommended - paste in Supabase Dashboard)" -ForegroundColor White
Write-Host "2. Open file in default editor" -ForegroundColor White
Write-Host "3. Display path only" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-3)"

switch ($choice) {
    "1" {
        # Copy to clipboard
        Set-Clipboard -Value $migrationContent
        Write-Host "`nMigration SQL copied to clipboard!" -ForegroundColor Green
        Write-Host "`nNext steps:" -ForegroundColor Cyan
        Write-Host "1. Go to https://app.supabase.com" -ForegroundColor White
        Write-Host "2. Select your Attrition project" -ForegroundColor White
        Write-Host "3. Navigate to 'SQL Editor' in the left sidebar" -ForegroundColor White
        Write-Host "4. Click 'New Query'" -ForegroundColor White
        Write-Host "5. Paste the SQL (Ctrl+V)" -ForegroundColor White
        Write-Host "6. Click 'Run' or press Ctrl+Enter" -ForegroundColor White
        Write-Host "`nThe migration is now in your clipboard and ready to paste!`n" -ForegroundColor Green
        
        # Ask if they want to open the browser
        $openBrowser = Read-Host "Would you like to open Supabase Dashboard now? (yes/no)"
        if ($openBrowser -eq "yes") {
            Start-Process "https://app.supabase.com"
            Write-Host "Opening Supabase Dashboard..." -ForegroundColor Green
        }
    }
    "2" {
        # Open in default editor
        Write-Host "`nOpening migration file in default editor..." -ForegroundColor Cyan
        Start-Process $migrationFile
        Write-Host "`nFile opened!" -ForegroundColor Green
        Write-Host "Copy the contents and paste into Supabase SQL Editor." -ForegroundColor White
    }
    "3" {
        # Display path
        Write-Host "`nMigration file location:" -ForegroundColor Cyan
        Write-Host "$migrationFile`n" -ForegroundColor White
        
        # Copy path to clipboard
        Set-Clipboard -Value $migrationFile
        Write-Host "Path copied to clipboard!" -ForegroundColor Green
    }
    default {
        Write-Host "`nInvalid choice. Please run the script again.`n" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Post-Migration Verification" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "After applying the migration, run these verification queries in Supabase SQL Editor:`n" -ForegroundColor White

Write-Host "-- 1. Check RLS is enabled on all tables" -ForegroundColor Gray
Write-Host "SELECT tablename, rowsecurity " -ForegroundColor Gray
Write-Host "FROM pg_tables " -ForegroundColor Gray
Write-Host "WHERE schemaname = 'public' " -ForegroundColor Gray
Write-Host "ORDER BY tablename;`n" -ForegroundColor Gray

Write-Host "-- 2. Count policies (should be 40+)" -ForegroundColor Gray
Write-Host "SELECT COUNT(*) as policy_count " -ForegroundColor Gray
Write-Host "FROM pg_policies " -ForegroundColor Gray
Write-Host "WHERE schemaname = 'public';`n" -ForegroundColor Gray

Write-Host "-- 3. Verify helper functions exist" -ForegroundColor Gray
Write-Host "SELECT routine_name " -ForegroundColor Gray
Write-Host "FROM information_schema.routines " -ForegroundColor Gray
Write-Host "WHERE routine_schema = 'public' " -ForegroundColor Gray
Write-Host "AND routine_name IN ('is_admin', 'get_user_empire_id');`n" -ForegroundColor Gray

Write-Host "Additional Resources:" -ForegroundColor Cyan
Write-Host "- Full documentation: docs\RLS_POLICIES.md" -ForegroundColor White
Write-Host "- Quick start guide: docs\RLS_QUICKSTART.md" -ForegroundColor White
Write-Host "- Migration file: supabase\migrations\20250507_enable_rls_policies.sql`n" -ForegroundColor White

Write-Host "Done! Your migration is ready to apply.`n" -ForegroundColor Green
