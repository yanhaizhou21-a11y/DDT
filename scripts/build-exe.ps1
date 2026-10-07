# Build Windows Executable (.exe) for DDT using Tauri v2
param (
    [switch]$Debug,
    [switch]$SkipWebBuild
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   DDT Desktop App (.exe) Packager - Tauri v2" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location $RootDir

# Step 1: Build Web Frontend
if (-not $SkipWebBuild) {
    Write-Host "`n[1/3] Building Web Frontend (@ddt/web)..." -ForegroundColor Yellow
    pnpm --filter @ddt/web build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Web frontend build failed!"
        exit 1
    }
} else {
    Write-Host "`n[1/3] Skipping Web Frontend build (requested)..." -ForegroundColor DarkGray
}

$DistPath = Join-Path $RootDir "packages/web/dist"
if (-not (Test-Path (Join-Path $DistPath "index.html"))) {
    Write-Error "Frontend dist artifacts not found at $DistPath!"
    exit 1
}
Write-Host "  -> Verified web bundle at $DistPath" -ForegroundColor Green

# Ensure icon.ico exists for Windows Tauri build
if (-not (Test-Path "$RootDir\src-tauri\icons\icon.ico")) {
    Write-Host "  -> Generating src-tauri\icons\icon.ico..." -ForegroundColor Cyan
    node "$RootDir\scripts\make-ico.cjs"
}

# Step 2: Check Rust & Tauri CLI Toolchain
Write-Host "`n[2/3] Checking Rust & Tauri build toolchain..." -ForegroundColor Yellow
$HasCargo = $null -ne (Get-Command "cargo" -ErrorAction SilentlyContinue)
$HasRustc = $null -ne (Get-Command "rustc" -ErrorAction SilentlyContinue)

if ($HasCargo -and $HasRustc) {
    $RustVersion = (rustc --version)
    Write-Host "  -> Found Rust toolchain: $RustVersion" -ForegroundColor Green
    
    # Step 3: Compile Desktop Executable with Tauri CLI
    Write-Host "`n[3/3] Compiling Tauri v2 Desktop Executable..." -ForegroundColor Yellow
    
    $TauriArgs = @("dlx", "@tauri-apps/cli", "build")
    if ($Debug) {
        $TauriArgs += "--debug"
    }

    & pnpm @TauriArgs
    if ($LASTEXITCODE -eq 0) {
        $DesktopOut = Join-Path $RootDir "dist/desktop"
        New-Item -ItemType Directory -Force -Path $DesktopOut | Out-Null

        $CompiledExe = Join-Path $RootDir "src-tauri/target/release/ddt-desktop.exe"
        if (Test-Path $CompiledExe) {
            Copy-Item -Path $CompiledExe -Destination (Join-Path $DesktopOut "DDT.exe") -Force
            Copy-Item -Path $CompiledExe -Destination (Join-Path $DesktopOut "ddt-desktop.exe") -Force
        }

        $NsisInstaller = Join-Path $RootDir "src-tauri/target/release/bundle/nsis/DDT_1.0.0_x64-setup.exe"
        if (Test-Path $NsisInstaller) {
            Copy-Item -Path $NsisInstaller -Destination (Join-Path $DesktopOut "DDT-Setup.exe") -Force
        }

        Write-Host "`n==========================================================" -ForegroundColor Green
        Write-Host " SUCCESS: DDT Windows Executable (.exe) built successfully!" -ForegroundColor Green
        Write-Host " Standalone App: $DesktopOut\DDT.exe" -ForegroundColor Green
        if (Test-Path (Join-Path $DesktopOut "DDT-Setup.exe")) {
            Write-Host " NSIS Installer: $DesktopOut\DDT-Setup.exe" -ForegroundColor Green
        }
        Write-Host " Build Artifacts: $RootDir\src-tauri\target\release" -ForegroundColor DarkGray
        Write-Host "==========================================================" -ForegroundColor Green
        exit 0
    } else {
        Write-Warning "Tauri CLI exited with code $LASTEXITCODE. Checking fallback."
    }
} else {
    Write-Host "  Notice: Rust compiler (cargo/rustc) is not currently found in PATH." -ForegroundColor DarkYellow
    Write-Host "  To compile the native standalone .exe directly:" -ForegroundColor White
    Write-Host "    1. Install Rust via https://rustup.rs or run: winget install Rustlang.Rustup" -ForegroundColor Gray
    Write-Host "    2. Rerun: pnpm build:exe" -ForegroundColor Gray
}

# Create portable launcher bundle in dist/desktop
Write-Host "`nCreating standalone desktop distribution directory at dist/desktop..." -ForegroundColor Yellow
$DesktopOut = Join-Path $RootDir "dist/desktop"
New-Item -ItemType Directory -Force -Path $DesktopOut | Out-Null
Copy-Item -Path "$DistPath\*" -Destination $DesktopOut -Recurse -Force

# Create lightweight Windows WebView2 runner launcher
$LauncherPath = Join-Path $DesktopOut "DDT.cmd"
@"
@echo off
title DDT - Daily Dashboard Tracker
start "" "%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe" --app="file:///%~dp0index.html"
"@ | Set-Content -Path $LauncherPath -Encoding ASCII

Write-Host "  -> Standalone webview bundle prepared at: $DesktopOut" -ForegroundColor Green
Write-Host "  -> Tauri v2 configuration ready at: $RootDir\src-tauri\tauri.conf.json" -ForegroundColor Green
Write-Host "`nDone." -ForegroundColor Cyan
