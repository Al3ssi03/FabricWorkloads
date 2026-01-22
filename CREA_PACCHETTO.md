# 📦 Come Creare il Pacchetto di Installazione

## Panoramica

Il pacchetto di installazione è un file **`.nupkg`** (NuGet Package) che contiene:
- ✅ Manifest del workload (WorkloadManifest.xml)
- ✅ Definizioni degli item (BCDataLoader, HelloWorld)
- ✅ Assets (logo, immagini, icone)
- ✅ Configurazioni e metadati

---

## 🚀 Procedura Completa

### Step 1: Preparazione

Apri **PowerShell** come amministratore e naviga nella directory del progetto:

```powershell
cd "c:\Users\AlessioAndriulo\OneDrive - Agic Technology srl\Desktop\Fabric Workload\FabricWorkloads"
```

### Step 2: Verifica Prerequisiti

```powershell
# Verifica che il file .env.dev esista
Test-Path "Workload\.env.dev"
# Output atteso: True

# Verifica che il logo sia presente
Test-Path "Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png"
# Output atteso: True

# Verifica versione Node.js
node --version
# Output atteso: v18.x.x o superiore

# Verifica versione npm
npm --version
# Output atteso: 9.x.x o superiore
```

### Step 3: Installare Dipendenze

```powershell
# Naviga nella cartella Workload
cd Workload

# Installa dipendenze npm (include nuget.exe)
npm install

# Torna alla root
cd ..
```

**Tempo stimato:** 2-5 minuti (dipende dalla connessione internet)

**Output atteso:**
```
added 1234 packages, and audited 1235 packages in 2m
found 0 vulnerabilities
```

### Step 4: Genera il Pacchetto NuGet

```powershell
# Esegui lo script di build con validazione
.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev" -ValidateFiles $true
```

**Tempo stimato:** 10-30 secondi

**Output atteso:**
```
Building Nuget Package ...
Loaded environment variables from Workload\.env.dev (dev environment)
Using temporary directory: C:\Users\...\Temp\Fabric_Manifest_Build_abc123...
Copying template files from Workload\Manifest to temp...
Copied 15 asset files (images, etc.) without modification
Configured items from ITEM_NAMES: HelloWorldItem, BCDataLoaderItem
Moving 4 item configuration files to root directory...
  Moved BCDataLoaderItem.json to root directory
  Moved BCDataLoaderItem.xml to root directory
  Moved HelloWorldItem.json to root directory
  Moved HelloWorldItem.xml to root directory
Processing 12 files for variable replacement...
  Replaced {{WORKLOAD_NAME}} with BC2FabricWorkload in WorkloadManifest.xml
  Replaced {{WORKLOAD_VERSION}} with 1.0.0 in WorkloadManifest.xml
  Replaced {{WORKLOAD_HOSTING_TYPE}} with FERemote in WorkloadManifest.xml
  Replaced {{FRONTEND_APPID}} with 00000000-0000-0000-0000-000000000000 in WorkloadManifest.xml
  Replaced {{FRONTEND_URL}} with http://localhost:60006 in WorkloadManifest.xml
  Replaced {{ITEM_NAMES}} with HelloWorld,BCDataLoader in Product.json
Validating processed configuration files...
Validation completed successfully ✓
Using configuration in build\Manifest\
Attempting to build package from 'ManifestPackage.nuspec'.
Successfully created package 'build\Manifest\BC2FabricWorkload.1.0.0.nupkg'.
✅ Created the new ManifestPackage in build\Manifest\.
Cleaning up temporary directory...
```

### Step 5: Verificare il Pacchetto

```powershell
# Lista il file .nupkg generato
Get-ChildItem "build\Manifest" -Filter "*.nupkg" | Format-Table Name, Length, LastWriteTime
```

**Output atteso:**
```
Name                           Length LastWriteTime
----                           ------ -------------
BC2FabricWorkload.1.0.0.nupkg 245678 21/01/2026 23:30:00
```

### Step 6: Ispezionare il Contenuto (Opzionale)

