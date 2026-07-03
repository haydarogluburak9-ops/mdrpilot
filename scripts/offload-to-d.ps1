# Moves heavy, reproducible folders off OneDrive to D: and links them back.
# Safe to re-run: skips paths that are already junctions.
param(
  [string]$ProjectRoot = (Split-Path $PSScriptRoot -Parent),
  [string]$CacheRoot = "D:\medikal-app-cache"
)

$ErrorActionPreference = "Stop"
$ProjectName = "medikal-app"
$TargetBase = Join-Path $CacheRoot $ProjectName

function Test-IsJunction([string]$Path) {
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  $item = Get-Item -LiteralPath $Path -Force
  return ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0
}

function Move-And-Junction([string]$RelativePath) {
  $src = Join-Path $ProjectRoot $RelativePath
  if (-not (Test-Path -LiteralPath $src)) {
    Write-Host "[skip] missing: $RelativePath"
    return
  }
  if (Test-IsJunction $src) {
    Write-Host "[ok] already on D:: $RelativePath"
    return
  }

  $dst = Join-Path $TargetBase $RelativePath
  $dstParent = Split-Path $dst -Parent
  if (-not (Test-Path $dstParent)) {
    New-Item -ItemType Directory -Path $dstParent -Force | Out-Null
  }
  if (Test-Path -LiteralPath $dst) {
    Remove-Item -LiteralPath $dst -Recurse -Force
  }

  Write-Host "[move] $RelativePath -> $dst"
  Move-Item -LiteralPath $src -Destination $dst -Force
  New-Item -ItemType Junction -Path $src -Target $dst | Out-Null
  Write-Host "[link] $RelativePath"
}

Write-Host "Project: $ProjectRoot"
Write-Host "Cache:   $TargetBase"
New-Item -ItemType Directory -Path $TargetBase -Force | Out-Null

# Reproducible / generated — safe on D:
$folders = @(
  "node_modules",
  ".next",
  "storage\exports",
  "storage\uploads"
)

foreach ($f in $folders) {
  Move-And-Junction $f
}

# npm download cache (user-level, speeds reinstalls)
$npmCache = Join-Path $CacheRoot "npm-cache"
New-Item -ItemType Directory -Path $npmCache -Force | Out-Null
npm config set cache $npmCache 2>$null
Write-Host "[npm] cache -> $npmCache"

# Loose build artifacts — move to D: (regenerated on build; no symlink needed)
foreach ($file in @("tsconfig.tsbuildinfo", "dev-server.log", "devserver.log", "server.log")) {
  $src = Join-Path $ProjectRoot $file
  if (Test-Path -LiteralPath $src) {
    $dst = Join-Path $TargetBase $file
    Move-Item -LiteralPath $src -Destination $dst -Force
    Write-Host "[moved] $file -> cache"
  }
}

Write-Host ""
Write-Host "Done. Heavy folders now live on D: and are linked into the project."
Write-Host "Restart dev server: npm run dev"
