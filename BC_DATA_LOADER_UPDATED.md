# BC Data Loader - Updated Implementation

## 🎯 Novità Implementate

La POC è stata aggiornata per replicare il modello dello screenshot fornito:

### ✅ Auto-Creazione Lakehouse
- Il Lakehouse viene creato automaticamente durante l'installazione
- Nome fisso: `bc2fabric_internal`
- Creato nel workspace corrente dell'item

### ✅ Key Vault per Secrets
- Non salva più il Client Secret in chiaro
- Usa Azure Key Vault per recuperare il secret
- URL Key Vault configurabile: `https://myvault.vault.azure.net/secrets/bc2fabric-bc-api-secret`

### ✅ Multi-Company Support
- Supporto per multiple companies Business Central
- UI per aggiungere/rimuovere companies
- Sync parallela per tutte le companies configurate
- Dati scritti in folder separate per company: `{CompanyName}_customers/`

### ✅ Wizard di Installazione
- Interfaccia simile allo screenshot
- 5 step di installazione con progress tracking:
  1. Create Folder 'bc2fabric_internal'
  2. Create Mirrored DB 'bc2fabric_mirror'
  3. Create Lakehouse 'bc2fabric_internal'
  4. Create Config files
  5. Run Validation

---

## 📋 Configurazione Required

### 1. Azure App Registration

Crea un'App Registration in Azure AD con permessi per:
- **Business Central API**: `https://api.businesscentral.dynamics.com/.default`
- **Key Vault**: Lettura secrets

### 2. Azure Key Vault

1. Crea un Key Vault in Azure
2. Crea un secret con nome: `bc2fabric-bc-api-secret`
3. Il valore del secret deve essere il **Client Secret** dell'App Registration
4. Assegna permesso "Key Vault Secrets User" all'App Registration

### 3. Business Central

Configura l'App Registration in Business Central:
- Permissions: API access
- Grant type: Client Credentials
- Companies: Configura quali companies devono essere accessibili

---

## 🚀 Utilizzo

### Step 1: Creare l'Item

1. Nel workspace Fabric, clicca **+ New**
2. Seleziona **BC Data Loader**
3. Assegna un nome (es: `BC Customer Sync`)
4. Clicca **Create**

### Step 2: Installazione Guidata

Al primo avvio vedrai la welcome screen. Clicca **"Install BC Data Loader"**.

#### Configurazione Form

Compila i campi richiesti:

**Business Central Connection:**
- **App Registration Id**: GUID dell'App Registration Azure AD
  ```
  00000000-0000-0000-0000-000000000000
  ```

- **Key Vault**: URL completo del secret in Key Vault
  ```
  https://myvault.vault.azure.net/secrets/bc2fabric-bc-api-secret
  ```

- **BC Environment**: Nome environment BC
  ```
  Production
  ```

**Companies:**
- Clicca **"Add Company"** per aggiungere companies
- Inserisci i nomi esatti delle companies BC
- Esempio:
  ```
  CRONUS International Ltd.
  My Company
  ```

#### Installazione Automatica

Clicca **"Install"** per avviare il processo:

1. ✅ **Create Folder** - Crea struttura folder
2. ✅ **Create Mirrored DB** - Prepara DB mirror (simulato in POC)
3. ✅ **Create Lakehouse** - Crea `bc2fabric_internal` tramite Fabric API
4. ✅ **Create Config** - Salva configurazione nell'item definition
5. ✅ **Run Validation** - Testa connessione BC tramite Key Vault

Durante l'installazione vedrai:
- Icone per ogni step
- Spinner durante l'esecuzione
- Checkmark verde quando completato
- X rossa in caso di errore

### Step 3: Sincronizzazione Dati

Dopo l'installazione, accedi alla vista principale:

1. **Left Panel**: Visualizza configurazione
   - Business Central endpoint
   - Companies configurate
   - Lakehouse target

2. **Center Panel**: Controlli sync
   - Bottone **"Sync Now"**
   - Progress bar durante sync
   - Storico sincronizzazioni con dettagli per company

3. **Ribbon**: Salva configurazione

Clicca **"Sync Now"** per sincronizzare tutte le companies.

---

## 🏗️ Architettura Tecnica

