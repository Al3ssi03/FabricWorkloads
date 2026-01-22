# Script completo per build del package

param(
    [string]$Environment = "dev"
)

Write-Host "=== BUILD COMPLETO PACKAGE ===" -ForegroundColor Cyan
Write-Host ""

# 1. Pulisci ambiente
Write-Host "1. Pulizia ambiente..." -ForegroundColor Yellow
Remove-Item -Path "build\Manifest\*.nupkg" -Force -ErrorAction SilentlyContinue

# 2. Modifica temporaneamente lo script di build per non pulire la temp folder
$buildScript = "scripts\Build\BuildManifestPackage.ps1"
$content = Get-Content $buildScript -Raw
$originalContent = $content

# Commenta la pulizia della temp folder
$content = $content -replace '(if \(Test-Path \$tempPath\) \{[^}]+Remove-Item \$tempPath[^}]+\})', '# $1'
Set-Content $buildScript $content

try {
    # 3. Esegui build manifest
    Write-Host "2. Build manifest..." -ForegroundColor Yellow
    & $buildScript -Environment $Environment

    # 4. Trova temp directory (ora non è stata pulita)
    Write-Host "3. Ricerca temp directory..." -ForegroundColor Yellow
    $tempDirs = Get-ChildItem -Path $env:TEMP -Filter "Fabric_Manifest_Build_*" -Directory | Sort-Object LastWriteTime -Descending

    if ($tempDirs.Count -eq 0) {
        Write-Host "ERRORE: Nessuna temp directory trovata!" -ForegroundColor Red
        exit 1
    }

    $tempPath = $tempDirs[0].FullName
    $nuspecPath = Join-Path $tempPath "ManifestPackage.nuspec"

    Write-Host "   Temp folder: $tempPath" -ForegroundColor Gray

    # 5. Verifica nome nel nuspec
    Write-Host "4. Verifica nome workload..." -ForegroundColor Yellow
    $nuspecContent = Get-Content $nuspecPath -Raw
    if ($nuspecContent -match '<id>([^<]+)</id>') {
        $workloadName = $matches[1]
        Write-Host "   Nome trovato: $workloadName" -ForegroundColor Gray

        if ($workloadName -match '\d') {
            Write-Host "   ATTENZIONE: Il nome contiene numeri - Fabric potrebbe rifiutarlo!" -ForegroundColor Yellow
        }
    }

    # 6. Esegui nuget pack
    Write-Host "5. Generazione package NuGet..." -ForegroundColor Yellow
    $nugetPath = "Workload\node_modules\nuget-bin\nuget.exe"
    $outputDir = "build\Manifest"

    & $nugetPath pack $nuspecPath -OutputDirectory $outputDir

    # 7. Pulisci temp folder manualmente
    Write-Host "6. Pulizia temp folder..." -ForegroundColor Yellow
    Remove-Item $tempPath -Recurse -Force -ErrorAction SilentlyContinue

    # 8. Mostra risultato
    Write-Host ""
    Write-Host "=== RISULTATO ===" -ForegroundColor Cyan
    $packages = Get-ChildItem "$outputDir\*.nupkg"

    if ($packages.Count -gt 0) {
        Write-Host "Package creato con successo!" -ForegroundColor Green
        Write-Host ""

        foreach ($pkg in $packages) {
            Write-Host "Nome: $($pkg.Name)" -ForegroundColor White
            Write-Host "Dimensione: $([math]::Round($pkg.Length/1KB, 2)) KB" -ForegroundColor White
            Write-Host "Percorso: $($pkg.FullName)" -ForegroundColor White
            Write-Host ""
        }
    } else {
        Write-Host "ERRORE: Package non creato!" -ForegroundColor Red
        exit 1
    }

} finally {
    # Ripristina lo script originale
    Set-Content $buildScript $originalContent
}
