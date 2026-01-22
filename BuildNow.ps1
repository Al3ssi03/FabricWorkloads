# Build package - versione semplificata

Write-Host "Pulizia..." -ForegroundColor Yellow
Remove-Item "build\Manifest" -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "build\Manifest" -Force | Out-Null

Write-Host "Build manifest..." -ForegroundColor Yellow
.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev" 2>&1 | Out-Null

Write-Host "Ricerca temp folder..." -ForegroundColor Yellow
$tempDirs = Get-ChildItem -Path $env:TEMP -Filter "Fabric_Manifest_Build_*" -Directory | Sort-Object LastWriteTime -Descending

if ($tempDirs.Count -eq 0) {
    Write-Host "ERRORE: temp folder non trovata" -ForegroundColor Red
    exit 1
}

$tempPath = $tempDirs[0].FullName
$nuspecPath = Join-Path $tempPath "ManifestPackage.nuspec"

Write-Host "Temp folder: $tempPath" -ForegroundColor Cyan

if (-not (Test-Path $nuspecPath)) {
    Write-Host "ERRORE: nuspec non trovato" -ForegroundColor Red
    exit 1
}

Write-Host "Verifica nome workload..." -ForegroundColor Yellow
$content = Get-Content $nuspecPath -Raw
if ($content -match '<id>([^<]+)</id>') {
    Write-Host "Nome: $($matches[1])" -ForegroundColor Cyan
}

Write-Host "Esecuzione nuget pack..." -ForegroundColor Green
$nugetExe = "Workload\node_modules\nuget-bin\nuget.exe"
& $nugetExe pack $nuspecPath -OutputDirectory "build\Manifest"

Write-Host ""
Write-Host "Verifica risultato..." -ForegroundColor Yellow
$packages = Get-ChildItem "build\Manifest\*.nupkg" -ErrorAction SilentlyContinue

if ($packages) {
    Write-Host "SUCCESS! Package creato:" -ForegroundColor Green
    foreach ($pkg in $packages) {
        Write-Host "  Nome: $($pkg.Name)" -ForegroundColor White
        Write-Host "  Path: $($pkg.FullName)" -ForegroundColor Gray
    }
} else {
    Write-Host "ERRORE: Nessun package trovato in build\Manifest" -ForegroundColor Red
    Write-Host "Contenuto directory:" -ForegroundColor Yellow
    Get-ChildItem "build\Manifest"
}
