param(
  [string]$ServiceName = "attrition-game",
  [int]$Lines = 200
)

# Fetch Render logs via REST API using RENDER_API_KEY from environment.
# Prints JSON logs (if API supports), or errors with a helpful message.

if ([string]::IsNullOrEmpty($env:RENDER_API_KEY)) {
  Write-Error "RENDER_API_KEY environment variable is not set."
  exit 1
}

$headers = @{ Authorization = "Bearer $env:RENDER_API_KEY" }

try {
  $servicesResp = Invoke-WebRequest -UseBasicParsing -Headers $headers -Uri 'https://api.render.com/v1/services' -TimeoutSec 20
  $services = $servicesResp.Content | ConvertFrom-Json
} catch {
  Write-Error "Failed to list Render services. $_"
  exit 1
}

$svc = $services | Where-Object { $_.name -eq $ServiceName } | Select-Object -First 1
if (-not $svc) {
  Write-Error "Service '$ServiceName' not found in Render account."
  exit 1
}

try {
  $instResp = Invoke-WebRequest -UseBasicParsing -Headers $headers -Uri ("https://api.render.com/v1/services/{0}/instances" -f $svc.id) -TimeoutSec 20
  $instances = $instResp.Content | ConvertFrom-Json
} catch {
  Write-Error "Failed to list instances for service '$ServiceName'. $_"
  exit 1
}

$inst = $instances | Select-Object -First 1
if (-not $inst) {
  Write-Error "No instances found for service '$ServiceName'."
  exit 1
}

try {
  $logsUrl = "https://api.render.com/v1/instances/{0}/logs?limit={1}" -f $inst.id, $Lines
  $logsResp = Invoke-WebRequest -UseBasicParsing -Headers $headers -Uri $logsUrl -TimeoutSec 20
  $logsResp.Content | Write-Output
} catch {
  Write-Error "Failed to fetch logs for instance $($inst.id). $_"
  exit 1
}
