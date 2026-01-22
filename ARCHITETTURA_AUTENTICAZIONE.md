# 🔐 Architettura di Autenticazione - BC2Fabric Workload

## Panoramica

Il workload BC2Fabric utilizza **DUE App Registration Azure AD separate** per gestire l'autenticazione a due livelli:

1. **App Registration del Workload** - Autentica il workload con Microsoft Fabric
2. **App Registration per BC** - Autentica con Business Central (configurabile dall'utente)

---

## 🏗️ Architettura

```
┌─────────────────────────────────────────────────────────────┐
│                    Microsoft Fabric                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         BC2Fabric Workload                          │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │  Autenticazione Workload (Livello 1)      │     │    │
│  │  │  App Registration: FRONTEND_APPID         │     │    │
│  │  │  Scopo: Accesso API Fabric                │     │    │
│  │  │  - Workspace.ReadWrite.All                 │     │    │
│  │  │  - Item.ReadWrite.All                      │     │    │
│  │  │  - Lakehouse.ReadWrite.All                 │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────┐     │    │
│  │  │  BC Data Loader Item (Istanza utente)     │     │    │
│  │  │                                            │     │    │
│  │  │  Configurazione Utente:                    │     │    │
│  │  │  ┌────────────────────────────────┐       │     │    │
│  │  │  │ App Registration ID (per BC)    │       │     │    │
│  │  │  │ Key Vault URL                   │       │     │    │
│  │  │  │ BC Environment                  │       │     │    │
│  │  │  │ Companies []                    │       │     │    │
│  │  │  └────────────────────────────────┘       │     │    │
│  │  │                                            │     │    │
│  │  │  Autenticazione BC (Livello 2):           │     │    │
│  │  │  ┌────────────────────────────────┐       │     │    │
│  │  │  │ Get Secret from Key Vault       │       │     │    │
│  │  │  │ Create BC Client                │       │     │    │
│  │  │  │ OAuth Token (BC API)            │       │     │    │
│  │  │  └────────────────────────────────┘       │     │    │
│  │  └──────────────────────────────────────────┘     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                        │
                        │ OAuth 2.0 Client Credentials
                        ▼
            ┌─────────────────────────┐
            │  Business Central API   │
            │  (OData V4)             │
            └─────────────────────────┘
```

---

## 🔐 Livello 1: Autenticazione del Workload

### Scopo
Permette al workload di operare all'interno di Microsoft Fabric e accedere alle API di Fabric.

### Configurazione
Configurata nel file `.env.dev`:

```ini
# App Registration per il WORKLOAD
FRONTEND_APPID=12345678-xxxx-xxxx-xxxx-xxxxxxxxxxxx
FRONTEND_URL=https://bc2fabric-workload.azurewebsites.net
```

### Dove Viene Usata
Nel manifest del workload ([WorkloadManifest.xml](Workload/Manifest/WorkloadManifest.xml)):

```xml
<AADFEApp>
  <AppId>{{FRONTEND_APPID}}</AppId>
</AADFEApp>
```

### Permessi Richiesti
- **Microsoft Fabric API:**
  - `Workspace.Read.All`
  - `Workspace.ReadWrite.All`
  - `Item.Read.All`
  - `Item.ReadWrite.All`
  - `Dataflow.ReadWrite.All`

- **Azure Key Vault API:**
  - `user_impersonation` (per accedere ai secrets degli utenti)

### Chi la Configura?
**L'amministratore del workload** (AGIC) al momento della pubblicazione.

### Quante ne servono?
**Una sola** per tutto il workload. Tutti gli utenti utilizzano la stessa.

---

## 🔑 Livello 2: Autenticazione Business Central

### Scopo
Permette al workload di connettersi all'istanza Business Central di ogni cliente.

### Configurazione
Configurata dall'**utente finale** tramite la UI di installazione:

```typescript
// BCDataLoaderItemEmptyView.tsx
const [appRegistrationId, setAppRegistrationId] = useState('');
const [keyVaultUrl, setKeyVaultUrl] = useState('');
```

### Dove Viene Salvata
Nel definition file dell'item ([BCDataLoaderItemDefinition.ts](Workload/app/items/BCDataLoaderItem/BCDataLoaderItemDefinition.ts)):

```typescript
export interface BCConnectionSettings {
  appRegistrationId: string;  // ← App Registration per BC
  keyVaultUrl: string;         // ← URL del secret nel Key Vault dell'utente
  environment: string;
  companies: string[];
}
```

### Come Funziona
1. L'utente crea una App Registration nel **proprio tenant Azure AD**
2. Concede permessi a Business Central API: `https://api.businesscentral.dynamics.com/.default`
3. Salva il client secret nel **proprio Azure Key Vault**
4. Inserisce l'App Registration ID e Key Vault URL nella UI del workload

### Permessi Richiesti
- **Business Central API:**
  - `https://api.businesscentral.dynamics.com/.default` (full access)

### Chi la Configura?
**L'amministratore IT del cliente finale** - ogni organizzazione configura la propria.

### Quante ne servono?
**Una per ogni organizzazione/cliente** che usa il workload.

---

## 🔄 Flusso di Autenticazione Completo

### Scenario: Utente sincronizza dati da BC

```
1. Utente apre BC Data Loader item in Fabric
   ↓
2. Fabric autentica l'utente con il workload
   - Usa FRONTEND_APPID (Livello 1)
   ↓
3. Utente click "Sync Now"
   ↓
4. Workload recupera la configurazione dell'item
   - appRegistrationId (App per BC)
   - keyVaultUrl
   ↓
5. Workload ottiene Fabric Access Token
   - workloadClient.authentication.getAccessToken()
   - Scope: 'https://vault.azure.net/.default'
   ↓
6. Workload accede al Key Vault dell'utente
   - getSecretFromKeyVault(keyVaultUrl, fabricToken)
   - Recupera il client secret per BC
   ↓
7. Workload crea BC Client
   - new BusinessCentralClient({
       tenantId: userInfo.tenantId,
       clientId: appRegistrationId,  // ← App dell'utente
       clientSecret: secretFromVault,
       environment: 'Production'
     })
   ↓
8. BC Client ottiene OAuth token
   - POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
   - client_id: appRegistrationId
   - client_secret: secretFromVault
   - scope: https://api.businesscentral.dynamics.com/.default
   ↓
9. BC Client chiama OData API
   - GET https://api.businesscentral.dynamics.com/.../customers
   - Authorization: Bearer {bc_token}
   ↓
10. Dati vengono scritti nel Lakehouse
    - Usa Fabric token (Livello 1) per scrivere
```

---

## 📋 Guida Setup per Utente Finale

### Prerequisiti

L'utente finale deve:

1. ✅ Avere accesso al proprio tenant Azure AD
2. ✅ Avere permessi di **Application Administrator**
3. ✅ Avere un **Azure Key Vault** (o crearne uno)
4. ✅ Avere accesso a **Business Central** con API abilitata

### Step 1: Creare App Registration per BC

```powershell
# Login ad Azure
az login

# Crea App Registration
az ad app create --display-name "BC2Fabric - BC API Access"
```

**Output:**
```json
{
  "appId": "abcdef12-3456-7890-abcd-ef1234567890",
  ...
}
```

### Step 2: Configurare Permessi

```powershell
# Aggiungi permessi Business Central
$appId = "abcdef12-3456-7890-abcd-ef1234567890"

# Business Central API Resource ID
$bcResourceId = "996def3d-b36c-4153-8607-a6fd3c01b89f"

az ad app permission add `
  --id $appId `
  --api $bcResourceId `
  --api-permissions "7083913a-4966-44b6-9886-c5822a5fd910=Scope"

# Grant admin consent
az ad app permission admin-consent --id $appId
```

### Step 3: Creare Client Secret

```powershell
# Crea secret (valido 2 anni)
$secret = az ad app credential reset --id $appId --years 2 --query password -o tsv

# Mostra il secret (copialo ora!)
Write-Host "Client Secret: $secret" -ForegroundColor Yellow
```

### Step 4: Salvare Secret in Key Vault

```powershell
# Crea Key Vault (se non esiste)
az keyvault create `
  --name "mycompany-bc2fabric-kv" `
  --resource-group "my-resource-group" `
  --location "westeurope"

# Salva il secret
az keyvault secret set `
  --vault-name "mycompany-bc2fabric-kv" `
  --name "bc-api-secret" `
  --value $secret

# Ottieni URL del secret
$secretUrl = az keyvault secret show `
  --vault-name "mycompany-bc2fabric-kv" `
  --name "bc-api-secret" `
  --query "id" -o tsv

Write-Host "Secret URL: $secretUrl" -ForegroundColor Green
```

**Secret URL Format:**
```
https://mycompany-bc2fabric-kv.vault.azure.net/secrets/bc-api-secret
```

### Step 5: Configurare Accesso Key Vault

```powershell
# Permetti al workload Fabric di accedere al Key Vault
# Ottieni il Service Principal ID del workload (fornito da AGIC)
$workloadPrincipalId = "workload-managed-identity-id"

az keyvault set-policy `
  --name "mycompany-bc2fabric-kv" `
  --object-id $workloadPrincipalId `
  --secret-permissions get
```

### Step 6: Configurare il BC Data Loader

Nella UI di Fabric:

1. Crea nuovo **BC Data Loader** item
2. Nella schermata di installazione inserisci:

   - **App Registration ID**: `abcdef12-3456-7890-abcd-ef1234567890`
   - **Key Vault URL**: `https://mycompany-bc2fabric-kv.vault.azure.net/secrets/bc-api-secret`
   - **BC Environment**: `Production`
   - **Companies**: `CRONUS IT`, `CRONUS US`

3. Click **"Next: Select Entities"**
4. Il workload si connetterà a BC e mostrerà le entità disponibili

---

## 🔒 Sicurezza

### Perché Due App Registration?

#### ✅ Vantaggi

1. **Separazione delle Responsabilità**
   - Il workload accede a Fabric
   - L'utente controlla l'accesso a BC

2. **Sicurezza Multi-Tenant**
   - Ogni cliente usa la propria App per BC
   - Nessuna condivisione di credenziali tra clienti

3. **Controllo Granulare**
   - L'utente può revocare l'accesso a BC in qualsiasi momento
   - Non influisce sul funzionamento del workload per altri utenti

4. **Compliance**
   - I secret BC rimangono nel Key Vault del cliente
   - AGIC non ha mai accesso diretto ai secret BC

### Flusso dei Secret

```
┌──────────────────────┐
│  Amministratore AGIC │
│                      │
│  Configura:          │
│  - FRONTEND_APPID    │ ───► Nel manifest del workload
│  - FRONTEND_URL      │      (pubblico, visibile a tutti)
└──────────────────────┘

┌──────────────────────┐
│  Amministratore      │
│  Cliente             │
│                      │
│  Configura:          │
│  - BC App ID         │ ───► Nel proprio item definition
│  - Key Vault URL     │      (privato, solo per il cliente)
└──────────────────────┘
        │
        │ Secret rimane nel Key Vault del cliente
        ▼
┌──────────────────────┐
│  Azure Key Vault     │
│  (Cliente)           │
│                      │
│  Secret: abc123...   │ ───► Accessibile solo al workload
└──────────────────────┘      con permessi espliciti
```

---

## 🆘 Troubleshooting

### Errore: "Invalid client"

**Causa**: App Registration ID errato o non configurato correttamente.

**Verifica**:
- Livello 1 (Workload): Controlla `FRONTEND_APPID` in `.env.dev`
- Livello 2 (BC): Controlla l'App Registration ID nell'item definition

### Errore: "Key Vault access denied"

**Causa**: Managed identity del workload non ha permessi sul Key Vault.

**Soluzione**:
```powershell
az keyvault set-policy `
  --name "your-keyvault" `
  --object-id "workload-principal-id" `
  --secret-permissions get
```

### Errore: "BC Authentication failed"

**Causa**: Secret errato o scaduto, oppure permessi BC API mancanti.

**Verifica**:
1. Secret è corretto in Key Vault
2. App ha permessi su BC API: `https://api.businesscentral.dynamics.com/.default`
3. Admin consent è stato concesso

---

## 📚 File di Riferimento

| File | Autenticazione |
|------|----------------|
| `.env.dev` | **Livello 1**: Workload → Fabric |
| `WorkloadManifest.xml` | Usa `{{FRONTEND_APPID}}` |
| `BCDataLoaderItemDefinition.ts` | **Livello 2**: Item → BC |
| `BusinessCentralClient.ts` | Implementa OAuth per BC |
| `BCDataLoaderItemEmptyView.tsx` | UI per configurare App BC |

---

## ✅ Checklist Configurazione

### Per AGIC (Amministratore Workload)

- [ ] Creare App Registration per il workload
- [ ] Configurare permessi Fabric API
- [ ] Configurare permessi Key Vault API
- [ ] Grant admin consent
- [ ] Inserire `FRONTEND_APPID` in `.env.dev`
- [ ] Pubblicare il workload su Fabric

### Per Cliente Finale (Per Ogni Organizzazione)

- [ ] Creare App Registration per BC nel proprio tenant
- [ ] Configurare permessi Business Central API
- [ ] Grant admin consent
- [ ] Creare client secret
- [ ] Salvare secret nel proprio Azure Key Vault
- [ ] Configurare accesso Key Vault per workload
- [ ] Inserire App ID e Key Vault URL nella UI del workload
- [ ] Testare la connessione a BC

---

**Architettura verificata e documentata! ✅**

Questa separazione permette:
- ✅ **Multi-tenancy sicuro**
- ✅ **Controllo granulare per ogni cliente**
- ✅ **Compliance e sicurezza**
- ✅ **Scalabilità** - ogni cliente configura indipendentemente
