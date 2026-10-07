# Generate all mobile (Android) and desktop (Tauri/Windows) icons from docs/logo.png
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$SourceLogo = Join-Path $RootDir "docs/logo.png"

if (-not (Test-Path $SourceLogo)) {
    Write-Error "Source logo not found at $SourceLogo"
    exit 1
}

Write-Host "Loading source logo from: $SourceLogo" -ForegroundColor Cyan
$SrcBmp = [System.Drawing.Bitmap]::new($SourceLogo)

function Save-ResizedPng($src, $targetPath, $width, $height) {
    $targetDir = Split-Path -Parent $targetPath
    if (-not (Test-Path $targetDir)) {
        New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
    }

    $destBmp = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $rect = [System.Drawing.Rectangle]::new(0, 0, $width, $height)
    $g.DrawImage($src, $rect)
    $g.Dispose()

    $destBmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "  -> Generated: $targetPath ($($width)x$($height))" -ForegroundColor Green
}

# 1. Generate Android Mipmap Icons
$AndroidRes = Join-Path $RootDir "android/app/src/main/res"
$Mipmaps = @(
    @{ Name = "mipmap-mdpi"; Size = 48 },
    @{ Name = "mipmap-hdpi"; Size = 72 },
    @{ Name = "mipmap-xhdpi"; Size = 96 },
    @{ Name = "mipmap-xxhdpi"; Size = 144 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192 }
)

Write-Host "`nGenerating Android launcher icons..." -ForegroundColor Yellow
foreach ($m in $Mipmaps) {
    $dir = Join-Path $AndroidRes $m.Name
    Save-ResizedPng $SrcBmp (Join-Path $dir "ic_launcher.png") $m.Size $m.Size
    Save-ResizedPng $SrcBmp (Join-Path $dir "ic_launcher_round.png") $m.Size $m.Size
}

# Android foreground drawable for adaptive icon
$DrawableDir = Join-Path $AndroidRes "drawable"
Save-ResizedPng $SrcBmp (Join-Path $DrawableDir "ic_launcher_foreground.png") 432 432

# 2. Generate Desktop Tauri Icons
$TauriIcons = Join-Path $RootDir "src-tauri/icons"
Write-Host "`nGenerating Desktop application icons..." -ForegroundColor Yellow
Save-ResizedPng $SrcBmp (Join-Path $TauriIcons "32x32.png") 32 32
Save-ResizedPng $SrcBmp (Join-Path $TauriIcons "128x128.png") 128 128
Save-ResizedPng $SrcBmp (Join-Path $TauriIcons "128x128@2x.png") 256 256
Save-ResizedPng $SrcBmp (Join-Path $TauriIcons "icon.png") 512 512

# Generate icon.ico using 256x256 PNG container
$Icon256Path = Join-Path $TauriIcons "128x128@2x.png"
$IcoPath = Join-Path $TauriIcons "icon.ico"
$pngBytes = [System.IO.File]::ReadAllBytes($Icon256Path)

$ms = [System.IO.MemoryStream]::new()
$bw = [System.IO.BinaryWriter]::new($ms)
$bw.Write([UInt16]0) # Reserved
$bw.Write([UInt16]1) # Type (1=Icon)
$bw.Write([UInt16]1) # Count (1 image)

# Directory entry
$bw.Write([Byte]0)   # Width 256 (0 means 256)
$bw.Write([Byte]0)   # Height 256 (0 means 256)
$bw.Write([Byte]0)   # Color count
$bw.Write([Byte]0)   # Reserved
$bw.Write([UInt16]1) # Planes
$bw.Write([UInt16]32)# Bits per pixel
$bw.Write([UInt32]$pngBytes.Length) # Image size in bytes
$bw.Write([UInt32]22) # Offset (6 header + 16 entry = 22)

$bw.Write($pngBytes)
[System.IO.File]::WriteAllBytes($IcoPath, $ms.ToArray())
$bw.Dispose()
$ms.Dispose()
Write-Host "  -> Generated: $IcoPath (256x256 ICO)" -ForegroundColor Green

$SrcBmp.Dispose()
Write-Host "`nAll desktop and mobile icons successfully generated!" -ForegroundColor Cyan