### Modifiche ai File Principali

#### BCDataLoaderItemDefinition.ts

**Prima (vecchio modello):**
```typescript
export interface BCConnectionSettings {
  baseUrl: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;  // ❌ In chiaro
  companyName?: string;  // ❌ Singola company
}
```

**Dopo (nuovo modello):**
```typescript
export interface BCConnectionSettings {
  appRegistrationId: string;           // ✅ Solo ID
  keyVaultUrl: string;                 // ✅ URL Key Vault
  environment: string;                 // ✅ Environment name
  companies: string[];                 // ✅ Multiple companies
}

export interface LakehouseTarget {
  lakehouseId?: string;                // ✅ Auto-generato
  lakehouseName: string;               // ✅ Nome fisso
  workspaceId: string;
  workspaceName: string;
  autoCreate: boolean;                 // ✅ Flag auto-creazione
  internalFolderName: string;
}
```

#### BusinessCentralClient.ts

**Novità:**
- Costruisce automaticamente Base URL da `tenantId` + `environment`
- Metodo `getAllCustomersMultiCompany()` per sync parallela
- Metodo `getCompanies()` per listare companies disponibili
- Helper `getSecretFromKeyVault()` per recupero secret

**Esempio utilizzo:**
```typescript
// 1. Get secret from Key Vault
const fabricToken = await workloadClient.authentication.getAccessToken({
  scopes: ['https://vault.azure.net/.default']
});
const clientSecret = await getSecretFromKeyVault(keyVaultUrl, fabricToken.token);

// 2. Create BC client
const bcClient = new BusinessCentralClient({
  tenantId: 'your-tenant-id',
  clientId: 'your-app-id',
  clientSecret: clientSecret,  // ✅ From Key Vault
  environment: 'Production'
});

// 3. Sync multiple companies
const companies = ['Company A', 'Company B'];
const results = await bcClient.getAllCustomersMultiCompany(companies);
```

#### LakehouseSyncService.ts

**Novità:**
- Metodo `syncAllCompaniesToLakehouse()` per sync multi-company
- Aggiunge campo `company` in ogni record Delta
- Crea folder separate per company: `{CompanyName}_customers/`
- Metodo `getAvailableCompanies()` per discovery companies

**Struttura dati Lakehouse:**
```
bc2fabric_internal (Lakehouse)
├── Tables/
│   ├── CRONUS_International_Ltd_customers/
│   │   └── data_1234567890.json
│   ├── My_Company_customers/
│   │   └── data_1234567891.json
```

Ogni record include:
```json
{
  "company": "CRONUS International Ltd.",
  "id": "customer-guid",
  "number": "C00001",
  "displayName": "Contoso Corp",
  ...
}
```

#### BCDataLoaderItemEmptyView.tsx

**Novità:**
- Form con campi App Registration ID, Key Vault URL, Environment
- UI per gestire multiple companies (Add/Remove)
- Progress tracking installazione con 5 step
- Chiamata Fabric API per creare Lakehouse reale
- Validazione connessione BC tramite Key Vault

**Flusso installazione:**
1. Form configurazione → Validazione input
2. Click "Install" → Avvia processo
3. Step 1-5 con spinner e checkmark
4. Salva configuration → Navigate to Default View

---

## 🔑 Key Vault Integration

### Perché Key Vault?

✅ **Security**: Secret non salvato in chiaro nella definition
✅ **Centralized**: Gestione centralizzata secrets
✅ **Rotation**: Supporto rotazione secret senza modificare item
✅ **Audit**: Log accessi al secret in Azure
✅ **Compliance**: Best practice enterprise

### Come Funziona

```typescript
// 1. Fabric workload richiede token per Key Vault
const fabricToken = await workloadClient.authentication.getAccessToken({
  scopes: ['https://vault.azure.net/.default']
});

// 2. Recupera secret da Key Vault
const clientSecret = await getSecretFromKeyVault(
  'https://myvault.vault.azure.net/secrets/bc2fabric-bc-api-secret',
  fabricToken.token
);

// 3. Usa secret per autenticare con BC
const bcClient = new BusinessCentralClient({
  tenantId, clientId,
  clientSecret,  // ✅ Retrieved from Key Vault
  environment
});
```