```powershell
# Estrai il pacchetto per ispezionarlo
$extractPath = "build\Manifest\extracted"
New-Item -ItemType Directory -Path $extractPath -Force
Expand-Archive "build\Manifest\BC2FabricWorkload.1.0.0.nupkg" -DestinationPath $extractPath -Force

# Lista il contenuto
Get-ChildItem $extractPath -Recurse | Select-Object FullName
```

**Dovresti vedere:**
```
build\Manifest\extracted\[Content_Types].xml
build\Manifest\extracted\WorkloadManifest.xml
build\Manifest\extracted\BCDataLoaderItem.json
build\Manifest\extracted\BCDataLoaderItem.xml
build\Manifest\extracted\HelloWorldItem.json
build\Manifest\extracted\HelloWorldItem.xml
build\Manifest\extracted\Product.json
build\Manifest\extracted\assets\images\BCDataLoaderItem_Icon.png
build\Manifest\extracted\assets\images\Workload_Icon.png
build\Manifest\extracted\assets\locales\en-US\translations.json
...
```

---

## 📤 Cosa Fare con il Pacchetto

Il file `.nupkg` generato in `build\Manifest\BC2FabricWorkload.1.0.0.nupkg` è pronto per essere:

### Opzione A: Caricato nel Fabric Admin Portal

1. Vai su https://app.fabric.microsoft.com/admin
2. Naviga a **Developer Settings** → **Workloads**
3. Click su **"Upload Workload Package"**
4. Seleziona il file `BC2FabricWorkload.1.0.0.nupkg`
5. Compila i dettagli richiesti
6. Attiva il workload per il tenant

### Opzione B: Deployato tramite API

```powershell
# Carica il package su Azure Blob Storage
$storageAccount = "yourStorageAccount"
$container = "workload-packages"
$sasToken = "?sv=2021-06-08&ss=b&srt=sco&sp=rwdlac&se=..."

az storage blob upload `
  --account-name $storageAccount `
  --container-name $container `
  --name "BC2FabricWorkload.1.0.0.nupkg" `
  --file "build\Manifest\BC2FabricWorkload.1.0.0.nupkg" `
  --sas-token $sasToken

# Registra il workload tramite API
$packageUrl = "https://$storageAccount.blob.core.windows.net/$container/BC2FabricWorkload.1.0.0.nupkg$sasToken"

# Usa Fabric Management API per registrare
# (Dettagli API forniti dalla documentazione Microsoft Fabric)
```

### Opzione C: Test Locale

Per testare localmente prima del deployment:

```powershell
# Avvia il dev server
cd Workload
npm run dev

# In un altro terminale, avvia il dev gateway
cd ..
.\scripts\Run\StartDevGateway.ps1
```

---

## 🔄 Rigenerare il Pacchetto

Se modifichi il codice o la configurazione, rigenera il pacchetto:

```powershell
# Dopo modifiche al codice TypeScript
cd Workload
npm run build
cd ..

# Rigenera il pacchetto manifest
.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev" -ValidateFiles $true
```

---

## 🐛 Troubleshooting

### Errore: "Environment file not found"

**Problema:**
```
Environment file not found at Workload\.env.dev
```

**Soluzione:**
```powershell
# Verifica che il file esista
Test-Path "Workload\.env.dev"

# Se mancante, copia dal template
Copy-Item "Workload\.env.template" "Workload\.env.dev"

# Modifica con i tuoi valori
notepad "Workload\.env.dev"
```

---

### Errore: "Nuget executable not found"

**Problema:**
```
Nuget executable not found at Workload\node_modules\nuget-bin\nuget.exe
```

**Soluzione:**
```powershell
# Installa dipendenze npm
cd Workload
npm install
cd ..

# Verifica che nuget.exe sia presente
Test-Path "Workload\node_modules\nuget-bin\nuget.exe"
```

---

### Errore: "Validation errors found"

**Problema:**
```
Validation errors found. See ValidationErrors.txt
```

**Soluzione:**
```powershell
# Leggi gli errori
Get-Content "scripts\Build\Manifest\ValidationScripts\ValidationErrors.txt"

