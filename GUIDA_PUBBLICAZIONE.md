# 🚀 Guida Completa: Pubblicazione del Workload BC Data Loader

## Panoramica

Questa guida ti accompagna passo-passo nella pubblicazione del workload **BC Data Loader** su Microsoft Fabric.

Il processo prevede:
1. Preparazione ambiente e configurazione
2. Sostituzione logo AGIC
3. Generazione del package NuGet (.nupkg)
4. Deploy su Azure Web App
5. Registrazione in Microsoft Fabric

---

## 📋 Pre-Requisiti

### Software Necessario

- [x] **PowerShell** 7.0 o superiore
- [x] **Node.js** 18.x o superiore
- [x] **Azure CLI** installato e autenticato
- [x] **NuGet** (verrà installato automaticamente via npm)

### Risorse Azure Richieste

- [x] **Azure App Registration** per il frontend
- [x] **Azure Web App** per hosting del workload
- [x] **Azure Key Vault** per i secrets di BC
- [x] **Microsoft Fabric Workspace** con permessi admin

---

## 🔧 Step 1: Preparazione Ambiente

### 1.1 Navigare nella Directory del Progetto

```powershell
cd "c:\Users\AlessioAndriulo\OneDrive - Agic Technology srl\Desktop\Fabric Workload\FabricWorkloads"
```

### 1.2 Installare le Dipendenze

```powershell
cd Workload
npm install
cd ..
```

### 1.3 Creare il File di Configurazione

```powershell
# Crea file .env.dev
Copy-Item "Workload\.env.template" "Workload\.env.dev"

# Apri per modificare
notepad "Workload\.env.dev"
```

### 1.4 Configurare le Variabili d'Ambiente

Modifica `Workload\.env.dev` con i tuoi valori:

```ini
##########################################################
# Workload Configuration
##########################################################
WORKLOAD_HOSTING_TYPE=FERemote
WORKLOAD_VERSION=1.0.0
WORKLOAD_NAME=BC2FabricWorkload
ITEM_NAMES=HelloWorld,BCDataLoader

##########################################################
# Frontend Configuration
##########################################################
# Azure AD App Registration ID per il frontend
FRONTEND_APPID=12345678-1234-1234-1234-123456789abc
# URL del tuo Azure Web App
FRONTEND_URL=https://bc2fabric-workload.azurewebsites.net

##########################################################
# Backend Service Configuration (opzionale per FERemote)
##########################################################
BACKEND_APPID=12345678-1234-1234-1234-123456789abc

##########################################################
# Environment Configuration
##########################################################
LOG_LEVEL=info
```

**Dove trovare i valori:**

- **FRONTEND_APPID**: Azure Portal → App Registrations → Application (client) ID
- **FRONTEND_URL**: Azure Portal → Web App → URL
- **WORKLOAD_NAME**: Nome univoco per il tuo workload (es: `BC2FabricWorkload`)

---

## 🎨 Step 2: Sostituire l'Icona con il Logo AGIC

### 2.1 Preparare il Logo

- **Formato**: PNG con sfondo trasparente
- **Dimensioni**: 128x128 pixel (consigliato)
- **Posizione**: Salva il logo in un percorso accessibile

### 2.2 Copiare il Logo nella Directory del Progetto

```powershell
# Sostituisci "C:\percorso\al\logo-agic.png" con il percorso reale del tuo logo
Copy-Item "C:\percorso\al\logo-agic.png" `
  "Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png" `
  -Force

# Verifica che il file sia stato copiato
Get-Item "Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png"
```

**Output atteso:**
```
Mode                 LastWriteTime         Length Name
----                 -------------         ------ ----
-a----        21/01/2026     23:00          12345 BCDataLoaderItem_Icon.png
```

### 2.3 (Opzionale) Sostituire anche l'Icona del Workload

```powershell
Copy-Item "C:\percorso\al\logo-agic.png" `
  "Workload\Manifest\assets\images\Workload_Icon.png" `
  -Force
```

---

## 📦 Step 3: Generare il Package NuGet

### 3.1 Eseguire lo Script di Build

```powershell
# Con validazione (consigliato)
.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev" -ValidateFiles $true
```

**Output atteso:**
```
Building Nuget Package ...
Loaded environment variables from Workload\.env.dev (dev environment)
Using temporary directory: C:\Users\...\Temp\Fabric_Manifest_Build_abc123...
Copying template files...
Copied 15 asset files (images, etc.) without modification
Configured items from ITEM_NAMES: HelloWorldItem, BCDataLoaderItem
Processing 8 files for variable replacement...
  Replaced {{WORKLOAD_NAME}} with BC2FabricWorkload in WorkloadManifest.xml
  Replaced {{ITEM_NAMES}} with HelloWorld,BCDataLoader in Product.json
  ...
Validation completed successfully
Attempting to build package from 'ManifestPackage.nuspec'.
Successfully created package 'build\Manifest\BC2FabricWorkload.1.0.0.nupkg'.
✅ Created the new ManifestPackage in build\Manifest\.
```

