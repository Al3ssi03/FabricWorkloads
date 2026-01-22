# BC Data Loader - POC Documentation

## 📋 Panoramica

Questa POC (Proof of Concept) implementa un **item custom per Microsoft Fabric** che sincronizza dati da **Business Central OData APIs** verso **Fabric Lakehouse** come **Delta Tables**.

### Caratteristiche Implementate

✅ **Business Central OData Client** con autenticazione OAuth 2.0
✅ **Lettura entità Customer** da Business Central
✅ **Scrittura Delta Table** su Lakehouse Fabric
✅ **UI di configurazione guidata** (wizard step-by-step)
✅ **Sync manuale on-demand** con progress bar
✅ **Storico sincronizzazioni** con dettagli (records, durata, errori)
✅ **Supporto sincronizzazione incrementale** basata su lastModifiedDateTime

---

## 🏗️ Architettura

### File Creati

```
Workload/
├── app/
│   ├── clients/
│   │   └── BusinessCentralClient.ts          # Client OData per BC con OAuth 2.0
│   │
│   └── items/BCDataLoaderItem/
│       ├── BCDataLoaderItemDefinition.ts     # Definizione dati item
│       ├── BCDataLoaderItemEditor.tsx        # Container principale editor
│       ├── BCDataLoaderItemEmptyView.tsx     # Wizard configurazione iniziale
│       ├── BCDataLoaderItemDefaultView.tsx   # Vista sync e storico
│       ├── BCDataLoaderItemRibbon.tsx        # Ribbon con azioni
│       ├── LakehouseSyncService.ts           # Logica ETL BC → Lakehouse
│       └── index.ts                          # Export dei componenti
│
└── Manifest/
    ├── items/BCDataLoaderItem/
    │   ├── BCDataLoaderItem.json             # Configurazione item Fabric
    │   └── BCDataLoaderItem.xml              # Manifest item
    │
    ├── assets/locales/en-US/
    │   └── translations.json                 # Traduzioni aggiornate
    │
    └── Product.json                          # Workload config aggiornato
```

### File Modificati

- `Workload/app/App.tsx` - Aggiunto routing per BCDataLoaderItem
- `Workload/Manifest/Product.json` - Aggiunto item card e recommended types
- `Workload/Manifest/assets/locales/en-US/translations.json` - Aggiunte traduzioni
- `Workload/.env.template` - Documentato ITEM_NAMES

---

## 🚀 Setup e Configurazione

### 1. Prerequisiti Business Central

Prima di usare la POC, devi configurare l'accesso OData a Business Central:

#### A. Creare App Registration in Azure AD

