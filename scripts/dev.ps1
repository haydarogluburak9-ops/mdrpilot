# Start Next.js dev server with .env DATABASE_URL (overrides broken system env).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$envFile = Join-Path $root ".env"
if (Test-Path $envFile) {
  Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
      $key = $matches[1].Trim()
      $val = $matches[2].Trim().Trim('"').Trim("'")
      if ($key -eq "DATABASE_URL") {
        $env:DATABASE_URL = $val
      }
    }
  }
}

if (-not $env:DATABASE_URL) {
  Write-Error "DATABASE_URL not found in .env"
}

# Free port 3000 so the app is always at http://localhost:3000
$port = 3000
Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }

Write-Host "MDRpilot dev: http://localhost:$port" -ForegroundColor Cyan
npx next dev -p $port
