$ErrorActionPreference = "Stop"

# Config
$zipUrl   = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
$tempZip  = Join-Path $env:TEMP "ffmpeg-release-essentials.zip"
$install  = "C:\ffmpeg"
$binPath  = Join-Path $install "bin"

Write-Host "Downloading FFmpeg..." -ForegroundColor Cyan
Invoke-WebRequest $zipUrl -OutFile $tempZip

Write-Host "Extracting..." -ForegroundColor Cyan
if (Test-Path $install) { Remove-Item $install -Recurse -Force }
Expand-Archive $tempZip -DestinationPath $env:TEMP -Force

$extracted = Get-ChildItem "$env:TEMP\ffmpeg-*essentials_build" -Directory |
  Sort-Object LastWriteTime -Descending | Select-Object -First 1

if (-not $extracted) { throw "Could not find extracted FFmpeg folder." }

New-Item -ItemType Directory -Force -Path $install | Out-Null
Copy-Item (Join-Path $extracted.FullName "*") $install -Recurse -Force
Remove-Item $tempZip -Force

# PATH update (Machine if admin, else User)
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$isAdmin = $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
  $current = [Environment]::GetEnvironmentVariable("Path", "Machine")
  if (-not ($current.Split(";") -contains $binPath)) {
    [Environment]::SetEnvironmentVariable("Path", $current + ";" + $binPath, "Machine")
    Write-Host "Added $binPath to SYSTEM PATH." -ForegroundColor Green
  } else {
    Write-Host "SYSTEM PATH already contains $binPath." -ForegroundColor Yellow
  }
} else {
  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not ($current.Split(";") -contains $binPath)) {
    [Environment]::SetEnvironmentVariable("Path", $current + ";" + $binPath, "User")
    Write-Host "Added $binPath to USER PATH." -ForegroundColor Green
  } else {
    Write-Host "USER PATH already contains $binPath." -ForegroundColor Yellow
  }
}

Write-Host "`nFFmpeg installed to $install." -ForegroundColor Cyan
Write-Host "Open a NEW PowerShell/Terminal and run:  ffmpeg -version" -ForegroundColor Cyan
