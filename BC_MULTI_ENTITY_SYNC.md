# BC Data Loader - Multi-Entity Sync

## 🎯 Nuova Funzionalità: Auto-Discovery e Sync di Tutte le Entità OData

La POC è stata estesa per supportare la **sincronizzazione automatica di qualsiasi entità OData** disponibile in Business Central.

---

## ✨ Caratteristiche Implementate

### 1. **Auto-Discovery Entità OData**
- Legge il `$metadata` endpoint di BC
- Estrae automaticamente tutte le entità disponibili
- Filtra entità di sistema (Microsoft.*, NAV.*, etc.)
- Presenta lista user-friendly con nomi formattati

### 2. **Selezione Multi-Entità**
- Interfaccia con checkbox per selezionare entità
- Pre-selezione automatica di entità comuni:
  - Customers
  - Vendors
  - Items
  - Sales Orders
  - Purchase Orders
- Possibilità di selezionare qualsiasi combinazione

### 3. **Sync Generico**
- Funziona con **qualsiasi** entità OData
- Flattening automatico di oggetti nested
- Gestione array (convertiti in JSON string)
- Folder structure organizzata: `{Company}_{Entity}/`

---

## 🔄 Nuovo Flusso di Installazione

### Step 1: Configurazione Base (come prima)
- App Registration ID
- Key Vault URL
- BC Environment
- Companies

### Step 2: **Discovery Entità** (NUOVO)
1. Click **"Next: Select Entities"**
2. Sistema si connette a BC tramite Key Vault
3. Legge `$metadata` della prima company
4. Mostra lista entità disponibili

**Esempio di entità scoperte:**
```
✓ Customers
✓ Vendors
✓ Items
✓ Sales Orders
□ Purchase Orders
□ G/L Accounts
□ Item Ledger Entries
□ Value Entries
□ Sales Invoices
□ Purchase Invoices
... (tutte le entità disponibili)
```

### Step 3: **Selezione Entità** (NUOVO)
- Checkbox per ogni entità
- Mostra numero entità selezionate
- Button: **"Next: Install (N selected)"**

### Step 4: Conferma
- Riepilogo configurazione:
  - Environment
  - Companies
  - **Entità selezionate**
  - Lakehouse da creare

### Step 5: Installazione
- Stessi 5 step di prima
- Salva entità selezionate nella configuration

---

## 📊 Struttura Dati Lakehouse

### Folder Structure

```
bc2fabric_internal/
└── Tables/
    ├── CRONUS_International_Ltd_customers/
    │   └── data_*.json
    ├── CRONUS_International_Ltd_items/
    │   └── data_*.json
    ├── CRONUS_International_Ltd_salesOrders/
    │   └── data_*.json
    ├── My_Company_customers/
    │   └── data_*.json
    └── My_Company_items/
        └── data_*.json
```

**Pattern**: `{CompanySlug}_{EntitySlug}/data_timestamp.json`

### Record Format

Ogni record in qualsiasi tabella include:

```json
{
  "company": "CRONUS International Ltd.",
  "entity": "customers",
  "syncTimestamp": "2024-01-20T10:30:00Z",

  // Campi dell'entità (flattened se nested)
  "id": "...",
  "number": "...",
  "displayName": "...",
  "address_street": "...",   // ← Nested object flattened
  "address_city": "...",
  "phoneNumber": "...",
  ...
}
```

### Flattening Automatico

**Input OData (con nested objects):**
```json
{
  "id": "123",
  "displayName": "Contoso",
  "address": {
    "street": "Via Roma 1",
    "city": "Milano",
    "postalCode": "20100"
  },
  "contact": {
    "email": "info@contoso.com",
    "phone": "+39 02 1234567"
  }
}
```

**Output Delta (flattened):**
```json
{
  "company": "CRONUS International Ltd.",
  "entity": "customers",
  "syncTimestamp": "2024-01-20T10:30:00Z",
  "id": "123",
  "displayName": "Contoso",
  "address_street": "Via Roma 1",
  "address_city": "Milano",
  "address_postalCode": "20100",
  "contact_email": "info@contoso.com",
  "contact_phone": "+39 02 1234567"
}
```

---

## 🔧 Implementazione Tecnica

### BusinessCentralClient - Nuovi Metodi

