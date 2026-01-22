# 🔐 Setup Azure App Registration per BC2Fabric Workload

## ⚠️ IMPORTANTE: Due Tipi di App Registration

Il workload BC2Fabric utilizza **DUE App Registration separate**:

1. **App Registration del Workload** (questa guida)
   - ✅ Configura: **AGIC** (amministratore workload)
   - Scopo: Autentica il workload con Microsoft Fabric
   - Una sola per tutto il workload

2. **App Registration per Business Central** (configurata dall'utente finale)
   - ✅ Configura: **Ogni cliente** tramite UI
   - Scopo: Autentica con Business Central OData API
   - Una per ogni organizzazione che usa il workload

📖 Per comprendere l'architettura completa, leggi: [ARCHITETTURA_AUTENTICAZIONE.md](./ARCHITETTURA_AUTENTICAZIONE.md)

---

## Panoramica

Questa guida spiega come creare l'**App Registration del Workload** - l'applicazione che autentica il workload con Microsoft Fabric e permette l'accesso alle API di Fabric (workspace, items, lakehouse, ecc.).

---

## 📋 Prerequisiti

- Accesso al **Azure Portal** (https://portal.azure.com)
- Permessi di **Application Administrator** o **Global Administrator** nel tenant Azure AD
- Tenant ID del tuo Azure Active Directory

---

## 🚀 Step 1: Creare l'App Registration

### 1.1 Navigare nel Azure Portal

1. Vai su https://portal.azure.com
2. Nel menu di ricerca, digita **"App registrations"**
3. Click su **"App registrations"**

### 1.2 Creare Nuova Registrazione

1. Click su **"+ New registration"**
2. Compila il form:

   **Name:**
   ```
   BC2Fabric Workload
   ```

   **Supported account types:**
   - Seleziona: **"Accounts in this organizational directory only (Single tenant)"**

   **Redirect URI (optional):**
   - Platform: **Web**
   - URI: `http://localhost:60006/auth/callback` (per sviluppo)

   Se hai già un Azure Web App:
   - URI: `https://bc2fabric-workload.azurewebsites.net/auth/callback`

3. Click su **"Register"**

### 1.3 Copiare l'Application ID

Dopo la creazione, verrai reindirizzato alla pagina dell'app.

1. Nella sezione **"Essentials"**, copia:
   - **Application (client) ID** → Es: `12345678-1234-1234-1234-123456789abc`
   - **Directory (tenant) ID** → Es: `87654321-4321-4321-4321-cba987654321`

2. Salva questi valori, li userai nel file `.env.dev`

---

## 🔑 Step 2: Configurare API Permissions

### 2.1 Aggiungere Permessi Microsoft Fabric

1. Nel menu laterale, click su **"API permissions"**
2. Click su **"+ Add a permission"**
3. Vai alla tab **"APIs my organization uses"**
4. Cerca: **"Microsoft Fabric"** o **"Power BI Service"**
5. Seleziona **"Delegated permissions"**
6. Aggiungi i seguenti permessi:
   - ✅ `Workspace.Read.All`
   - ✅ `Workspace.ReadWrite.All`
   - ✅ `Item.Read.All`
   - ✅ `Item.ReadWrite.All`
   - ✅ `Dataflow.Read.All`
   - ✅ `Dataflow.ReadWrite.All`

### 2.2 Aggiungere Permessi Azure Key Vault

Per accedere ai secrets nel Key Vault:

1. Click su **"+ Add a permission"**
2. Vai a **"APIs my organization uses"**
3. Cerca: **"Azure Key Vault"**
4. Seleziona **"Delegated permissions"**
5. Aggiungi:
   - ✅ `user_impersonation`

### 2.3 Grant Admin Consent

1. Click su **"Grant admin consent for [Your Organization]"**
2. Conferma nel popup
3. Verifica che tutti i permessi abbiano lo status **"Granted for [Your Organization]"** con ✅ verde

---

## 🎫 Step 3: Configurare Authentication

### 3.1 Impostare Redirect URIs

1. Nel menu laterale, click su **"Authentication"**
2. Nella sezione **"Web"**, verifica che ci sia:
   - `http://localhost:60006/auth/callback` (sviluppo)
   - `https://bc2fabric-workload.azurewebsites.net/auth/callback` (produzione)

3. Se manca, click su **"+ Add URI"** e aggiungili

### 3.2 Configurare Token Settings

Nella sezione **"Implicit grant and hybrid flows"**:
- ✅ **Access tokens** (used for implicit flows)
- ✅ **ID tokens** (used for implicit and hybrid flows)

Nella sezione **"Allow public client flows"**:
- ✅ Enable the following mobile and desktop flows: **Yes**

Click su **"Save"**

---

## 🔐 Step 4: Creare Client Secret (Opzionale)

Se il workload richiede autenticazione server-to-server:

### 4.1 Generare Secret

1. Nel menu laterale, click su **"Certificates & secrets"**
2. Nella tab **"Client secrets"**, click su **"+ New client secret"**
3. Compila:
   - **Description**: `BC2Fabric Workload Secret`
   - **Expires**: `24 months` (consigliato)
4. Click su **"Add"**

### 4.2 Copiare il Secret

⚠️ **IMPORTANTE**: Copia il **Value** del secret SUBITO! Non sarà più visibile dopo aver lasciato la pagina.

```
Secret Value: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4.3 Salvare il Secret in Azure Key Vault

```powershell
# Login ad Azure
az login

# Crea il secret nel Key Vault
az keyvault secret set `
  --vault-name "your-keyvault-name" `
  --name "bc2fabric-app-secret" `
  --value "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

Il secret URL sarà:
```
https://your-keyvault-name.vault.azure.net/secrets/bc2fabric-app-secret
```

---

## 📝 Step 5: Aggiornare il File .env.dev

Ora aggiorna il file `.env.dev` con i valori ottenuti:

```powershell
cd "c:\Users\AlessioAndriulo\OneDrive - Agic Technology srl\Desktop\Fabric Workload\FabricWorkloads\Workload"
notepad .env.dev
```

Sostituisci i valori:

```ini
# Application (client) ID dall'App Registration
FRONTEND_APPID=12345678-1234-1234-1234-123456789abc

# URL del frontend (usa localhost per sviluppo)
FRONTEND_URL=http://localhost:60006

# Backend App ID (stesso del frontend per FERemote)
BACKEND_APPID=12345678-1234-1234-1234-123456789abc
```

Salva il file.

---

## ✅ Step 6: Verificare la Configurazione

### 6.1 Test con PowerShell

```powershell
# Carica le variabili dal file .env.dev
Get-Content "Workload\.env.dev" | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        Write-Host "$key = $value"
    }
}
```

### 6.2 Verifica App Registration in Azure

```powershell
# Login ad Azure
az login

