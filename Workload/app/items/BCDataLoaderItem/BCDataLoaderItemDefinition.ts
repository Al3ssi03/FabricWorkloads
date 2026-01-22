/**
 * Business Central Data Loader Item Definition
 * Stores configuration for BC connection and sync settings
 */

export interface BCConnectionSettings {
  /** Azure AD Client ID (App Registration) for BC API */
  appRegistrationId: string;
  /** Key Vault URL containing the BC API secret (e.g., https://myvault.vault.azure.net/secrets/bc2fabric-bc-api-secret) */
  keyVaultUrl: string;
  /** BC Environment name (e.g., Production, Sandbox) */
  environment: string;
  /** List of BC company names to sync */
  companies: string[];
}

export interface EntityToSync {
  /** Entity name (OData EntitySet name) */
  name: string;
  /** Display name for UI */
  displayName: string;
  /** Is this entity enabled for sync? */
  enabled: boolean;
  /** OData filter expression (optional) */
  filterExpression?: string;
  /** Last sync timestamp for incremental sync */
  lastSyncTimestamp?: string;
}

export interface SyncConfiguration {
  /** List of entities to sync */
  entities: EntityToSync[];
  /** Enable incremental sync based on lastModifiedDateTime */
  incrementalSync: boolean;
  /** Fields to select (if empty, select all) - applies to all entities */
  selectedFields?: string[];
}

export interface LakehouseTarget {
  /** Lakehouse item ID (auto-created during setup) */
  lakehouseId?: string;
  /** Lakehouse display name */
  lakehouseName: string;
  /** Workspace ID containing the lakehouse */
  workspaceId: string;
  /** Workspace name */
  workspaceName: string;
  /** Auto-create lakehouse if not exists */
  autoCreate: boolean;
  /** Folder name for internal data */
  internalFolderName: string;
}

export interface SyncHistoryEntry {
  /** Timestamp of sync operation */
  timestamp: string;
  /** Status: 'success', 'failed', 'partial' */
  status: 'success' | 'failed' | 'partial';
  /** Company synced */
  companyName: string;
  /** Entity synced */
  entityName: string;
  /** Number of records processed */
  recordsProcessed: number;
  /** Number of records written to lakehouse */
  recordsWritten: number;
  /** Error message if failed */
  errorMessage?: string;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Main item definition structure
 */
export interface BCDataLoaderItemDefinition {
  /** Version of the definition schema */
  version: string;
  /** BC connection configuration */
  connectionSettings?: BCConnectionSettings;
  /** Sync configuration */
  syncConfiguration?: SyncConfiguration;
  /** Target lakehouse configuration */
  lakehouseTarget?: LakehouseTarget;
  /** Sync history (last 50 entries) */
  syncHistory: SyncHistoryEntry[];
  /** Is configuration complete? */
  isConfigured: boolean;
  /** Last configuration update timestamp */
  lastUpdated: string;
}

/**
 * Default empty definition for new items
 */
export const createEmptyBCDataLoaderDefinition = (): BCDataLoaderItemDefinition => ({
  version: '1.0',
  connectionSettings: undefined,
  syncConfiguration: {
    entities: [],
    incrementalSync: false,
    selectedFields: []
  },
  lakehouseTarget: {
    lakehouseName: 'bc2fabric_internal',
    workspaceId: '',
    workspaceName: '',
    autoCreate: true,
    internalFolderName: 'bc2fabric_internal'
  },
  syncHistory: [],
  isConfigured: false,
  lastUpdated: new Date().toISOString()
});

/**
 * Validate if definition has minimum required configuration
 */
export const isDefinitionValid = (definition: BCDataLoaderItemDefinition): boolean => {
  return !!(
    definition.connectionSettings?.appRegistrationId &&
    definition.connectionSettings?.keyVaultUrl &&
    definition.connectionSettings?.environment &&
    definition.connectionSettings?.companies?.length > 0 &&
    definition.lakehouseTarget?.workspaceId
  );
};
