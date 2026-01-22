# Build finale del package con nome corretto

# Pulisci tutto
Remove-Item -Path "build\Manifest" -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem -Path $env:TEMP -Filter "Fabric_Manifest_Build_*" -Directory | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path "build\Manifest" -Force | Out-Null

Write-Host "Ambiente pulito" -ForegroundColor Green

# Esegui build
Write-Host "Build manifest in corso..." -ForegroundColor Yellow
.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev"

# Trova temp directory
$tempDirs = Get-ChildItem -Path $env:TEMP -Filter "Fabric_Manifest_Build_*" -Directory | Sort-Object LastWriteTime -Descending
$tempPath = $tempDirs[0].FullName
$nuspecPath = Join-Path $tempPath "ManifestPackage.nuspec"

# Verifica nome
$content = Get-Content $nuspecPath -Raw
Write-Host "Contenuto ID nel nuspec:" -ForegroundColor Cyan
Select-String -Path $nuspecPath -Pattern "<id>" | ForEach-Object { Write-Host $_.Line }

# Build package
Write-Host "Build package NuGet..." -ForegroundColor Yellow
& "Workload\node_modules\nuget-bin\nuget.exe" pack $nuspecPath -OutputDirectory "build\Manifest"

# Risultato
Write-Host ""
Write-Host "Package creato:" -ForegroundColor Green
Get-ChildItem "build\Manifest\*.nupkg" | Select-Object Name, Length, LastWriteTime | Format-Table
