# 补齐 Electron 运行时与 path.txt（npm --ignore-scripts 安装或二进制缺失时使用）
# 用法：powershell -ExecutionPolicy Bypass -File scripts/fix-binaries.ps1
$ErrorActionPreference = "Stop"

if (-not (Test-Path "node_modules/electron/package.json")) {
    Write-Error "node_modules/electron not found. Run 'npm install' first."
    exit 1
}

$version = (node -p "require('./node_modules/electron/package.json').version").Trim()
$distExe = "node_modules/electron/dist/electron.exe"

if (-not (Test-Path $distExe)) {
    $mirror = if ($env:ELECTRON_MIRROR) { $env:ELECTRON_MIRROR } else { "https://npmmirror.com/mirrors/electron/" }
    $zip = Join-Path $env:TEMP "electron-v$version-win32-x64.zip"
    Write-Host "Downloading Electron runtime v$version ..."
    Invoke-WebRequest "$mirror$version/electron-v$version-win32-x64.zip" -OutFile $zip
    Expand-Archive $zip -DestinationPath node_modules/electron/dist -Force
    Write-Host "Electron runtime extracted."
} else {
    Write-Host "Electron runtime already present, skip download."
}

# path.txt must have NO trailing newline: electron-vite reads it without trim.
$pkgDir = (Get-Location).Path + "\node_modules\electron"
[IO.File]::WriteAllText("$pkgDir\path.txt", "electron.exe")

$check = node -p "require('electron')"
if ($check -and (Test-Path $check)) {
    Write-Host "Electron ready: $check"
} else {
    Write-Error "Verification failed: 'require('electron')' did not resolve to a valid executable."
    exit 1
}