#### `getAvailableEntities(companyName)`
```typescript
// Legge $metadata e restituisce lista entità
const entities = await bcClient.getAvailableEntities('CRONUS International Ltd.');

// Returns:
[
  { name: 'customers', displayName: 'Customers' },
  { name: 'items', displayName: 'Items' },
  { name: 'salesOrders', displayName: 'Sales Orders' },
  ...
]
```

**URL chiamato:**
```
https://api.businesscentral.dynamics.com/v2.0/{tenant}/{env}/ODataV4/Company('CRONUS International Ltd.')/$metadata
```

#### `getEntityData<T>(companyName, entityName, filter, select, top)`
```typescript
// Legge dati da qualsiasi entità
const items = await bcClient.getEntityData(
  'CRONUS International Ltd.',
  'items',
  "type eq 'Inventory'",  // Optional filter
  ['number', 'description', 'unitPrice'],  // Optional select
  100  // Optional top
);
```

**URL chiamato:**
```
https://api.businesscentral.dynamics.com/v2.0/{tenant}/{env}/ODataV4/Company('CRONUS International Ltd.')/items?$filter=type eq 'Inventory'&$select=number,description,unitPrice&$top=100
```

### BCDataLoaderItemDefinition - Nuova Struttura

**Prima (single entity):**
```typescript
interface SyncConfiguration {
  entityName: string;
  entityDisplayName: string;
  incrementalSync: boolean;
}
```

**Dopo (multi-entity):**
```typescript
interface EntityToSync {
  name: string;
  displayName: string;
  enabled: boolean;
  filterExpression?: string;
  lastSyncTimestamp?: string;
}

interface SyncConfiguration {
  entities: EntityToSync[];  // ← Array di entità
  incrementalSync: boolean;
}
```

**Esempio configuration:**
```json
{
  "syncConfiguration": {
    "entities": [
      {
        "name": "customers",
        "displayName": "Customers",
        "enabled": true
      },
      {
        "name": "items",
        "displayName": "Items",
        "enabled": true,
        "filterExpression": "type eq 'Inventory'"
      },
      {
        "name": "salesOrders",
        "displayName": "Sales Orders",
        "enabled": false
      }
    ],
    "incrementalSync": false
  }
}
```

### LakehouseSyncService - Logica Generica

#### Flattening Ricorsivo

```typescript
private flattenRecordForDelta(
  record: any,
  companyName: string,
  entityName: string,
  prefix: string = ''
): Record<string, any> {
  const flattened = {
    company: companyName,
    entity: entityName,
    syncTimestamp: new Date().toISOString()
  };

  for (const [key, value] of Object.entries(record)) {
    const newKey = prefix ? `${prefix}_${key}` : key;

    if (typeof value === 'object' && !Array.isArray(value)) {
      // Recursively flatten nested
      const nested = this.flattenRecordForDelta(value, company, entity, newKey);
      Object.assign(flattened, nested);
    } else if (Array.isArray(value)) {
      // Arrays to JSON string
      flattened[newKey] = JSON.stringify(value);
    } else {
      flattened[newKey] = value;
    }
  }

  return flattened;
}
```

#### Sync Multi-Entity

```typescript
async syncAllCompaniesToLakehouse(
  companies: string[],
  syncConfig: SyncConfiguration,
  lakehouseTarget: LakehouseTarget,
  onProgress?: (message: string, progress: number) => void
): Promise<SyncHistoryEntry[]> {
  const enabledEntities = syncConfig.entities.filter(e => e.enabled);

  const historyEntries = [];

  for (const company of companies) {
    for (const entity of enabledEntities) {
      onProgress?.(`Syncing ${entity.displayName} for ${company}...`, progress);

      // Generic sync per entity
      const entry = await this.syncSingleEntityToLakehouse(
        company,
        entity,
        syncConfig,
        lakehouseTarget
      );

      historyEntries.push(entry);
    }
  }

  return historyEntries;
}
```

---

## 📈 Esempi di Utilizzo

### Scenario 1: Sync Solo Clienti e Fornitori

**Configurazione:**
- Companies: `["CRONUS International Ltd."]`
- Entities:
  - ✓ Customers
  - ✓ Vendors
  - ✗ Items
  - ✗ Sales Orders

