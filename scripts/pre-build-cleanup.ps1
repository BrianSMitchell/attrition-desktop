#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Cleans up Electron and Node processes before building to prevent file locks.

.DESCRIPTION
    This script stops all running Electron and Node processes to release file locks
    on native modules like better-sqlite3, which prevents EPERM errors during builds.

.PARAMETER Force
    Force kill processes without confirmation

.PARAMETER DryRun
    Show what processes would be killed without actually killing them

.PARAMETER Verbose
    Show detailed information about processes

.EXAMPLE
    .\scripts\pre-build-cleanup.ps1
    
.EXAMPLE
    .\scripts\pre-build-cleanup.ps1 -Force
    
.EXAMPLE
    .\scripts\pre-build-cleanup.ps1 -DryRun -Verbose
#>

[CmdletBinding()]
param(
    [Parameter()]
    [switch]$Force,
    
    [Parameter()]
    [switch]$DryRun,
    
    [Parameter()]
    [switch]$Verbose
)

# Set error action preference
$ErrorActionPreference = 'Continue'

# Color output functions
function Write-ColorOutput {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter()]
        [ValidateSet('Success', 'Error', 'Warning', 'Info')]
        [string]$Type = 'Info'
    )
    
    $color = switch ($Type) {
        'Success' { 'Green' }
        'Error'   { 'Red' }
        'Warning' { 'Yellow' }
        'Info'    { 'Cyan' }
    }
    
    Write-Host $Message -ForegroundColor $color
}

# Main execution
function Main {
    Write-ColorOutput "`n🧹 Pre-Build Cleanup Script" -Type Info
    Write-ColorOutput "=" * 50 -Type Info
    
    # Find processes
    Write-ColorOutput "`n🔍 Searching for Electron and Node processes..." -Type Info
    
    # Get current process ID to exclude it
    $currentPid = $PID
    
    $electronProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $_.ProcessName -like "*electron*" -and $_.Id -ne $currentPid
    }
    
    $nodeProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $_.ProcessName -like "*node*" -and $_.Id -ne $currentPid
    }
    
    $allProcesses = @($electronProcesses) + @($nodeProcesses)
    
    if ($allProcesses.Count -eq 0) {
        Write-ColorOutput "`n✅ No Electron or Node processes found. Build environment is clean!" -Type Success
        return
    }
    
    # Display found processes
    Write-ColorOutput "`n📋 Found $($allProcesses.Count) process(es):" -Type Warning
    
    if ($Verbose) {
        $allProcesses | Format-Table -AutoSize ProcessName, Id, StartTime, WorkingSet64, Path
    } else {
        $groupedProcesses = $allProcesses | Group-Object ProcessName | ForEach-Object {
            [PSCustomObject]@{
                ProcessName = $_.Name
                Count = $_.Count
                PIDs = ($_.Group | ForEach-Object { $_.Id }) -join ', '
            }
        }
        $groupedProcesses | Format-Table -AutoSize
    }
    
    # Dry run mode
    if ($DryRun) {
        Write-ColorOutput "`n🔍 DRY RUN MODE: Would kill $($allProcesses.Count) process(es)" -Type Warning
        Write-ColorOutput "Run without -DryRun to actually stop these processes" -Type Info
        return
    }
    
    # Confirmation prompt (unless Force is used)
    if (-not $Force) {
        Write-ColorOutput "`n⚠️  Warning: This will forcefully terminate all Electron and Node processes!" -Type Warning
        $confirmation = Read-Host "Do you want to continue? (y/N)"
        
        if ($confirmation -notmatch '^[Yy]$') {
            Write-ColorOutput "`n❌ Operation cancelled by user" -Type Error
            return
        }
    }
    
    # Kill processes
    Write-ColorOutput "`n🔨 Stopping processes..." -Type Info
    
    $successCount = 0
    $failCount = 0
    
    foreach ($process in $allProcesses) {
        try {
            Stop-Process -Id $process.Id -Force -ErrorAction Stop
            $successCount++
            if ($Verbose) {
                Write-ColorOutput "  ✓ Stopped $($process.ProcessName) (PID: $($process.Id))" -Type Success
            }
        }
        catch {
            $failCount++
            if ($Verbose) {
                Write-ColorOutput "  ✗ Failed to stop $($process.ProcessName) (PID: $($process.Id)): $($_.Exception.Message)" -Type Error
            }
        }
    }
    
    if (-not $Verbose -and $successCount -gt 0) {
        Write-ColorOutput "  ✓ Stopped $successCount process(es)" -Type Success
    }
    
    # Wait a moment for processes to terminate
    Start-Sleep -Seconds 1
    
    # Verify cleanup
    Write-ColorOutput "`n🔍 Verifying cleanup..." -Type Info
    
    $remainingProcesses = Get-Process -ErrorAction SilentlyContinue | Where-Object {
        $_.ProcessName -like "*electron*" -or $_.ProcessName -like "*node*"
    }
    
    # Summary
    Write-ColorOutput "`n" + ("=" * 50) -Type Info
    Write-ColorOutput "📊 Summary:" -Type Info
    Write-ColorOutput "  • Processes found: $($allProcesses.Count)" -Type Info
    Write-ColorOutput "  • Successfully stopped: $successCount" -Type Success
    
    if ($failCount -gt 0) {
        Write-ColorOutput "  • Failed to stop: $failCount" -Type Error
    }
    
    if ($remainingProcesses.Count -eq 0) {
        Write-ColorOutput "`n✅ All processes cleaned up successfully!" -Type Success
        Write-ColorOutput "🚀 Build environment is ready!" -Type Success
    } else {
        Write-ColorOutput "`n⚠️  Warning: $($remainingProcesses.Count) process(es) still running:" -Type Warning
        $remainingProcesses | Format-Table -AutoSize ProcessName, Id
        Write-ColorOutput "You may need to manually stop these processes or restart your computer" -Type Warning
    }
    
    Write-ColorOutput "" -Type Info
}

# Run the script
Main