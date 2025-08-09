$ErrorActionPreference = 'Stop'

# Folder with your clips
$indir = 'public/assets/videos'
$TempSuffix = '-temp.mp4'

# Ensure tools exist
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw 'ffmpeg not found' }
if (-not (Get-Command ffprobe -ErrorAction SilentlyContinue)) { throw 'ffprobe not found' }

# Gather files
$files = Get-ChildItem -Path $indir -Include *.mp4, *.mov, *.mkv, *.webm -File -Recurse
if (-not $files -or $files.Count -eq 0) {
  Write-Host 'No input videos found in public/assets/videos'
  exit 0
}

foreach ($f in $files) {
  $tempFile = Join-Path $f.DirectoryName ($f.BaseName + $TempSuffix)
  Write-Host ('Converting: ' + $f.FullName)

  # Does the file have an audio stream?
  $audioInfo = & ffprobe -v error -show_streams -select_streams a -of csv=p=0 -- $f.FullName
  $hasAudio = -not [string]::IsNullOrWhiteSpace($audioInfo)

  if ($hasAudio) {
    $ffArgs = @(
      '-y',
      '-i', $f.FullName,
      '-map', '0:v:0', '-map', '0:a:0',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
      '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1',
      '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-ar', '48000',
      '-movflags', '+faststart',
      $tempFile
    )
  } else {
    Write-Host ('No audio stream detected in: ' + $f.Name)
    $ffArgs = @(
      '-y',
      '-i', $f.FullName,
      '-map', '0:v:0',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '20',
      '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.1',
      '-movflags', '+faststart',
      $tempFile
    )
  }

  & ffmpeg @ffArgs

  # Replace original with converted
  Remove-Item -LiteralPath $f.FullName -Force
  Rename-Item -LiteralPath $tempFile -NewName $f.Name -Force

  Write-Host ('Overwrote with browser-safe version: ' + $f.Name)
}

Write-Host 'All videos converted and replaced.'