**Risultato Lakehouse:**
```
Tables/
├── CRONUS_International_Ltd_customers/
│   └── data_1234567890.json (500 records)
└── CRONUS_International_Ltd_vendors/
    └── data_1234567891.json (120 records)
```

### Scenario 2: Sync Completo Multi-Company

**Configurazione:**
- Companies: `["Company A", "Company B"]`
- Entities:
  - ✓ Customers
  - ✓ Items
  - ✓ Sales Orders
  - ✓ Purchase Orders

**Risultato Lakehouse:**
```
Tables/
├── Company_A_customers/
├── Company_A_items/
├── Company_A_salesOrders/
├── Company_A_purchaseOrders/
├── Company_B_customers/
├── Company_B_items/
├── Company_B_salesOrders/
└── Company_B_purchaseOrders/
```

**Sync History:**
```
8 entries (2 companies × 4 entities)
├── Company A - customers: 450 records
├── Company A - items: 1200 records
├── Company A - salesOrders: 320 records
├── Company A - purchaseOrders: 180 records
├── Company B - customers: 280 records
├── Company B - items: 890 records
├── Company B - salesOrders: 210 records
└── Company B - purchaseOrders: 95 records
```

### Scenario 3: Sync con Filtri Custom

**Configurazione per Items:**
```typescript
{
  name: "items",
  displayName: "Items",
  enabled: true,
  filterExpression: "type eq 'Inventory' and blocked eq false"
}
```

**OData Query generata:**
```
/Company('CRONUS')/items?$filter=type eq 'Inventory' and blocked eq false&$top=100
```

---

## 🎨 UI/UX Flow Completo

### 1. Welcome Screen
```
┌─────────────────────────────────────┐
│  Welcome to BC Data Loader          │
│                                     │
│  [Install BC Data Loader]           │
└─────────────────────────────────────┘
```

### 2. Configuration Form
```
┌─────────────────────────────────────┐
│  Installation Configuration         │
├─────────────────────────────────────┤
│  App Registration Id: [___________] │
│  Key Vault: [____________________] │
│  BC Environment: [Production v  ]   │
│                                     │
│  Companies:                         │
│  ┌ [CRONUS International Ltd.] [x] │
│  └ [Add Company]                    │
│                                     │
│  [Back]  [Next: Select Entities ⟶] │
└─────────────────────────────────────┘
```

### 3. Entity Selection (NUOVO)
```
┌─────────────────────────────────────┐
│  Select Entities to Sync            │
│  Found 24 entities in BC            │
├─────────────────────────────────────┤
│  ☑ Customers                        │
│  ☑ Vendors                          │
│  ☑ Items                            │
│  ☑ Sales Orders                     │
│  ☐ Purchase Orders                  │
│  ☐ G/L Accounts                     │
│  ☐ Item Ledger Entries              │
│  ☐ Value Entries                    │
│  ...                                │
│                                     │
│  [Back]  [Next: Install (4 sel.) ⟶]│
└─────────────────────────────────────┘
```

### 4. Installation Summary
```
┌─────────────────────────────────────┐
│  Ready to Install                   │
├─────────────────────────────────────┤
│  Environment: Production            │
│  Companies: CRONUS International... │
│  Entities: Customers, Vendors,      │
│           Items, Sales Orders       │
│  Lakehouse: bc2fabric_internal      │
│                                     │
│  [Back]              [Install]      │
└─────────────────────────────────────┘
```

### 5. Installation Progress
```
┌─────────────────────────────────────┐
│  Installing...                      │
├─────────────────────────────────────┤
│  ✓ Create Folder 'bc2fabric...'    │
│  ✓ Create Mirrored DB               │
│  ⟳ Create Lakehouse                 │
│  ⋯ Create Config files              │
│  ⋯ Run Validation                   │
└─────────────────────────────────────┘
```

---

## 🔍 Query Examples

### SQL su Lakehouse