1. Vai su [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **App Registrations**
2. Clicca **New registration**:
   - **Name**: `Fabric BC Data Loader`
   - **Supported account types**: `Accounts in this organizational directory only`
   - **Redirect URI**: (lascia vuoto per client credentials flow)
3. Clicca **Register**

#### B. Configurare API Permissions

1. Vai su **API permissions** → **Add a permission**
2. Seleziona **APIs my organization uses**
3. Cerca **Dynamics 365 Business Central**
4. Seleziona **Application permissions**:
   - `API.ReadWrite.All` (o `Automation.ReadWrite.All` per produzione)
5. Clicca **Add permissions**
6. Clicca **Grant admin consent** per il tenant

#### C. Creare Client Secret

1. Vai su **Certificates & secrets** → **New client secret**
2. **Description**: `Fabric Sync Secret`
3. **Expires**: Scegli durata (es. 12 mesi)
4. Clicca **Add**
5. **IMPORTANTE**: Copia immediatamente il **Value** del secret (non sarà più visibile)

#### D. Annotare le Credenziali

Salva questi valori (servono per la configurazione):

- **Tenant ID**: Dalla Overview page dell'App Registration
- **Client ID (Application ID)**: Dalla Overview page
- **Client Secret**: Il valore copiato al punto C
- **BC OData Base URL**:
  - SaaS: `https://api.businesscentral.dynamics.com/v2.0/{tenant-id}/{environment}/ODataV4/`
  - On-Premises: `https://{bc-server}:{port}/{instance}/ODataV4/`

### 2. Prerequisiti Fabric Lakehouse

#### Creare un Lakehouse

1. Vai su [Fabric Portal](https://app.fabric.microsoft.com)
2. Seleziona un **Workspace** (o creane uno nuovo)
3. Clicca **+ New** → **Lakehouse**
4. Nome: `BC_Data_Lakehouse`
5. Clicca **Create**

#### Annotare IDs

Dopo la creazione, recupera:

- **Workspace ID**: Dall'URL del workspace
  `https://app.fabric.microsoft.com/groups/{workspace-id}/...`
- **Lakehouse ID**: Dall'URL del lakehouse
  `https://app.fabric.microsoft.com/.../lakehouses/{lakehouse-id}`

---

## 🔧 Build e Deploy

### 1. Configurare Environment Variables

Crea il file `.env` nella cartella `Workload/`:

```bash
cd "c:\Users\AlessioAndriulo\OneDrive - Agic Technology srl\Desktop\Fabric Workload\FabricWorkloads\Workload"
cp .env.template .env
```

Modifica `.env` con i tuoi valori:

```env
WORKLOAD_HOSTING_TYPE=FERemote
WORKLOAD_VERSION=1.0.0
WORKLOAD_NAME=HelloFabric
ITEM_NAMES=HelloWorld,BCDataLoader

FRONTEND_APPID=<your-frontend-app-id>
FRONTEND_URL=http://localhost:60006

LOG_LEVEL=info
```

### 2. Build del Manifest

```powershell
cd "c:\Users\AlessioAndriulo\OneDrive - Agic Technology srl\Desktop\Fabric Workload\FabricWorkloads"
.\scripts\Build\BuildManifest.ps1
```

Questo genera i manifest finali da template sostituendo i placeholder.

### 3. Build del Frontend

```powershell
.\scripts\Build\BuildFrontend.ps1
```

### 4. Deploy del Workload

```powershell
.\scripts\Deploy\DeployWorkload.ps1
```

Segui il wizard interattivo per:
- Selezionare workspace Fabric
- Caricare i file manifest
- Pubblicare il workload

---

## 📖 Utilizzo della POC

### 1. Creare un BC Data Loader Item

1. Vai sul tuo workspace Fabric
2. Clicca **+ New**
3. Seleziona **BC Data Loader** dalla lista
4. Nome: `BC Customer Sync`
5. Clicca **Create**

### 2. Configurare Business Central Connection

Al primo avvio, vedrai la **Empty View** con wizard di configurazione:

#### Step 1: Business Central Configuration

Inserisci:
- **OData Base URL**: `https://api.businesscentral.dynamics.com/v2.0/{tenant-id}/Production/ODataV4/`
- **Azure AD Tenant ID**: `00000000-0000-0000-0000-000000000000`
- **Client ID**: `00000000-0000-0000-0000-000000000000`
- **Client Secret**: `your-secret-value`
- **Company Name** (opzionale): `CRONUS International Ltd.`

Clicca **Test Connection** per verificare che funzioni.

Se il test ha successo, clicca **Next**.

#### Step 2: Lakehouse Configuration

Inserisci:
- **Workspace ID**: `00000000-0000-0000-0000-000000000000`
- **Workspace Name**: `My Workspace`
- **Lakehouse ID**: `00000000-0000-0000-0000-000000000000`
- **Lakehouse Name**: `BC_Data_Lakehouse`
- **Delta Table Name**: `bc_customers`

Clicca **Finish Setup**.

### 3. Salvare la Configurazione

Dopo aver completato il wizard:
1. Verrai reindirizzato alla **Default View**
2. Clicca **Save** nel ribbon per salvare la configurazione

### 4. Eseguire la Sincronizzazione

Nella Default View:
1. Verifica la configurazione nel pannello sinistro
2. Clicca il bottone **Sync Now** nel pannello centrale
3. Osserva la progress bar con messaggi di stato:
   - "Connecting to Business Central..."
   - "Fetched X customers from BC"
   - "Converting data to Delta format..."
   - "Writing data to Lakehouse..."
   - "Sync completed successfully"

### 5. Verificare i Risultati

#### A. Storico Sincronizzazioni

Nella sezione **Sync History** vedrai una tabella con:
- **Timestamp**: Quando è stata eseguita la sync
- **Status**: success / failed
- **Records**: Processati / Scritti
- **Duration**: Tempo impiegato in secondi

#### B. Lakehouse Data

1. Vai sul Lakehouse in Fabric
2. Apri la sezione **Tables**
3. Dovresti vedere `bc_customers` con i dati sincronizzati
4. Clicca sulla tabella per vedere i dati

---

## 🔍 Struttura Dati Delta Table

La tabella `bc_customers` contiene i seguenti campi (flattened da BC Customer):

| Campo | Tipo | Descrizione |
|-------|------|-------------|
| `id` | string | ID univoco customer |
| `number` | string | Numero cliente |
| `displayName` | string | Nome cliente |
| `type` | string | Tipo (Person/Company) |
| `address_street` | string | Via |
| `address_city` | string | Città |
| `address_state` | string | Provincia/Stato |
| `address_country` | string | Codice paese |
| `address_postalCode` | string | CAP |
| `phoneNumber` | string | Telefono |
| `email` | string | Email |
| `website` | string | Sito web |
| `taxLiable` | boolean | Soggetto IVA |
| `taxAreaId` | string | ID area fiscale |
| `taxAreaDisplayName` | string | Nome area fiscale |
| `taxRegistrationNumber` | string | Partita IVA |
| `currencyCode` | string | Codice valuta |
| `paymentTermsId` | string | ID termini pagamento |
| `shipmentMethodId` | string | ID metodo spedizione |
| `paymentMethodId` | string | ID metodo pagamento |
| `blocked` | string | Stato blocco |
| `lastModifiedDateTime` | string | Ultimo aggiornamento BC |
| `syncTimestamp` | string | Timestamp sincronizzazione |

---

## ⚙️ Configurazioni Avanzate

### Sincronizzazione Incrementale

Per abilitare la sincronizzazione incrementale (solo record modificati):

1. La configurazione è già supportata in `BCDataLoaderItemDefinition.ts`
2. Nel codice, la proprietà `incrementalSync` è settata a `false` di default
3. Per abilitarla, modifica `BCDataLoaderItemDefinition.ts` linea 55:

```typescript
syncConfiguration: {
  entityName: 'customers',
  entityDisplayName: 'Customers',
  incrementalSync: true,  // Cambia a true
  selectedFields: []
},
```

Quando abilitata, la sync leggerà solo i record con `lastModifiedDateTime > lastSyncTimestamp`.

### Filtrare i Dati BC

Per aggiungere filtri OData personalizzati:

1. Modifica `BCDataLoaderItemDefinition.ts`
2. Aggiungi `filterExpression` nella `syncConfiguration`:

```typescript
syncConfiguration: {
  entityName: 'customers',
  entityDisplayName: 'Customers',
  filterExpression: "blocked eq ''",  // Solo clienti non bloccati
  incrementalSync: false,
  selectedFields: []
},
```

Esempi di filtri OData:
- `"blocked eq ''"` - Solo clienti non bloccati
- `"currencyCode eq 'EUR'"` - Solo clienti in EUR
- `"lastModifiedDateTime gt 2024-01-01T00:00:00Z"` - Modificati dopo data

### Selezionare Solo Alcuni Campi

Per ridurre il payload OData:

```typescript
syncConfiguration: {
  entityName: 'customers',
  entityDisplayName: 'Customers',
  selectedFields: ['id', 'number', 'displayName', 'email'],
  incrementalSync: false
},
```

### Cambiare Write Mode

Per cambiare da `overwrite` (sovrascrive tabella) a `append` (aggiunge record):

```typescript
lakehouseTarget: {
  lakehouseId: '...',
  lakehouseName: '...',
  workspaceId: '...',
  workspaceName: '...',
  tableName: 'bc_customers',
  writeMode: 'append'  // Cambia da 'overwrite' a 'append'
}
```

---

## 🧪 Testing e Debug

### Testare la Connessione BC

Il wizard include un bottone **Test Connection** che:
1. Ottiene un access token OAuth da Azure AD
2. Esegue una query OData di test (`$top=1`)
3. Verifica che la risposta sia valida

### Log e Debugging

Apri la **Console del Browser** (F12) per vedere:
- Log delle chiamate OData
- Progress della sincronizzazione
- Eventuali errori dettagliati

### Errori Comuni

#### "OAuth token request failed: 401"

**Causa**: Credenziali Azure AD errate
**Soluzione**: Verifica Tenant ID, Client ID e Client Secret

#### "OData request failed: 403 Forbidden"

**Causa**: Permessi API insufficienti
**Soluzione**: Verifica che l'App Registration abbia `API.ReadWrite.All` su BC

#### "Failed to write Delta table"

**Causa**: Lakehouse ID o Workspace ID errati
**Soluzione**: Verifica gli ID dal Fabric Portal URL

#### "Company not found"

**Causa**: Nome company errato o non esistente
**Soluzione**: Lascia vuoto per default company, o usa nome esatto

---

## 🔐 Sicurezza

### ⚠️ Note di Sicurezza per Produzione

Questa POC memorizza il **Client Secret in chiaro** nella definizione dell'item per semplicità.

**Per produzione**, considera:

1. **Azure Key Vault Integration**:
   ```typescript
   // Invece di salvare clientSecret nella definition
   // Salvare il Key Vault Secret ID
   connectionSettings: {
     clientSecretVaultId: 'https://myvault.vault.azure.net/secrets/bc-secret'
   }
   ```

2. **Managed Identity**: Usa Managed Identity invece di Client Secret

3. **Encryption at Rest**: Cripta i dati sensibili nella definition

---

## 📊 Estensioni Future

### Supporto per Altre Entità BC

Per aggiungere supporto a Sales Orders, Items, etc.:

1. Aggiungi interfacce TypeScript in `BusinessCentralClient.ts`:
   ```typescript
   export interface BCSalesOrder {
     id: string;
     number: string;
     orderDate: string;
     // ...
   }
   ```

2. Aggiungi metodi nel client:
   ```typescript
   async getAllSalesOrders(): Promise<BCSalesOrder[]> {
     return this.getAllPaginated('salesOrders');
   }
   ```

3. Aggiungi logica flatten in `LakehouseSyncService.ts`

### Schedulazione Automatica

Per sync automatiche:

1. Usa **Fabric Data Pipeline** con trigger scheduled
2. Chiama l'item via API per triggerare sync
3. O implementa un timer interno usando `setInterval`

### Trasformazioni Custom

Per trasformare i dati prima del caricamento:

1. Modifica `flattenCustomerForDelta()` in `LakehouseSyncService.ts`
2. Aggiungi calcoli, formattazioni, lookup, etc.

---

## 📞 Supporto

Per problemi o domande sulla POC:

1. Controlla i log nel browser (F12 Console)
2. Verifica la configurazione Azure AD e BC
3. Testa la connessione passo-passo

---

## ✅ Checklist Setup Completo

- [ ] App Registration Azure AD creata
- [ ] API Permissions configurate e approvate
- [ ] Client Secret generato e salvato
- [ ] Lakehouse Fabric creato
- [ ] Workspace ID e Lakehouse ID recuperati
- [ ] `.env` file configurato
- [ ] Manifest buildato (`BuildManifest.ps1`)
- [ ] Frontend buildato (`BuildFrontend.ps1`)
- [ ] Workload deployato (`DeployWorkload.ps1`)
- [ ] Item BC Data Loader creato in Fabric
- [ ] Configurazione BC testata con successo
- [ ] Configurazione Lakehouse completata
- [ ] Prima sincronizzazione eseguita
- [ ] Dati verificati nel Lakehouse

---

🎉 **Congratulazioni!** La tua POC BC Data Loader per Microsoft Fabric è operativa!
