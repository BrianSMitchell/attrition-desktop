# PowerShell wrapper for GitHub Release creation
# Usage: .\Create-GitHubRelease.ps1 -Version "v1.0.10" -InstallerPath "packages/releases/Attrition-Setup-1.0.10.exe"

param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$true)]
    [string]$InstallerPath,
    
    [string]$Repo = "BrianSMitchell/attrition-game",
    
    [string]$ReleaseNotes = ""
)

# Check if Python is available
try {
    python --version | Out-Null
} catch {
    Write-Error "Python is not installed or not in PATH. Please install Python 3.6+ and try again."
    exit 1
}

# Check if requests module is available
try {
    python -c "import requests" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installing required Python package 'requests'..." -ForegroundColor Yellow
        python -m pip install requests
    }
} catch {
    Write-Error "Failed to install required Python packages."
    exit 1
}

# Check for GitHub token
if (-not $env:GITHUB_PAT -and -not $env:GITHUB_TOKEN) {
    Write-Error "GITHUB_PAT or GITHUB_TOKEN environment variable not set."
    Write-Host "Generate a token at: https://github.com/settings/tokens" -ForegroundColor Yellow
    exit 1
}

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$PythonScript = Join-Path $ScriptDir "github-release.py"

if (-not (Test-Path $PythonScript)) {
    Write-Error "Python script not found: $PythonScript"
    exit 1
}

# Run the Python script
Write-Host "Creating GitHub release for $Repo version $Version..." -ForegroundColor Green

if ($ReleaseNotes) {
    python $PythonScript $Repo $Version $InstallerPath $ReleaseNotes
} else {
    python $PythonScript $Repo $Version $InstallerPath
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Release created successfully!" -ForegroundColor Green
} else {
    Write-Error "Failed to create release. Exit code: $LASTEXITCODE"
    exit $LASTEXITCODE
}