### 3.2 Verificare il Package Creato

```powershell
# Lista il file .nupkg generato
Get-ChildItem "build\Manifest" -Filter "*.nupkg" | Format-Table Name, Length, LastWriteTime
```

**Output atteso:**
```
Name                           Length LastWriteTime
----                           ------ -------------
BC2FabricWorkload.1.0.0.nupkg 245678 21/01/2026 23:05:00
```

### 3.3 Ispezionare il Contenuto del Package (Opzionale)

```powershell
# Estrai in una cartella temporanea per ispezionare
$extractPath = "build\Manifest\extracted"
Expand-Archive "build\Manifest\BC2FabricWorkload.1.0.0.nupkg" -DestinationPath $extractPath -Force
Get-ChildItem $extractPath -Recurse | Select-Object FullName
```

---

## 🌐 Step 4: Deploy su Azure Web App

### 4.1 Preparare il Build del Frontend

Prima di deployare, build dell'applicazione frontend:

```powershell
cd Workload
npm run build
cd ..
```

Questo crea la cartella `Workload\dist` con i file statici compilati.

### 4.2 Deploy su Azure Web App

#### **Opzione A: Deploy con Azure CLI (Consigliato)**

```powershell
# Login ad Azure
az login

# Seleziona la subscription corretta
az account set --subscription "your-subscription-id"

# Deploy del frontend
az webapp deployment source config-zip `
  --resource-group "your-resource-group" `
  --name "bc2fabric-workload" `
  --src "Workload\dist.zip"
```

#### **Opzione B: Deploy con PowerShell Script**

```powershell
.\scripts\Deploy\DeployToAzureWebApp.ps1 `
  -WebAppName "bc2fabric-workload" `
  -ResourceGroupName "your-resource-group" `
  -ReleasePath "Workload\dist" `
  -Force $false `
  -RestartAfterDeploy $true
```

### 4.3 Verificare il Deploy

```powershell
# Testa l'URL del frontend
$url = "https://bc2fabric-workload.azurewebsites.net"
Invoke-WebRequest -Uri $url -Method Get
```

---

## 📤 Step 5: Registrare il Workload in Microsoft Fabric

### 5.1 Caricare il Manifest Package

Il file `.nupkg` deve essere caricato nel **Fabric Admin Portal**:

1. **Accedi al Fabric Admin Portal**:
   - URL: https://app.fabric.microsoft.com/admin
   - Accedi come Fabric Administrator

2. **Naviga a Developer Settings**:
   - Vai a **Settings** → **Developer Settings** → **Workloads**

3. **Carica il Package**:
   - Click su **"Upload Workload Package"**
   - Seleziona il file `BC2FabricWorkload.1.0.0.nupkg` da `build\Manifest\`
   - Compila i campi richiesti:
     - **Workload Name**: BC2FabricWorkload
     - **Version**: 1.0.0
     - **Frontend URL**: https://bc2fabric-workload.azurewebsites.net
     - **App Registration ID**: (il tuo FRONTEND_APPID)

4. **Attiva il Workload**:
   - Dopo il caricamento, attiva il workload per il tuo tenant
   - Assegna capacità Fabric se richiesto

### 5.2 Alternativa: Registrazione Programmatica (Advanced)

Se hai accesso alle API di Fabric:

```powershell
# Usa Fabric REST API per registrare il workload
$token = az account get-access-token --resource "https://api.fabric.microsoft.com" --query accessToken -o tsv

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

