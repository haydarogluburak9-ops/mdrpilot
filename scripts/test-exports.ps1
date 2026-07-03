param([Parameter(Mandatory = $true)][string]$ProductId)

$base = 'http://localhost:3000'
$pass = 0
$fail = 0

function Assert($name, $cond, $detail) {
  if ($cond) { Write-Host "PASS  $name" -ForegroundColor Green; $script:pass++ }
  else { Write-Host "FAIL  $name  ($detail)" -ForegroundColor Red; $script:fail++ }
}

function ApiJson($method, $path, $session, $bodyObj) {
  $args = @{ Uri = "$base$path"; Method = $method; WebSession = $session }
  if ($bodyObj) { $args.Body = ($bodyObj | ConvertTo-Json -Compress); $args.ContentType = 'application/json' }
  try {
    $r = Invoke-WebRequest @args -UseBasicParsing
    return @{ status = [int]$r.StatusCode; body = $r.Content }
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $sc = [int]$resp.StatusCode
      $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $b = $reader.ReadToEnd()
      return @{ status = $sc; body = $b }
    }
    return @{ status = -1; body = $_.Exception.Message }
  }
}

function Login($email, $pw, [ref]$sessionRef) {
  try {
    $r = Invoke-WebRequest -Uri "$base/api/auth/login" -Method Post -Body (@{ email = $email; password = $pw } | ConvertTo-Json -Compress) -ContentType 'application/json' -SessionVariable s -UseBasicParsing
    $sessionRef.Value = $s
    return [int]$r.StatusCode
  } catch { return -1 }
}

Write-Host "`n=== Auth ===" -ForegroundColor Cyan
$owner = $null; $sc = Login 'elif@yilmazbio.com' 'Demo1234!' ([ref]$owner)
Assert 'Owner login 200' ($sc -eq 200) "status=$sc"
$viewer = $null; $sc = Login 'viewer@yilmazbio.com' 'Demo1234!' ([ref]$viewer)
Assert 'Viewer login 200' ($sc -eq 200) "status=$sc"

Write-Host "`n=== Create exports (Owner) ===" -ForegroundColor Cyan
$types = @(
  @{ t = 'GSPR_XLSX'; p = $true }, @{ t = 'RISK_XLSX'; p = $true },
  @{ t = 'TECHNICAL_FILE_DOCX'; p = $true }, @{ t = 'IFU_DOCX'; p = $true },
  @{ t = 'PMS_PMCF_DOCX'; p = $true }, @{ t = 'LABEL_PDF'; p = $true },
  @{ t = 'AUDIT_READINESS_PDF'; p = $true }, @{ t = 'FULL_MDR_TECHNICAL_FILE_ZIP'; p = $true },
  @{ t = 'PRODUCT_DOSSIER_ZIP'; p = $true }, @{ t = 'QMS_PACKAGE_ZIP'; p = $false }
)
$completedId = $null
foreach ($x in $types) {
  $body = @{ type = $x.t }
  if ($x.p) { $body.productId = $ProductId }
  $res = ApiJson 'Post' '/api/exports' $owner $body
  $ok = $res.status -eq 201
  $job = $null
  if ($ok) { $job = ($res.body | ConvertFrom-Json).job }
  Assert "Create $($x.t) -> 201 COMPLETED" ($ok -and $job.status -eq 'COMPLETED' -and $job.sizeBytes -gt 0) "status=$($res.status) size=$($job.sizeBytes)"
  if ($x.t -eq 'GSPR_XLSX' -and $job) { $completedId = $job.id }
}

Write-Host "`n=== Download (Owner) ===" -ForegroundColor Cyan
try {
  $out = Join-Path $env:TEMP 'meddoc-gspr.xlsx'
  Invoke-WebRequest -Uri "$base/api/exports/$completedId/download" -WebSession $owner -OutFile $out -UseBasicParsing
  $bytes = [System.IO.File]::ReadAllBytes($out)
  $isZip = $bytes[0] -eq 0x50 -and $bytes[1] -eq 0x4B
  Assert 'Owner downloads GSPR XLSX (PK header)' ($isZip -and $bytes.Length -gt 0) "len=$($bytes.Length)"
} catch { Assert 'Owner downloads GSPR XLSX' $false $_.Exception.Message }

Write-Host "`n=== History (Owner) ===" -ForegroundColor Cyan
$list = ApiJson 'Get' '/api/exports' $owner $null
$exports = ($list.body | ConvertFrom-Json).exports
Assert 'GET /api/exports 200 with rows' ($list.status -eq 200 -and $exports.Count -ge 10) "status=$($list.status) count=$($exports.Count)"

Write-Host "`n=== RBAC (Viewer) ===" -ForegroundColor Cyan
$vres = ApiJson 'Post' '/api/exports' $viewer @{ type = 'GSPR_XLSX'; productId = $ProductId }
Assert 'Viewer cannot create (403)' ($vres.status -eq 403) "status=$($vres.status)"
try {
  $out2 = Join-Path $env:TEMP 'meddoc-viewer.xlsx'
  $vr = Invoke-WebRequest -Uri "$base/api/exports/$completedId/download" -WebSession $viewer -OutFile $out2 -UseBasicParsing
  Assert 'Viewer can download existing export' $true ''
} catch {
  Assert 'Viewer can download existing export' $false $_.Exception.Message
}

Write-Host "`n=== Company isolation ===" -ForegroundColor Cyan
# Register a fresh user + new company B, create a QMS export there, then try to read it as Owner of company A.
$rnd = Get-Random
$bSession = $null
try {
  $rb = Invoke-WebRequest -Uri "$base/api/auth/register" -Method Post -Body (@{ email = "b$rnd@example.com"; password = 'Demo1234!'; name = 'B User' } | ConvertTo-Json -Compress) -ContentType 'application/json' -SessionVariable bSession -UseBasicParsing
  $onb = ApiJson 'Post' '/api/auth/onboarding' $bSession @{ companyName = "Company B $rnd"; country = 'TR' }
  Assert 'Company B onboarding 200' ($onb.status -eq 200) "status=$($onb.status)"
  $bExp = ApiJson 'Post' '/api/exports' $bSession @{ type = 'QMS_PACKAGE_ZIP' }
  $bJob = ($bExp.body | ConvertFrom-Json).job
  Assert 'Company B can create QMS export' ($bExp.status -eq 201 -and $bJob.status -eq 'COMPLETED') "status=$($bExp.status)"
  $cross = ApiJson 'Get' "/api/exports/$($bJob.id)/download" $owner $null
  Assert 'Cross-company download -> 404' ($cross.status -eq 404) "status=$($cross.status)"
} catch { Assert 'Company isolation flow' $false $_.Exception.Message }

Write-Host "`n=== Result: $pass passed, $fail failed ===" -ForegroundColor Cyan
if ($fail -gt 0) { exit 1 }
