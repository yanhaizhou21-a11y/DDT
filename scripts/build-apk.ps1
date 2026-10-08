# Build Android Package (.apk) for DDT using Capacitor / Android Gradle
param (
    [switch]$Release,
    [switch]$SkipWebBuild,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   DDT Android App (.apk) Packager - Capacitor Bridge" -ForegroundColor Cyan
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

# Step 2: Sync Web Assets to Android Project Assets Directory
Write-Host "`n[2/3] Synchronizing assets to Android project..." -ForegroundColor Yellow
$AndroidAssetsPath = Join-Path $RootDir "android/app/src/main/assets/public"
if (Test-Path $AndroidAssetsPath) {
    Remove-Item -Path "$AndroidAssetsPath\*" -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Force -Path $AndroidAssetsPath | Out-Null

Copy-Item -Path "$DistPath\*" -Destination $AndroidAssetsPath -Recurse -Force
Write-Host "  -> Successfully synced $( (Get-ChildItem -Path $AndroidAssetsPath -Recurse).Count ) files to $AndroidAssetsPath" -ForegroundColor Green

# Step 3: Check Android Build Environment (Java & Gradle)
Write-Host "`n[3/3] Checking Android SDK & Gradle environment..." -ForegroundColor Yellow
$HasJava = $null -ne (Get-Command "java" -ErrorAction SilentlyContinue)
$HasGradle = $null -ne (Get-Command "gradle" -ErrorAction SilentlyContinue)
$AndroidDir = Join-Path $RootDir "android"

$BuiltApk = $false

if ($HasJava) {
    $JavaVersion = (java -version 2>&1 | Select-Object -First 1)
    Write-Host "  -> Found Java runtime: $JavaVersion" -ForegroundColor Green
    
    $GradleCommand = if (Test-Path (Join-Path $AndroidDir "gradlew.bat")) {
        Join-Path $AndroidDir "gradlew.bat"
    } elseif ($HasGradle) {
        "gradle"
    } else {
        $null
    }

    if ($GradleCommand -and (Test-Path env:ANDROID_HOME)) {
        Write-Host "  -> Running Android Gradle build..." -ForegroundColor Yellow
        $TargetTask = if ($Release) { "assembleRelease" } else { "assembleDebug" }
        
        Push-Location $AndroidDir
        try {
            if ($Clean) {
                Write-Host "  -> Running gradle clean..." -ForegroundColor Yellow
                & $GradleCommand clean
            }
            & $GradleCommand $TargetTask
            if ($LASTEXITCODE -eq 0) {
                $BuiltApk = $true
                $ApkPath = if ($Release) {
                    Join-Path $AndroidDir "app/build/outputs/apk/release/app-release-unsigned.apk"
                } else {
                    Join-Path $AndroidDir "app/build/outputs/apk/debug/app-debug.apk"
                }

                $ApkDist = Join-Path $RootDir "dist/apk"
                New-Item -ItemType Directory -Force -Path $ApkDist | Out-Null
                if (Test-Path $ApkPath) {
                    Copy-Item -Path $ApkPath -Destination (Join-Path $ApkDist "DDT.apk") -Force
                    Copy-Item -Path $ApkPath -Destination (Join-Path $ApkDist "app-debug.apk") -Force
                }

                Write-Host "`n==========================================================" -ForegroundColor Green
                Write-Host " SUCCESS: Android APK generated successfully!" -ForegroundColor Green
                Write-Host " APK location: $ApkDist\DDT.apk" -ForegroundColor Green
                Write-Host " Gradle output: $ApkPath" -ForegroundColor DarkGray
                Write-Host "==========================================================" -ForegroundColor Green
            }
        } catch {
            Write-Warning "Gradle build failed: $_"
        } finally {
            Pop-Location
        }
    }
}

if (-not $BuiltApk) {
    Write-Host "`n==========================================================" -ForegroundColor Cyan
    Write-Host " Android Project Ready for APK Build" -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host " All web assets and native Android configurations are synchronized." -ForegroundColor White
    Write-Host " You can generate the final .apk in one of two ways:" -ForegroundColor Gray
    Write-Host "   Option A: Open the '$AndroidDir' folder in Android Studio and select Build -> Build APK." -ForegroundColor White
    Write-Host "   Option B: Install Android SDK Command-line Tools and set ANDROID_HOME, then rerun:" -ForegroundColor White
    Write-Host "             pnpm build:apk" -ForegroundColor Yellow
    Write-Host "`n Synchronized assets location: $AndroidAssetsPath" -ForegroundColor DarkCyan
    Write-Host " Configuration: capacitor.config.json & android/app/build.gradle" -ForegroundColor DarkCyan
    Write-Host "==========================================================" -ForegroundColor Cyan
}

Write-Host "`nDone." -ForegroundColor Cyan