$body = @{
    "workloadName" = "BC2FabricWorkload"
    "version" = "1.0.0"
    "manifestPackageUrl" = "https://your-storage-account.blob.core.windows.net/packages/BC2FabricWorkload.1.0.0.nupkg"
    "frontendUrl" = "https://bc2fabric-workload.azurewebsites.net"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://api.fabric.microsoft.com/v1/workloads" `
  -Method Post `
  -Headers $headers `
  -Body $body
```

---

## ✅ Step 6: Verifica e Test

### 6.1 Verificare nel Fabric Workspace

1. Accedi a https://app.fabric.microsoft.com/
2. Vai in un workspace con capacità assegnata
3. Click su **"+ New Item"**
4. Dovresti vedere **"BC Data Loader"** nella lista con il logo AGIC

### 6.2 Creare un Test Item

1. Click su **"BC Data Loader"**
2. Dai un nome: "BC Sync Test"
3. Dovresti vedere l'installation wizard

### 6.3 Test Connessione BC

1. Compila la configurazione:
   - App Registration ID
   - Key Vault URL
   - Environment: Production
   - Company: CRONUS IT (o il tuo)

2. Click **"Next: Select Entities"**
3. Verifica che vengano scoperte le entità da BC
4. Seleziona almeno "customers"
5. Procedi con l'installazione

### 6.4 Test Sync Completo

1. Dopo l'installazione, vai alla Default View
2. Click **"Sync Now"**
3. Monitora il progresso
4. Verifica nel Lakehouse "bc2fabric_internal":
   - Vai a **Workspace** → **bc2fabric_internal** → **Tables**
   - Dovresti vedere cartelle tipo `CRONUS_IT_customers`
   - Dentro ci sono file JSON con i dati sincronizzati

---

## 🐛 Troubleshooting

### Problema: Build Fallisce con "Environment file not found"

**Causa**: File `.env.dev` mancante

**Soluzione**:
```powershell
Copy-Item "Workload\.env.template" "Workload\.env.dev"
# Modifica con i tuoi valori
notepad "Workload\.env.dev"
```

---

### Problema: Validation Errors durante il Build

**Causa**: Manifest XML non valido

**Soluzione**:
```powershell
# Esegui senza validazione per generare comunque il package
.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev" -ValidateFiles $false

# Controlla gli errori nel file
Get-Content "scripts\Build\Manifest\ValidationScripts\ValidationErrors.txt"
```

---

### Problema: Logo non Appare in Fabric

**Causa**: Cache del browser o path icona errato

**Soluzione**:
1. Verifica che il file esista:
   ```powershell
   Test-Path "Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png"
   ```
2. Rigenera il package con il logo corretto
3. Rideploy il manifest
4. Forza refresh del browser (Ctrl+Shift+R)

---

### Problema: Deploy su Azure Fallisce

**Causa**: Credenziali Azure o subscription errati

**Soluzione**:
```powershell
# Re-login ad Azure
az login

# Lista subscriptions disponibili
az account list --output table

# Seleziona quella corretta
az account set --subscription "nome-o-id-subscription"
```

---

### Problema: Workload non Compare in Fabric

**Causa**: Workload non registrato o non attivato

**Soluzione**:
1. Vai al Fabric Admin Portal
2. Verifica che il workload sia nella lista
3. Attiva il workload per il tenant
4. Assegna una capacità Fabric al workspace
5. Attendi 5-10 minuti per la propagazione

---

## 📚 Riferimenti

### File Chiave del Progetto

| File | Descrizione |
|------|-------------|
| `Workload\.env.dev` | Configurazione ambiente (DEVI CREARE) |
| `Workload\Manifest\WorkloadManifest.xml` | Definizione workload |
| `Workload\Manifest\items\BCDataLoaderItem\BCDataLoaderItem.json` | Definizione item |
| `Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png` | Icona item (logo AGIC) |
| `build\Manifest\BC2FabricWorkload.1.0.0.nupkg` | Package finale da pubblicare |

### Script Disponibili

| Script | Scopo |
|--------|-------|
| `.\scripts\Build\BuildManifestPackage.ps1` | Genera .nupkg |
| `.\scripts\Build\BuildRelease.ps1` | Build completo (frontend + manifest) |
| `.\scripts\Deploy\DeployToAzureWebApp.ps1` | Deploy su Azure |
| `.\scripts\Setup\SetupWorkload.ps1` | Setup iniziale workload |

### Documentazione Correlata

- [LOGO_SETUP_INSTRUCTIONS.md](./LOGO_SETUP_INSTRUCTIONS.md) - Istruzioni dettagliate logo
- [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Checklist completa deployment
- [BC_MULTI_ENTITY_SYNC.md](./BC_MULTI_ENTITY_SYNC.md) - Documentazione funzionalità sync

---

## 🎯 Checklist Finale

Prima di considerare la pubblicazione completata:

- [ ] File `.env.dev` creato e configurato
- [ ] Logo AGIC copiato in `BCDataLoaderItem_Icon.png`
- [ ] Package .nupkg generato con successo
- [ ] Frontend buildato e deployato su Azure Web App
- [ ] Manifest package caricato in Fabric Admin Portal
- [ ] Workload attivato per il tenant
- [ ] Testato creazione di un BC Data Loader item
- [ ] Testato discovery entities da BC
- [ ] Testato sync completo con verifica dati in Lakehouse
- [ ] Documentazione utente finale creata

---

## 🚀 Prossimi Passi

Dopo il deployment:

1. **Rollout Produzione**
   - Crea `.env.prod` con configurazione produzione
   - Rigenera package con `-Environment "prod"`
   - Deploy su Web App produzione

2. **Monitoraggio**
   - Configura Application Insights per la Web App
   - Monitora log sync in Fabric
   - Imposta alert per errori

3. **Formazione Utenti**
   - Crea guida utente finale
   - Documenta procedure sync
   - Forma team su troubleshooting

4. **Manutenzione**
   - Pianifica aggiornamenti periodici
   - Gestisci feedback utenti
   - Estendi funzionalità (incremental sync, scheduling, etc.)

---

**Buon Deploy! 🎉**

Per supporto o domande, consulta la documentazione completa nel repository.
