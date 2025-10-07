$ErrorActionPreference = 'Stop'
. 'C:\Projects\Attrition\scripts\attrition-profile.ps1'

$vars = @('SUPABASE_ACCESS_TOKEN','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_ANON_KEY','DB_TYPE')
foreach($k in $vars){ if (Test-Path Env:$k){ Write-Output ("$k=SET") } else { Write-Output ("$k=NOT_SET") } }

if (-not $env:SUPABASE_URL -or -not $env:SUPABASE_SERVICE_ROLE_KEY) {
  Write-Output 'BUILDINGS_TABLE=SKIPPED_MISSING_ENV'
  exit 0
}

# Safer existence check via PostgREST hitting the table directly.
$u = ($env:SUPABASE_URL.TrimEnd('/')) + '/rest/v1/buildings?select=id&limit=1'
$h = @{ apikey = $env:SUPABASE_SERVICE_ROLE_KEY; Authorization = ('Bearer ' + $env:SUPABASE_SERVICE_ROLE_KEY) }

try {
  $r = Invoke-RestMethod -Method GET -Uri $u -Headers $h -ErrorAction Stop
  # If the table exists, PostgREST returns 200 and an array (possibly empty)
  Write-Output 'BUILDINGS_TABLE=FOUND'
} catch {
  Write-Output 'BUILDINGS_TABLE=NOT_FOUND_OR_NO_ACCESS'
}
