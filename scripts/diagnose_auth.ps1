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

$u = ($env:SUPABASE_URL.TrimEnd('/')) + '/auth/v1/signup'
$body = @{ email = $env:TEST_EMAIL; password = $env:TEST_PASSWORD } | ConvertTo-Json
$headers = @{
  apikey        = $env:SUPABASE_ANON_KEY
  Authorization = "Bearer $($env:SUPABASE_ANON_KEY)"
  'Content-Type' = 'application/json'
}

try {
  $resp = Invoke-RestMethod -Method Post -Uri $u -Headers $headers -Body $body -ErrorAction Stop
  Write-Output 'SIGNUP=OK'
  if ($resp.user) { Write-Output 'SIGNUP_USER_PRESENT=YES' } else { Write-Output 'SIGNUP_USER_PRESENT=NO' }
} catch {
  $status = $null
  $bodyText = $null
  try {
    if ($_.Exception.Response) {
      $status = $_.Exception.Response.StatusCode.value__
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) { $reader = New-Object System.IO.StreamReader($stream); $bodyText = $reader.ReadToEnd() }
    }
  } catch {}
  Write-Output 'SIGNUP=FAILED'
  if ($status) { Write-Output ("SIGNUP_STATUS=HTTP {0}" -f $status) }
  if ($bodyText) { Write-Output ("SIGNUP_ERROR_BODY=" + $bodyText) }
  exit 1
}
