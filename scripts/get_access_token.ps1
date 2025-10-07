$ErrorActionPreference = 'Stop'
. 'C:\Projects\Attrition\scripts\attrition-profile.ps1'

function Require-Env([string]$Name) {
  if (-not (Test-Path Env:$Name) -or [string]::IsNullOrWhiteSpace((Get-Item Env:$Name).Value)) {
    Write-Error "$Name is not set. Add it to C:\Users\roand\.secrets\attrition.env and reload."
    exit 1
  }
}

Require-Env 'SUPABASE_URL'
Require-Env 'SUPABASE_ANON_KEY'
Require-Env 'TEST_EMAIL'
Require-Env 'TEST_PASSWORD'

$u = ($env:SUPABASE_URL.TrimEnd('/')) + '/auth/v1/token?grant_type=password'
$body = @{ email = $env:TEST_EMAIL; password = $env:TEST_PASSWORD } | ConvertTo-Json
$headers = @{
  apikey       = $env:SUPABASE_ANON_KEY
  Authorization = "Bearer $($env:SUPABASE_ANON_KEY)"
  'Content-Type' = 'application/json'
}

try {
  $resp = Invoke-RestMethod -Method Post -Uri $u -Headers $headers -Body $body -ErrorAction Stop
  $token = $resp.access_token
  if ([string]::IsNullOrWhiteSpace($token)) { Write-Error 'No access_token returned.'; exit 1 }
  Set-Item -Path Env:BEARER_TOKEN -Value $token | Out-Null
  Write-Output 'BEARER_TOKEN=SET'
  if ($resp.expires_in) { Write-Output ('EXPIRES_IN=' + $resp.expires_in) }
} catch {
  Write-Output 'BEARER_TOKEN=FAILED'
  # Try to parse error details without exposing secrets
  $status = $null
  $bodyText = $null
  $errJson = $null
  try {
    if ($_.Exception.Response) {
      $status = $_.Exception.Response.StatusCode.value__
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) { $reader = New-Object System.IO.StreamReader($stream); $bodyText = $reader.ReadToEnd() }
    }
  } catch {}
  try { if ($bodyText) { $errJson = $bodyText | ConvertFrom-Json } } catch {}

  if ($errJson -and $errJson.error_code -eq 'invalid_credentials') {
    Write-Error "Invalid credentials. Update TEST_EMAIL/TEST_PASSWORD in C:\Users\roand\.secrets\attrition.env or confirm the user in Supabase Auth UI."
  } else {
    if ($status) {
      Write-Error ("Auth request failed (HTTP {0})." -f $status)
    }
    if ($bodyText) {
      Write-Error ("Response body: {0}" -f $bodyText)
    }
  }
  exit 1
}
