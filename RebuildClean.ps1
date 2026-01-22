# Script per ricostruire completamente il package

Write-Host "Pulizia ambiente..." -ForegroundColor Yellow

# 1. Pulisci directory build
if (Test-Path "build\Manifest") {
    Remove-Item -Path "build\Manifest" -Recurse -Force
}
New-Item -ItemType Directory -Path "build\Manifest" -Force | Out-Null

# 2. Pulisci TUTTE le temp folders
Get-ChildItem -Path $env:TEMP -Filter "Fabric_Manifest_Build_*" -Directory | Remove-Item -Recurse -Force

Write-Host "✓ Ambiente pulito" -ForegroundColor Green
Write-Host ""

# 3. Esegui build manifest
Write-Host "Generazione manifest..." -ForegroundColor Yellow
.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev"

# 4. Trova l'ultima temp directory creata
$tempDirs = Get-ChildItem -Path $env:TEMP -Filter "Fabric_Manifest_Build_*" -Directory | Sort-Object LastWriteTime -Descending

if ($tempDirs.Count -eq 0) {
    Write-Host "❌ Nessuna directory temporanea trovata!" -ForegroundColor Red
    exit 1
}

$tempPath = $tempDirs[0].FullName
$nuspecPath = Join-Path $tempPath "ManifestPackage.nuspec"
$nugetPath = "Workload\node_modules\nuget-bin\nuget.exe"
$outputDir = "build\Manifest"

Write-Host ""
Write-Host "Directory temporanea: $tempPath" -ForegroundColor Cyan

# Verifica il contenuto del nuspec per confermare il nome
Write-Host "Verifica nome workload nel nuspec..." -ForegroundColor Yellow
$nuspecContent = Get-Content $nuspecPath -Raw
if ($nuspecContent -match '<id>(.*)</id>') {
    Write-Host "Nome workload trovato: $($matches[1])" -ForegroundColor Cyan
}

# 5. Esegui nuget pack
Write-Host ""
Write-Host "Generazione package NuGet..." -ForegroundColor Yellow
& $nugetPath pack $nuspecPath -OutputDirectory $outputDir

# 6. Mostra risultato
Write-Host ""
if (Test-Path "$outputDir\*.nupkg") {
    Write-Host "✅ Package creato con successo!" -ForegroundColor Green
    Write-Host ""
    Get-ChildItem "$outputDir\*.nupkg" | ForEach-Object {
        Write-Host "Nome file: $($_.Name)" -ForegroundColor White
        Write-Host "Dimensione: $([math]::Round($_.Length/1KB, 2)) KB" -ForegroundColor White
        Write-Host "Percorso: $($_.FullName)" -ForegroundColor White
    }
} else {
    Write-Host "Package non creato!" -ForegroundColor Red
}
