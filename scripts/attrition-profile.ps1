function Import-EnvFile {
  param([Parameter(Mandatory=$true)][string]$Path)
  if (!(Test-Path $Path)) { return }
  Get-Content -Path $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq '' -or $line.StartsWith('#')) { return }
    $idx = $line.IndexOf('=')
    if ($idx -lt 1) { return }
    $key = $line.Substring(0, $idx).Trim()
    $val = $line.Substring($idx + 1).Trim()
    if ($val.StartsWith('"') -and $val.EndsWith('"')) { $val = $val.Substring(1, $val.Length-2) }
    if ($val.StartsWith("'") -and $val.EndsWith("'")) { $val = $val.Substring(1, $val.Length-2) }
    Set-Item -Path Env:$key -Value $val | Out-Null
  }
}

# Auto-load Attrition env file if present
$envFile = Join-Path $HOME '.secrets/attrition.env'
Import-EnvFile -Path $envFile
