import { BusinessCentralClient, BCCustomer } from "../../clients/BusinessCentralClient";
import { OneLakeStorageClient } from "../../clients/OneLakeStorageClient";
import { SparkClient } from "../../clients/SparkClient";
import { BCConnectionSettings, SyncConfiguration, LakehouseTarget, SyncHistoryEntry } from "./BCDataLoaderItemDefinition";

/**
 * Service to sync data from Business Central to Fabric Lakehouse as Delta Tables
 * Supports multi-company sync
 */
export class LakehouseSyncService {
  private bcClient: BusinessCentralClient;
  private oneLakeClient: OneLakeStorageClient;
  private sparkClient: SparkClient;

  constructor(
    bcClient: BusinessCentralClient,
    oneLakeClient: OneLakeStorageClient,
    sparkClient: SparkClient
  ) {
    this.bcClient = bcClient;
    this.oneLakeClient = oneLakeClient;
    this.sparkClient = sparkClient;
  }

  /**
   * Sync all enabled entities from all companies to Lakehouse
   */
  async syncAllCompaniesToLakehouse(
    companies: string[],
    syncConfig: SyncConfiguration,
    lakehouseTarget: LakehouseTarget,
    onProgress?: (message: string, progress: number) => void
  ): Promise<SyncHistoryEntry[]> {
    const historyEntries: SyncHistoryEntry[] = [];

    // Get only enabled entities
    const enabledEntities = syncConfig.entities.filter(e => e.enabled);

    if (enabledEntities.length === 0) {
      onProgress?.('No entities enabled for sync', 100);
      return historyEntries;
    }

    const totalOperations = companies.length * enabledEntities.length;
    let currentOperation = 0;

    for (const company of companies) {
      for (const entity of enabledEntities) {
        const baseProgress = (currentOperation / totalOperations) * 100;

        onProgress?.(
          `Syncing ${entity.displayName} for ${company}...`,
          baseProgress
        );

        const entry = await this.syncSingleEntityToLakehouse(
          company,
          entity,
          syncConfig,
          lakehouseTarget,
          (msg, prog) => {
            const totalProgress = baseProgress + (prog / totalOperations);
            onProgress?.(msg, totalProgress);
          }
        );

        historyEntries.push(entry);
        currentOperation++;
      }
    }

    return historyEntries;
  }

  /**
   * Sync a single entity from BC to Lakehouse Delta Table for a single company
   */
  async syncSingleEntityToLakehouse(
    companyName: string,
    entity: import('./BCDataLoaderItemDefinition').EntityToSync,
    syncConfig: SyncConfiguration,
    lakehouseTarget: LakehouseTarget,
    onProgress?: (message: string, progress: number) => void
  ): Promise<SyncHistoryEntry> {
    const startTime = Date.now();
    const historyEntry: SyncHistoryEntry = {
      timestamp: new Date().toISOString(),
      status: 'failed',
      companyName,
      entityName: entity.name,
      recordsProcessed: 0,
      recordsWritten: 0,
      durationMs: 0
    };

    try {
      onProgress?.(`Fetching ${entity.displayName} from ${companyName}...`, 10);

      // 1. Fetch data from Business Central using generic getEntityData
      let records: any[];

      if (syncConfig.incrementalSync && entity.lastSyncTimestamp) {
        // Incremental sync: only fetch records modified since last sync
        const filter = `lastModifiedDateTime gt ${entity.lastSyncTimestamp}`;
        records = await this.bcClient.getEntityData(
          companyName,
          entity.name,
          entity.filterExpression ? `${filter} and ${entity.filterExpression}` : filter,
          syncConfig.selectedFields,
          undefined
        );
        onProgress?.(`Fetched ${records.length} updated ${entity.displayName} from ${companyName}`, 30);
      } else {
        // Full sync
        records = await this.bcClient.getEntityData(
          companyName,
          entity.name,
          entity.filterExpression,
          syncConfig.selectedFields,
          undefined
        );
        onProgress?.(`Fetched ${records.length} ${entity.displayName} from ${companyName}`, 30);
      }

      historyEntry.recordsProcessed = records.length;

      if (records.length === 0) {
        onProgress?.(`No records to sync for ${entity.displayName} in ${companyName}`, 100);
        historyEntry.status = 'success';
        historyEntry.durationMs = Date.now() - startTime;
        return historyEntry;
      }

      onProgress?.('Converting data to Delta format...', 50);

      // 2. Convert data to Delta-compatible format (flatten nested objects)
      const deltaRecords = records.map(record =>
        this.flattenRecordForDelta(record, companyName, entity.name)
      );

      onProgress?.('Writing data to Lakehouse...', 70);

      // 3. Write to Lakehouse as Delta Table
      await this.writeToDeltaTable(
        lakehouseTarget,
        deltaRecords,
        companyName,
        entity.name
      );

      historyEntry.recordsWritten = deltaRecords.length;
      historyEntry.status = 'success';

      onProgress?.(`Sync completed successfully for ${entity.displayName}`, 100);

    } catch (error) {
      console.error(`Sync failed for ${companyName}:`, error);
      historyEntry.status = 'failed';
      historyEntry.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.(`Sync failed for ${companyName}: ${historyEntry.errorMessage}`, 0);
    }

    historyEntry.durationMs = Date.now() - startTime;
    return historyEntry;
  }

