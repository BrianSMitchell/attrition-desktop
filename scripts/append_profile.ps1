$ErrorActionPreference = 'Stop'
$p = $PROFILE
$dir = Split-Path -Parent $p
if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
if (!(Test-Path $p)) { New-Item -ItemType File -Path $p -Force | Out-Null }
$line = ". 'C:\Projects\Attrition\scripts\attrition-profile.ps1'"
$exists = Select-String -Path $p -Pattern ([regex]::Escape($line)) -Quiet -ErrorAction SilentlyContinue
if (-not $exists) {
  Add-Content -Path $p -Value "`n$line`n"
  Write-Output 'PROFILE_APPENDED'
} else {
  Write-Output 'PROFILE_ALREADY_CONTAINS'
}
Write-Output ("PROFILE_PATH=" + $p)