```sql
-- Tutti i customers di tutte le companies
SELECT company, displayName, email
FROM bc2fabric_internal.CRONUS_International_Ltd_customers
UNION ALL
SELECT company, displayName, email
FROM bc2fabric_internal.My_Company_customers;

-- Items con valore > 100 per company
SELECT company, number, description, unitPrice
FROM bc2fabric_internal.*_items
WHERE CAST(unitPrice AS DECIMAL) > 100
ORDER BY company, unitPrice DESC;

-- Sales Orders recenti
SELECT company, number, orderDate, customer_number
FROM bc2fabric_internal.*_salesOrders
WHERE orderDate > '2024-01-01'
ORDER BY orderDate DESC;

-- Join cross-entity (Customers + Orders)
SELECT
  c.company,
  c.number as customer_number,
  c.displayName as customer_name,
  COUNT(o.number) as order_count
FROM bc2fabric_internal.CRONUS_International_Ltd_customers c
LEFT JOIN bc2fabric_internal.CRONUS_International_Ltd_salesOrders o
  ON c.number = o.customer_number
GROUP BY c.company, c.number, c.displayName;
```

### Spark/Python su Lakehouse

```python
from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("BC Analysis").getOrCreate()

# Read all customers
customers_df = spark.read.json("Tables/CRONUS_International_Ltd_customers/*.json")

# Read all items
items_df = spark.read.json("Tables/CRONUS_International_Ltd_items/*.json")

# Analyze
customers_df.groupBy("company").count().show()
items_df.filter("type == 'Inventory'").select("number", "description", "unitPrice").show()
```

---

## ⚙️ Configurazioni Avanzate

### Filtri per Entità Specifica

```typescript
{
  name: "items",
  displayName: "Items",
  enabled: true,
  filterExpression: "type eq 'Inventory' and unitPrice gt 50"
}
```

### Incremental Sync per Entità

```typescript
{
  name: "customers",
  displayName: "Customers",
  enabled: true,
  lastSyncTimestamp: "2024-01-20T10:00:00Z"
}

// Genera filter: lastModifiedDateTime gt 2024-01-20T10:00:00Z
```

### Select Solo Campi Specifici

```typescript
syncConfiguration: {
  entities: [...],
  selectedFields: ["id", "number", "displayName", "email"]
}

// Applica a tutte le entità: $select=id,number,displayName,email
```

---

## 📝 Limitazioni e Note

### Parsing $metadata
- Usa regex semplice per estrazione EntitySet
- In produzione, usare parser XML completo (DOMParser o xml2js)

### Array in Record
- Convertiti in JSON string
- Per query SQL, usare `JSON_EXTRACT()` functions

### Entità con Relazioni
- Le relazioni OData (`@odata.bind`) non vengono espanse
- Per navigation properties, usare `$expand` (da implementare)

### Performance
- Sync parallela per company/entity può saturare rate limit BC
- Considerare throttling o batch processing

---

## 🚀 Prossimi Passi

### Feature da Aggiungere

1. **$expand Support**
   - Espandere navigation properties
   - Es: `customers?$expand=orders,contacts`

2. **UI Entity Management**
   - Modifica filtri per entità dopo installazione
   - Enable/disable entità on-demand
   - View entity schema prima del sync

3. **Incremental Sync Automatico**
   - Tracking lastSyncTimestamp per entity
   - Sync solo delta changes

4. **Delta Table Optimization**
   - Conversione JSONL → Parquet via Spark
   - Partitioning per company e data
   - Z-ordering per performance query

5. **Schema Evolution**
   - Detect schema changes in BC
   - Auto-merge nuovi campi

---

## ✅ Checklist Testing

### Test Discovery
- [ ] Discovery entità da company con molte entità
- [ ] Discovery con company senza entità custom
- [ ] Gestione errori se $metadata non accessibile

### Test Selezione
- [ ] Selezione singola entità
- [ ] Selezione multiple entità
- [ ] De-selezione entità pre-selezionate

### Test Sync
- [ ] Sync entità con record semplici (solo campi primitivi)
- [ ] Sync entità con nested objects (es. address)
- [ ] Sync entità con array
- [ ] Sync entità vuota (0 records)
- [ ] Sync con filtri custom

### Test Multi-Company
- [ ] Sync stessa entità per 2+ companies
- [ ] Sync entità diverse per company diversa
- [ ] Verifica folder structure corretta

### Test Error Handling
- [ ] Entità non accessibile (permessi mancanti)
- [ ] Entità inesistente
- [ ] Network timeout durante discovery
- [ ] Lakehouse write failure

---

🎉 **La POC ora supporta la sincronizzazione automatica di TUTTE le entità OData disponibili in Business Central!**
