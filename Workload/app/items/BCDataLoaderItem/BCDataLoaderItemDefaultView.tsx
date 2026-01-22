import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Card,
  Text,
  makeStyles,
  tokens,
  Spinner,
  ProgressBar,
  DataGrid,
  DataGridHeader,
  DataGridRow,
  DataGridHeaderCell,
  DataGridBody,
  DataGridCell,
  TableCellLayout,
  TableColumnDefinition,
  createTableColumn
} from "@fluentui/react-components";
import {
  ArrowSync24Regular,
  Database24Regular,
  CloudArrowUp24Regular,
  Checkmark24Filled,
  Dismiss24Filled,
  Info24Regular
} from "@fluentui/react-icons";
import { WorkloadClientAPI } from "@ms-fabric/workload-client";
import { ItemWithDefinition } from "../../controller/ItemCRUDController";
import { ItemEditorDefaultView } from "../../components/ItemEditor";
import { BCDataLoaderItemDefinition, SyncHistoryEntry } from "./BCDataLoaderItemDefinition";
import { BusinessCentralClient } from "../../clients/BusinessCentralClient";
import { LakehouseSyncService } from "./LakehouseSyncService";
import { FabricPlatformAPIClient } from "../../clients/FabricPlatformAPIClient";

interface BCDataLoaderItemDefaultViewProps {
  workloadClient: WorkloadClientAPI;
  item?: ItemWithDefinition<BCDataLoaderItemDefinition>;
  currentDefinition: BCDataLoaderItemDefinition;
  onDefinitionChange: (definition: BCDataLoaderItemDefinition) => void;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXL,
    padding: tokens.spacingVerticalXXL,
    height: '100%'
  },
  card: {
    padding: tokens.spacingVerticalL
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    justifyContent: 'space-between'
  },
  infoRow: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    alignItems: 'center'
  },
  syncProgress: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalS
  },
  successIcon: {
    color: tokens.colorPaletteGreenForeground1
  },
  errorIcon: {
    color: tokens.colorPaletteRedForeground1
  },
  infoIcon: {
    color: tokens.colorPaletteBlueForeground1
  },
  historyTable: {
    maxHeight: '300px',
    overflowY: 'auto'
  }
});

/**
 * Main view for BC Data Loader with sync functionality
 */
