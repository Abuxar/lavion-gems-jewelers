<#
  Push local server/.env into the linked Vercel project.

  Run `vercel link` once first, then:

      pwsh scripts/vercel-env.ps1 -Domain lavion-gems-jewelers.vercel.app

  Blank values in server/.env are skipped, so the unconfigured social
  providers stay absent in Vercel rather than being set to empty strings.
  PUBLIC_BASE_URL and ALLOWED_ORIGINS are overridden with -Domain, since the
  localhost values in server/.env would break CORS and email links in prod.
#>
param(
  [Parameter(Mandatory = $true)][string]$Domain,
  [ValidateSet('production', 'preview', 'development')][string]$Target = 'production'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$envFile = Join-Path $root 'server\.env'

if (-not (Test-Path $envFile)) { throw "server/.env not found at $envFile" }
if (-not (Test-Path (Join-Path $root '.vercel\project.json'))) {
  throw 'Project is not linked. Run `vercel link` in the project root first.'
}

$Domain = $Domain -replace '^https?://', '' -replace '/$', ''

# NODE_ENV is set by Vercel itself and cannot be overridden here.
$skip = @('NODE_ENV', 'PORT')

$values = [ordered]@{}
foreach ($line in Get-Content $envFile) {
  $line = $line.Trim()
  if (-not $line -or $line.StartsWith('#')) { continue }
  $i = $line.IndexOf('=')
  if ($i -lt 1) { continue }
  $key = $line.Substring(0, $i).Trim()
  $val = $line.Substring($i + 1).Trim().Trim('"')
  if ($skip -contains $key) { continue }
  if (-not $val) { continue }
  $values[$key] = $val
}

$values['PUBLIC_BASE_URL'] = "https://$Domain"
$values['ALLOWED_ORIGINS'] = "https://$Domain"

Push-Location $root
try {
  foreach ($key in $values.Keys) {
    # Remove first so a re-run updates instead of failing on a duplicate.
    try { vercel env rm $key $Target --yes 2>$null | Out-Null } catch {}
    $values[$key] | vercel env add $key $Target | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Failed to set $key" }
    Write-Host ("  set {0,-22} {1}" -f $key, $Target)
  }
} finally {
  Pop-Location
}

Write-Host ''
Write-Host "Done. $($values.Count) variables set for $Target."
Write-Host 'Redeploy for them to take effect:  vercel --prod'
