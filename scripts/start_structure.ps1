param(
  [Parameter(Mandatory=$true)][string]$Coord,
  [Parameter(Mandatory=$true)][string]$Key
)

$ErrorActionPreference = 'Stop'
. 'C:\Projects\Attrition\scripts\attrition-profile.ps1'

function Ensure-Bearer {
  if (-not (Test-Path Env:BEARER_TOKEN) -or [string]::IsNullOrWhiteSpace($env:BEARER_TOKEN)) {
    if ((Test-Path Env:TEST_EMAIL) -and (Test-Path Env:TEST_PASSWORD) -and (Test-Path Env:SUPABASE_ANON_KEY) -and (Test-Path Env:SUPABASE_URL)) {
      powershell -NoProfile -ExecutionPolicy Bypass -File 'C:\Projects\Attrition\scripts\get_access_token.ps1' | Out-Null
    }
  }
  if (-not (Test-Path Env:BEARER_TOKEN) -or [string]::IsNullOrWhiteSpace($env:BEARER_TOKEN)) {
    Write-Error 'BEARER_TOKEN not set. Run scripts\get_access_token.ps1 or add TEST_EMAIL/TEST_PASSWORD to env file.'
    exit 1
  }
}

if (-not (Test-Path Env:RENDER_API_URL) -or [string]::IsNullOrWhiteSpace($env:RENDER_API_URL)) {
  Write-Error 'RENDER_API_URL is not set in your env file.'
  exit 1
}

Ensure-Bearer

$base = $env:RENDER_API_URL.TrimEnd('/')
$uri = "$base/api/game/bases/$Coord/structures/$Key/construct"
$headers = @{ Authorization = ('Bearer ' + $env:BEARER_TOKEN) }

try {
  $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ErrorAction Stop
  Write-Output 'REQUEST_STATUS=200_OK'
  if ($resp -and $resp.message) { Write-Output ("MESSAGE=" + $resp.message) }
  if ($resp -and $resp.success -ne $null) { Write-Output ("SUCCESS=" + $resp.success) }
} catch {
  $status = $null
  $body = $null
  try {
    $status = $_.Exception.Response.StatusCode.value__
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd()
  } catch {}
  if ($status) { Write-Output ("REQUEST_STATUS=" + $status) } else { Write-Output 'REQUEST_STATUS=ERROR' }
  if ($body) { Write-Output ("BODY=" + $body) }
}