# Recupera info sull'App Registration
$appId = "12345678-1234-1234-1234-123456789abc"
az ad app show --id $appId --query "{displayName:displayName, appId:appId, signInAudience:signInAudience}" -o table
```

**Output atteso:**
```
DisplayName              AppId                                 SignInAudience
-----------------------  ------------------------------------  ----------------
BC2Fabric Workload       12345678-1234-1234-1234-123456789abc  AzureADMyOrg
```

---

## 🔧 Troubleshooting

### Problema: "Invalid client" error durante l'autenticazione

**Causa**: Application ID errato o app non trovata

**Soluzione**:
1. Verifica che l'Application ID in `.env.dev` sia corretto
2. Verifica che l'app esista in Azure Portal
3. Controlla che il tenant ID sia corretto

---

### Problema: "Insufficient privileges" error

**Causa**: Permessi mancanti o admin consent non concesso

**Soluzione**:
1. Vai su Azure Portal → App Registration → API Permissions
2. Verifica che tutti i permessi abbiano ✅ verde "Granted"
3. Se manca, click su "Grant admin consent"
4. Attendi 5-10 minuti per la propagazione

---

### Problema: Redirect URI mismatch

**Causa**: Redirect URI non configurato correttamente

**Soluzione**:
1. Vai su Azure Portal → App Registration → Authentication
2. Aggiungi esattamente l'URI che usi nel FRONTEND_URL
3. Se sviluppo locale: `http://localhost:60006/auth/callback`
4. Se Azure Web App: `https://[nome-app].azurewebsites.net/auth/callback`

---

## 📚 Valori Finali per .env.dev

Dopo aver completato tutti gli step, il tuo `.env.dev` dovrebbe assomigliare a questo:

```ini
WORKLOAD_HOSTING_TYPE=FERemote
WORKLOAD_VERSION=1.0.0
WORKLOAD_NAME=BC2FabricWorkload
ITEM_NAMES=HelloWorld,BCDataLoader

# ⬇️ Sostituisci con il tuo Application ID
FRONTEND_APPID=12345678-1234-1234-1234-123456789abc

# ⬇️ Sostituisci con il tuo URL (localhost per dev, Azure Web App per prod)
FRONTEND_URL=http://localhost:60006

# ⬇️ Stesso del FRONTEND_APPID per hosting FERemote
BACKEND_APPID=12345678-1234-1234-1234-123456789abc

LOG_LEVEL=info
```

---

## 🎯 Prossimi Step

Dopo aver configurato `.env.dev`:

1. ✅ Verifica che il logo AGIC sia in: `Workload\Manifest\assets\images\BCDataLoaderItem_Icon.png`
2. ✅ Genera il package: `.\scripts\Build\BuildManifestPackage.ps1 -Environment "dev"`
3. ✅ Deploy su Fabric seguendo la [GUIDA_PUBBLICAZIONE.md](./GUIDA_PUBBLICAZIONE.md)

---

**Configurazione completata! 🎉**
