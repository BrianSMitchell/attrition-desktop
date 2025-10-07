param(
  [Parameter(Mandatory=$true)][string]$Container,
  [Parameter(Mandatory=$true)][string]$DbUser,
  [Parameter(Mandatory=$true)][string]$DbName,
  [string]$OutputDir = "."
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $OutputDir)) { New-Item -ItemType Directory -Path $OutputDir | Out-Null }

$schemaDump = Join-Path $OutputDir "schema_dump.sql"
$schemaJson = Join-Path $OutputDir "schema.json"

Write-Host "[dump-schema] Dumping DDL to $schemaDump" -ForegroundColor Cyan
docker exec -i $Container pg_dump -U $DbUser -d $DbName -n public -s --no-owner --no-privileges > $schemaDump

Write-Host "[dump-schema] Running schema_introspection.sql to $schemaJson" -ForegroundColor Cyan
# Expect schema_introspection.sql mounted at /var/tmp/schema_introspection.sql in the container
# Example: docker cp scripts/sql/schema_introspection.sql <container>:/var/tmp/schema_introspection.sql

docker exec -i $Container psql -U $DbUser -d $DbName -f /var/tmp/schema_introspection.sql > $schemaJson

Write-Host "[dump-schema] Done. Files written:" -ForegroundColor Green
Write-Host "  - $schemaDump"
Write-Host "  - $schemaJson"
