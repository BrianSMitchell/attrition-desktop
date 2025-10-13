#Requires -Version 5.1

<#
.SYNOPSIS
    GitHub Token Setup Script for Attrition Project
    
.DESCRIPTION
    This PowerShell script provides a secure way to set up your GitHub Personal Access Token.
    It will prompt you to paste your token and securely save it to your .env file.
    
.EXAMPLE
    .\scripts\setup-github-token.ps1
    
.EXAMPLE
    # If you prefer to run the Node.js version directly:
    node scripts/setup-github-token.js
#>

param(
    [switch]$Help
)

if ($Help) {
    Get-Help $MyInvocation.MyCommand.Definition -Full
    exit 0
}

# Colors for PowerShell output
function Write-ColorMessage {
    param(
        [string]$Message,
        [string]$ForegroundColor = "White"
    )
    Write-Host $Message -ForegroundColor $ForegroundColor
}

# Check if Node.js is available
try {
    $nodeVersion = node --version 2>$null
    if (-not $nodeVersion) {
        throw "Node.js not found"
    }
} catch {
    Write-ColorMessage "❌ Error: Node.js is not installed or not in PATH" "Red"
    Write-ColorMessage "" "White"
    Write-ColorMessage "Please install Node.js from https://nodejs.org/" "Yellow"
    Write-ColorMessage "Current project requires Node.js >= 18.0.0" "Yellow"
    exit 1
}

# Get the project root directory (assuming script is in scripts/ folder)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir

# Change to project root
Set-Location $projectRoot

Write-ColorMessage "" "White"
Write-ColorMessage "🚀 Starting GitHub Token Setup..." "Green"
Write-ColorMessage "" "White"

# Check if the Node.js setup script exists
$setupScript = Join-Path $projectRoot "scripts\setup-github-token.js"
if (-not (Test-Path $setupScript)) {
    Write-ColorMessage "❌ Setup script not found: $setupScript" "Red"
    exit 1
}

# Run the Node.js setup script
try {
    & node $setupScript
    $exitCode = $LASTEXITCODE
    
    if ($exitCode -eq 0) {
        Write-ColorMessage "" "White"
        Write-ColorMessage "✨ Setup completed successfully!" "Green"
        Write-ColorMessage "" "White"
        Write-ColorMessage "🔧 You can now use your GitHub token in the project:" "Cyan"
        Write-ColorMessage "   • Token is stored in .env file" "White"
        Write-ColorMessage "   • Use the helpers in config/github.js" "White"
        Write-ColorMessage "   • See examples/ directory for usage examples" "White"
        Write-ColorMessage "" "White"
    } else {
        Write-ColorMessage "❌ Setup failed with exit code: $exitCode" "Red"
        exit $exitCode
    }
} catch {
    Write-ColorMessage "❌ Error running setup script: $($_.Exception.Message)" "Red"
    exit 1
}