export function BCDataLoaderItemDefaultView({
  workloadClient,
  item,
  currentDefinition,
  onDefinitionChange
}: BCDataLoaderItemDefaultViewProps) {
  const { t } = useTranslation();
  const styles = useStyles();

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState('');

  const handleSync = async () => {
    if (!currentDefinition.connectionSettings || !currentDefinition.lakehouseTarget) {
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);
    setSyncMessage('Initializing sync...');

    try {
      // Create clients
      const bcClient = new BusinessCentralClient(currentDefinition.connectionSettings);
      const fabricAPI = FabricPlatformAPIClient.create(workloadClient);
      const syncService = new LakehouseSyncService(
        bcClient,
        fabricAPI.oneLakeStorage,
        fabricAPI.spark
      );

      // Execute sync with progress callback
      const historyEntry = await syncService.syncCustomersToLakehouse(
        currentDefinition.syncConfiguration,
        currentDefinition.lakehouseTarget,
        (message, progress) => {
          setSyncMessage(message);
          setSyncProgress(progress);
        }
      );

      // Update definition with new history entry
      const updatedHistory = [historyEntry, ...currentDefinition.syncHistory].slice(0, 50);
      const updatedDefinition: BCDataLoaderItemDefinition = {
        ...currentDefinition,
        syncHistory: updatedHistory,
        syncConfiguration: {
          ...currentDefinition.syncConfiguration,
          lastSyncTimestamp: new Date().toISOString()
        }
      };

      onDefinitionChange(updatedDefinition);

    } catch (error) {
      console.error('Sync failed:', error);
      setSyncMessage(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Columns for sync history table
  const columns: TableColumnDefinition<SyncHistoryEntry>[] = [
    createTableColumn<SyncHistoryEntry>({
      columnId: 'timestamp',
      renderHeaderCell: () => t('BCDataLoader_History_Timestamp', 'Timestamp'),
      renderCell: (item) => (
        <TableCellLayout>
          {new Date(item.timestamp).toLocaleString()}
        </TableCellLayout>
      ),
    }),
    createTableColumn<SyncHistoryEntry>({
      columnId: 'status',
      renderHeaderCell: () => t('BCDataLoader_History_Status', 'Status'),
      renderCell: (item) => (
        <TableCellLayout
          media={
            item.status === 'success' ? (
              <Checkmark24Filled className={styles.successIcon} />
            ) : (
              <Dismiss24Filled className={styles.errorIcon} />
            )
          }
        >
          {item.status}
        </TableCellLayout>
      ),
    }),
    createTableColumn<SyncHistoryEntry>({
      columnId: 'records',
      renderHeaderCell: () => t('BCDataLoader_History_Records', 'Records'),
      renderCell: (item) => (
        <TableCellLayout>
          {item.recordsProcessed} / {item.recordsWritten}
        </TableCellLayout>
      ),
    }),
    createTableColumn<SyncHistoryEntry>({
      columnId: 'duration',
      renderHeaderCell: () => t('BCDataLoader_History_Duration', 'Duration'),
      renderCell: (item) => (
        <TableCellLayout>
          {(item.durationMs / 1000).toFixed(2)}s
        </TableCellLayout>
      ),
    }),
  ];

  const leftPanel = {
    title: t('BCDataLoader_Configuration', 'Configuration'),
    content: (
      <div className={styles.section}>
        <Card className={styles.card}>
          <div className={styles.section}>
            <Text weight="semibold">
              <Database24Regular /> {t('BCDataLoader_BCConnection', 'Business Central')}
            </Text>
            <div className={styles.infoRow}>
              <Info24Regular className={styles.infoIcon} />
              <Text size={200}>{currentDefinition.connectionSettings?.baseUrl}</Text>
            </div>
            {currentDefinition.connectionSettings?.companyName && (
              <Text size={200}>Company: {currentDefinition.connectionSettings.companyName}</Text>
            )}
          </div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.section}>
            <Text weight="semibold">
              <CloudArrowUp24Regular /> {t('BCDataLoader_Lakehouse', 'Target Lakehouse')}
            </Text>
            <div className={styles.infoRow}>
              <Info24Regular className={styles.infoIcon} />
              <Text size={200}>{currentDefinition.lakehouseTarget?.lakehouseName || currentDefinition.lakehouseTarget?.lakehouseId}</Text>
            </div>
            <Text size={200}>Table: {currentDefinition.lakehouseTarget?.tableName}</Text>
            <Text size={200}>Mode: {currentDefinition.lakehouseTarget?.writeMode}</Text>
          </div>
        </Card>

        <Card className={styles.card}>
          <div className={styles.section}>
            <Text weight="semibold">{t('BCDataLoader_EntityConfig', 'Entity Configuration')}</Text>
            <Text size={200}>Entity: {currentDefinition.syncConfiguration?.entityDisplayName}</Text>
            <Text size={200}>
              Incremental: {currentDefinition.syncConfiguration?.incrementalSync ? 'Yes' : 'No'}
            </Text>
            {currentDefinition.syncConfiguration?.lastSyncTimestamp && (
              <Text size={200}>
                Last Sync: {new Date(currentDefinition.syncConfiguration.lastSyncTimestamp).toLocaleString()}
              </Text>
            )}
          </div>
        </Card>
      </div>
    )
  };

  const centerPanel = {
    content: (
      <div className={styles.container}>
        <div className={styles.section}>
          <div className={styles.row}>
            <Text size={600} weight="semibold">
              {t('BCDataLoader_SyncTitle', 'Data Synchronization')}
            </Text>
            <Button
              appearance="primary"
              icon={<ArrowSync24Regular />}
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? t('BCDataLoader_Syncing', 'Syncing...') : t('BCDataLoader_SyncNow', 'Sync Now')}
            </Button>
          </div>

          {isSyncing && (
            <div className={styles.syncProgress}>
              <Text>{syncMessage}</Text>
              <ProgressBar value={syncProgress / 100} />
            </div>
          )}
        </div>

        <div className={styles.section}>
          <Text size={500} weight="semibold">
            {t('BCDataLoader_SyncHistory', 'Sync History')}
          </Text>

          {currentDefinition.syncHistory.length === 0 ? (
            <Card className={styles.card}>
              <Text>{t('BCDataLoader_NoHistory', 'No sync history yet. Click "Sync Now" to start.')}</Text>
            </Card>
          ) : (
            <div className={styles.historyTable}>
              <DataGrid
                items={currentDefinition.syncHistory}
                columns={columns}
                sortable
                resizableColumns
              >
                <DataGridHeader>
                  <DataGridRow>
                    {({ renderHeaderCell }) => (
                      <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
                    )}
                  </DataGridRow>
                </DataGridHeader>
                <DataGridBody<SyncHistoryEntry>>
                  {({ item, rowId }) => (
                    <DataGridRow<SyncHistoryEntry> key={rowId}>
                      {({ renderCell }) => (
                        <DataGridCell>{renderCell(item)}</DataGridCell>
                      )}
                    </DataGridRow>
                  )}
                </DataGridBody>
              </DataGrid>
            </div>
          )}
        </div>
      </div>
    )
  };

  return (
    <ItemEditorDefaultView
      left={leftPanel}
      center={centerPanel}
    />
  );
}
