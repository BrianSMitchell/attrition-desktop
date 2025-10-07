# Lists Render services using the REST API and prints id and name.
if ([string]::IsNullOrEmpty($env:RENDER_API_KEY)) {
  Write-Error "RENDER_API_KEY environment variable is not set."
  exit 1
}
$headers = @{ Authorization = "Bearer $env:RENDER_API_KEY" }
try {
  $servicesResp = Invoke-WebRequest -UseBasicParsing -Headers $headers -Uri 'https://api.render.com/v1/services' -TimeoutSec 20
  Write-Output ("status-code: {0}" -f $servicesResp.StatusCode)
  $raw = $servicesResp.Content
  if ([string]::IsNullOrWhiteSpace($raw)) {
    Write-Output "raw-response: (empty)"
    exit 0
  }
  try {
    $services = $raw | ConvertFrom-Json
    if ($services -and $services.Count -gt 0) {
      $services | ForEach-Object { Write-Output ("{0} {1}" -f $_.id, $_.name) }
    } else {
      Write-Output "no-services"
    }
  } catch {
    Write-Output "raw-response:"; Write-Output $raw
  }
} catch {
  Write-Error "Failed to list Render services. $_"
  exit 1
}
