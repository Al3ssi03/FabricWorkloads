# ⚡ Quick Start - BC2Fabric Workload

## 🎯 Scenario: Sviluppo Locale

Se vuoi testare il workload localmente prima di pubblicarlo su Azure.

---

## ✅ Setup Rapido (5 minuti)

### 1. ✅ Logo AGIC (GIÀ FATTO)

Il logo è già nella posizione corretta:
```
✅ Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png
```

### 2. ✅ File .env.dev (GIÀ CREATO)

Il file è stato creato qui:
```
✅ Workload\.env.dev
```

### 3. 🔧 Configurare Azure App Registration

**Opzione A: Sviluppo Locale (Più Veloce)**

Per testare localmente SENZA creare App Registration Azure:

```powershell
# Usa i valori di default nel .env.dev
# Il file è già configurato per localhost:60006
```

**Opzione B: Creare App Registration (Consigliato)**

Segui la guida: [SETUP_AZURE_APPREGISTRATION.md](./SETUP_AZURE_APPREGISTRATION.md)

Poi aggiorna il file `.env.dev`:

```powershell
notepad "Workload\.env.dev"
```

Cambia:
```ini
# Sostituisci con il tuo Application ID
FRONTEND_APPID=12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## 🚀 Build e Test

### 1. Installare Dipendenze

```powershell
cd "c:\Users\AlessioAndriulo\OneDrive - Agic Technology srl\Desktop\Fabric Workload\FabricWorkloads\Workload"
npm install
cd ..
```

### 2. Generare il Package

```powershell
.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev" -ValidateFiles $true
```

**Output atteso:**
```
Building Nuget Package ...
Loaded environment variables from Workload\.env.dev
✅ Created the new ManifestPackage in build\Manifest\
```

### 3. Verificare il Package

```powershell
Get-ChildItem "build\Manifest" -Filter "*.nupkg"
```

Dovresti vedere:
```
BC2FabricWorkload.1.0.0.nupkg
```

---

## 🧪 Test Locale (Opzionale)

### 1. Avviare il Dev Server

```powershell
cd Workload
npm run dev
```

Apri browser su: http://localhost:60006

### 2. Avviare il Dev Gateway

In un altro terminale:

```powershell
.\scripts\Run\StartDevGateway.ps1
```

---

## 📤 Pubblicazione su Fabric

Quando sei pronto per pubblicare:

1. **Carica il package** `BC2FabricWorkload.1.0.0.nupkg` nel Fabric Admin Portal
2. Segui la guida completa: [GUIDA_PUBBLICAZIONE.md](./GUIDA_PUBBLICAZIONE.md)

---

## 📋 File Importanti

| File | Stato | Azione |
|------|-------|--------|
| `.env.dev` | ✅ Creato | Aggiorna FRONTEND_APPID se hai App Registration |
| Logo | ✅ OK | Nessuna azione necessaria |
| Package | ⬜ Da generare | Esegui BuildManifestPackage.ps1 |

---

## 🆘 Problemi?

### Il build fallisce con "Environment file not found"

**Soluzione**: Il file `.env.dev` è già stato creato, riprova:
```powershell
.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev"
```

### Errore "FRONTEND_APPID is invalid"

**Soluzione**: Hai due opzioni:
1. Usa i valori di default per test locale (già configurato)
2. Crea App Registration Azure e aggiorna `.env.dev`

### Il package è stato generato, e adesso?

**Soluzione**: Il file `.nupkg` in `build\Manifest\` è pronto per essere caricato in Fabric.

Segui: [GUIDA_PUBBLICAZIONE.md](./GUIDA_PUBBLICAZIONE.md) → **Step 5: Registrare il Workload in Microsoft Fabric**

---

## 🎯 Prossimo Step

**Genera il package ora:**

```powershell
cd "c:\Users\AlessioAndriulo\OneDrive - Agic Technology srl\Desktop\Fabric Workload\FabricWorkloads"
.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev" -ValidateFiles $true
```

✨ **Il tuo workload sarà pronto in `build\Manifest\BC2FabricWorkload.1.0.0.nupkg`**