### Permessi Required

L'App Registration Fabric deve avere:
- **Key Vault**: Role "Key Vault Secrets User"
- **Scope**: `https://vault.azure.net/.default`

---

## 📊 Struttura Delta Table

Ogni record salvato nel Lakehouse include:

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `company` | string | **NUOVO**: Nome company BC |
| `id` | string | ID univoco customer |
| `number` | string | Numero cliente |
| `displayName` | string | Nome cliente |
| `type` | string | Tipo (Person/Company) |
| `address_*` | string | Campi indirizzo (flattened) |
| `phoneNumber` | string | Telefono |
| `email` | string | Email |
| `taxRegistrationNumber` | string | Partita IVA |
| `lastModifiedDateTime` | string | Ultimo aggiornamento BC |
| `syncTimestamp` | string | Timestamp sincronizzazione |

### Query Example (SQL)

```sql
-- Tutti i clienti di tutte le companies
SELECT * FROM bc2fabric_internal.CRONUS_International_Ltd_customers
UNION ALL
SELECT * FROM bc2fabric_internal.My_Company_customers;

-- Clienti per company
SELECT company, COUNT(*) as customer_count
FROM bc2fabric_internal.*_customers
GROUP BY company;
```

---

## 🛠️ Troubleshooting

### Errore: "Key Vault access denied"

**Causa**: Permessi insufficienti su Key Vault

**Soluzione**:
1. Vai su Azure Portal → Key Vault
2. Access policies o RBAC
3. Assegna role "Key Vault Secrets User" all'App Registration

### Errore: "Failed to create lakehouse"

**Causa**: Permessi insufficienti sul workspace Fabric

**Soluzione**:
1. Verifica di essere Admin o Contributor del workspace
2. Verifica che il workspace abbia capacità assegnata

### Errore: "Company not found"

**Causa**: Nome company errato o non accessibile con l'App Registration

**Soluzione**:
1. Verifica il nome esatto in BC
2. Verifica permessi App Registration in BC
3. Usa `bcClient.getCompanies()` per listare companies disponibili

---

## 📈 Next Steps

### Funzionalità Future

1. **Sync Schedulata**:
   - Trigger automatici (ogni ora, giornaliero, etc.)
   - Integrazione con Fabric Data Pipeline

2. **Altre Entità BC**:
   - Sales Orders
   - Items
   - Vendors
   - G/L Entries

3. **Delta Table Optimization**:
   - Conversione JSONL → Parquet tramite Spark
   - Partitioning per company e data
   - Compaction automatica

4. **Monitoring**:
   - Dashboard Power BI
   - Alerts su errori sync
   - Metriche performance

5. **Incremental Sync**:
   - Abilitare `incrementalSync: true`
   - Tracking lastModifiedDateTime
   - Sync solo delta changes

---

## 📚 Riferimenti

- [Microsoft Fabric Extensibility Toolkit](https://learn.microsoft.com/fabric/extensibility-toolkit)
- [Business Central OData API](https://learn.microsoft.com/dynamics365/business-central/dev-itpro/api-reference/v2.0/)
- [Azure Key Vault](https://learn.microsoft.com/azure/key-vault/)
- [Delta Lake Format](https://delta.io/)

---

## ✅ Checklist Completo

### Prerequisiti
- [ ] App Registration Azure AD creata
- [ ] API Permissions configurate (BC + Key Vault)
- [ ] Client Secret generato
- [ ] Key Vault creato in Azure
- [ ] Secret salvato in Key Vault con nome `bc2fabric-bc-api-secret`
- [ ] Permessi Key Vault assegnati all'App Registration
- [ ] Workspace Fabric con capacità attiva

### Installazione
- [ ] Item BC Data Loader creato
- [ ] Form configurazione compilato
- [ ] Installazione completata con successo
- [ ] Lakehouse `bc2fabric_internal` creato
- [ ] Validazione BC connessione OK

### Sincronizzazione
- [ ] Prima sincronizzazione eseguita
- [ ] Dati verificati nel Lakehouse
- [ ] Storico sync visualizzato correttamente
- [ ] Multiple companies sincronizzate

---

🎉 **La POC è pronta e replicata secondo lo screenshot fornito!**