# Se gli errori non sono critici, rigenera senza validazione
.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev" -ValidateFiles $false
```

---

### Errore: "Item not found in ITEM_NAMES"

**Problema:**
```
No item configuration files found for configured items: HelloWorldItem, BCDataLoaderItem
```

**Soluzione:**
```powershell
# Verifica che ITEM_NAMES sia corretto in .env.dev
Get-Content "Workload\.env.dev" | Select-String "ITEM_NAMES"

# Output atteso:
# ITEM_NAMES=HelloWorld,BCDataLoader

# Verifica che le cartelle degli item esistano
Test-Path "Workload\Manifest\items\HelloWorldItem"
Test-Path "Workload\Manifest\items\BCDataLoaderItem"
```

---

### Warning: "FRONTEND_APPID is 00000000-0000-0000-0000-000000000000"

**Problema:**
```
Using placeholder FRONTEND_APPID
```

**Soluzione:**

Questo è normale per test locale. Per production:

```powershell
# Apri .env.dev
notepad "Workload\.env.dev"

# Sostituisci FRONTEND_APPID con il tuo Application ID reale
# FRONTEND_APPID=12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Rigenera il pacchetto
.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev" -ValidateFiles $true
```

---

## 📋 Checklist Pre-Deployment

Prima di caricare il pacchetto su Fabric, verifica:

- [ ] ✅ File `.env.dev` configurato con valori corretti
- [ ] ✅ Logo AGIC presente in `BCDataLoaderItem_Icon.png`
- [ ] ✅ Package `.nupkg` generato con successo
- [ ] ✅ Validazione XML completata senza errori
- [ ] ✅ Dimensione package ragionevole (<5MB consigliato)
- [ ] ✅ App Registration Azure creata (per production)
- [ ] ✅ Permessi API configurati
- [ ] ✅ Admin consent concesso

---

## 📊 Struttura del Package

Il file `.nupkg` generato contiene:

```
BC2FabricWorkload.1.0.0.nupkg
├── [Content_Types].xml                    # Metadata NuGet
├── ManifestPackage.nuspec                 # Specifica NuGet
├── WorkloadManifest.xml                   # ← Manifest principale del workload
├── Product.json                           # Configurazione workload
│
├── BCDataLoaderItem.json                  # ← Definizione BC Data Loader
├── BCDataLoaderItem.xml                   # ← Schema BC Data Loader
├── HelloWorldItem.json                    # Definizione Hello World
├── HelloWorldItem.xml                     # Schema Hello World
│
└── assets/
    ├── images/
    │   ├── BCDataLoaderItem_Icon.png      # ← Logo AGIC
    │   ├── Workload_Icon.png
    │   ├── Workload_Hub_Banner.png
    │   └── ...
    │
    └── locales/
        └── en-US/
            └── translations.json          # Traduzioni UI
```

---

## 🎯 Prossimi Passi

Dopo aver generato il pacchetto:

1. ✅ **Test Locale** (opzionale)
   - Avvia dev server: `npm run dev`
   - Testa funzionalità

2. ✅ **Backup del Package**
   ```powershell
   # Copia il package in una location sicura
   Copy-Item "build\Manifest\BC2FabricWorkload.1.0.0.nupkg" "C:\Backup\Packages\"
   ```

3. ✅ **Deploy su Fabric**
   - Segui: [GUIDA_PUBBLICAZIONE.md](./GUIDA_PUBBLICAZIONE.md)

4. ✅ **Documentazione Utente**
   - Crea guida installazione per utenti finali
   - Documenta configurazione BC App Registration

---

## 📚 Riferimenti

- [GUIDA_PUBBLICAZIONE.md](./GUIDA_PUBBLICAZIONE.md) - Guida completa deployment
- [QUICK_START.md](./QUICK_START.md) - Quick start per sviluppo
- [ARCHITETTURA_AUTENTICAZIONE.md](./ARCHITETTURA_AUTENTICAZIONE.md) - Architettura autenticazione
- [SETUP_AZURE_APPREGISTRATION.md](./SETUP_AZURE_APPREGISTRATION.md) - Setup App Registration

---

**Pacchetto pronto! 🎉**

Il tuo file `BC2FabricWorkload.1.0.0.nupkg` è ora pronto per essere caricato su Microsoft Fabric.