  /**
   * Generic flattener for any BC entity
   * Recursively flattens nested objects with underscore notation
   */
  private flattenRecordForDelta(
    record: any,
    companyName: string,
    entityName: string,
    prefix: string = ''
  ): Record<string, any> {
    const flattened: Record<string, any> = {
      company: companyName,
      entity: entityName,
      syncTimestamp: new Date().toISOString()
    };

    for (const [key, value] of Object.entries(record)) {
      const newKey = prefix ? `${prefix}_${key}` : key;

      if (value === null || value === undefined) {
        flattened[newKey] = null;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        // Recursively flatten nested objects
        const nested = this.flattenRecordForDelta(value, companyName, entityName, newKey);
        // Remove company, entity, syncTimestamp from nested (we only want them at root)
        delete nested.company;
        delete nested.entity;
        delete nested.syncTimestamp;
        Object.assign(flattened, nested);
      } else if (Array.isArray(value)) {
        // Convert arrays to JSON string
        flattened[newKey] = JSON.stringify(value);
      } else {
        flattened[newKey] = value;
      }
    }

    return flattened;
  }

  /**
   * Write data to Delta Table using OneLake storage
   * Creates folder structure per company and entity
   */
  private async writeToDeltaTable(
    lakehouseTarget: LakehouseTarget,
    records: Record<string, any>[],
    companyName: string,
    entityName: string
  ): Promise<void> {
    if (!lakehouseTarget.lakehouseId) {
      throw new Error('Lakehouse ID not found. Please run installation first.');
    }

    try {
      // Create item wrapper for the lakehouse
      const itemWrapper = this.oneLakeClient.createItemWrapper({
        id: lakehouseTarget.lakehouseId,
        workspaceId: lakehouseTarget.workspaceId
      });

      // Create folder structure: Tables/{companyName}_{entityName}/
      const companySlug = companyName.replace(/[^a-zA-Z0-9]/g, '_');
      const entitySlug = entityName.replace(/[^a-zA-Z0-9]/g, '_');
      const tableFolderName = `${companySlug}_${entitySlug}`;
      const dataFileName = `data_${Date.now()}.json`;
      const fullPath = `${tableFolderName}/${dataFileName}`;

      // Write data as JSONL (JSON Lines format - one JSON object per line)
      // This format works well with Delta Lake and Spark
      const jsonLines = records.map(record => JSON.stringify(record)).join('\n');

      // Write to Tables folder
      await itemWrapper.writeFileAsText(fullPath, jsonLines);

      console.log(`Wrote ${records.length} records to ${tableFolderName} in Lakehouse`);

      // TODO: For production, trigger Spark job to convert JSONL to Delta Parquet format
      // This would use SparkClient to submit a job like:
      // const sparkJob = await this.sparkClient.submitBatchJob({
      //   file: `Tables/${tableFolderName}/${dataFileName}`,
      //   className: 'DeltaConverter',
      //   args: [tableFolderName]
      // });

    } catch (error) {
      console.error('Failed to write Delta table:', error);
      throw new Error(`Delta table write failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test connection to Business Central
   */
  async testBCConnection(companyName?: string): Promise<{ success: boolean; message: string; details?: any }> {
    return this.bcClient.testConnection(companyName);
  }

  /**
   * Preview data from BC without writing to Lakehouse
   */
  async previewBCData(
    companyName: string,
    entityName: string,
    filter?: string,
    top: number = 10
  ): Promise<any[]> {
    if (entityName === 'customers') {
      const query = [`$top=${top}`];
      if (filter) {
        query.push(`$filter=${encodeURIComponent(filter)}`);
      }
      return this.bcClient.getAllCustomers(companyName, filter, []);
    }

    // For other entities, use generic query
    return this.bcClient.queryEntity(companyName, entityName, `$top=${top}`);
  }

  /**
   * Get list of available companies from BC
   */
  async getAvailableCompanies(): Promise<{ id: string; name: string; displayName: string }[]> {
    return this.bcClient.getCompanies();
  }
}
