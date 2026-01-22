# Script per generare manualmente il package NuGet
# Esegui dopo BuildManifestPackage.ps1 se il package non viene creato

$nugetPath = "Workload\node_modules\nuget-bin\nuget.exe"
$outputDir = "build\Manifest"

# Crea directory di output
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

# Trova l'ultima directory temporanea di build
$tempDirs = Get-ChildItem -Path $env:TEMP -Filter "Fabric_Manifest_Build_*" -Directory | Sort-Object LastWriteTime -Descending

if ($tempDirs.Count -eq 0) {
    Write-Host "❌ Nessuna directory temporanea trovata." -ForegroundColor Red
    Write-Host "Esegui prima: .\scripts\Build\BuildManifestPackage.ps1 -Environment 'dev'" -ForegroundColor Yellow
    exit 1
}

$tempPath = $tempDirs[0].FullName
$nuspecPath = Join-Path $tempPath "ManifestPackage.nuspec"

Write-Host "📁 Directory temporanea: $tempPath" -ForegroundColor Cyan
Write-Host "📄 Nuspec file: $nuspecPath" -ForegroundColor Cyan

if (-not (Test-Path $nuspecPath)) {
    Write-Host "❌ File nuspec non trovato: $nuspecPath" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $nugetPath)) {
    Write-Host "❌ NuGet.exe non trovato: $nugetPath" -ForegroundColor Red
    Write-Host "Installa prima le dipendenze: cd Workload; npm install" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🔨 Esecuzione nuget pack..." -ForegroundColor Green
Write-Host ""

& $nugetPath pack $nuspecPath -OutputDirectory $outputDir -Verbosity detailed

Write-Host ""
Write-Host "✅ Package creato!" -ForegroundColor Green
Write-Host ""
Write-Host "📦 File generati:" -ForegroundColor Cyan
Get-ChildItem $outputDir -Filter "*.nupkg" | Format-Table Name, @{Label="Size (KB)";Expression={[math]::Round($_.Length/1KB, 2)}}, LastWriteTime

Write-Host ""
Write-Host "📍 Percorso completo:" -ForegroundColor Yellow
Get-ChildItem $outputDir -Filter "*.nupkg" | ForEach-Object { Write-Host $_.FullName -ForegroundColor White }
