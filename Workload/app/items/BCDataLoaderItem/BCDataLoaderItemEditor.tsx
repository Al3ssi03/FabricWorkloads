import React, { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { NotificationType } from "@ms-fabric/workload-client";
import { PageProps, ContextProps } from "../../App";
import { ItemWithDefinition, getWorkloadItem, saveWorkloadItem } from "../../controller/ItemCRUDController";
import { callNotificationOpen } from "../../controller/NotificationController";
import { ItemEditor, useViewNavigation } from "../../components/ItemEditor";
import { BCDataLoaderItemDefinition, createEmptyBCDataLoaderDefinition, isDefinitionValid } from "./BCDataLoaderItemDefinition";
import { BCDataLoaderItemEmptyView } from "./BCDataLoaderItemEmptyView";
import { BCDataLoaderItemDefaultView } from "./BCDataLoaderItemDefaultView";
import { BCDataLoaderItemRibbon } from "./BCDataLoaderItemRibbon";

/**
 * Different views available for the BC Data Loader item
 */
export const EDITOR_VIEW_TYPES = {
  EMPTY: 'empty',
  DEFAULT: 'default',
} as const;

const enum SaveStatus {
  NotSaved = 'NotSaved',
  Saving = 'Saving',
  Saved = 'Saved'
}

export function BCDataLoaderItemEditor(props: PageProps) {
  const { workloadClient } = props;
  const pageContext = useParams<ContextProps>();
  const { t } = useTranslation();

  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [item, setItem] = useState<ItemWithDefinition<BCDataLoaderItemDefinition>>();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(SaveStatus.NotSaved);
  const [currentDefinition, setCurrentDefinition] = useState<BCDataLoaderItemDefinition>(createEmptyBCDataLoaderDefinition());
  const [viewSetter, setViewSetter] = useState<((view: string) => void) | null>(null);

  const { pathname } = useLocation();

  async function loadDataFromUrl(pageContext: ContextProps, pathname: string): Promise<void> {
    // Prevent unnecessary reload if the same item is already loaded
    if (pageContext.itemObjectId && item && item.id === pageContext.itemObjectId) {
      console.log(`Item ${pageContext.itemObjectId} is already loaded, skipping reload`);
      return;
    }

    setIsLoading(true);
    let LoadedItem: ItemWithDefinition<BCDataLoaderItemDefinition> = undefined;

    if (pageContext.itemObjectId) {
      try {
        LoadedItem = await getWorkloadItem<BCDataLoaderItemDefinition>(
          workloadClient,
          pageContext.itemObjectId,
        );

        // Ensure item definition is properly initialized
        if (!LoadedItem.definition || !LoadedItem.definition.version) {
          setSaveStatus(SaveStatus.NotSaved);
          LoadedItem = {
            ...LoadedItem,
            definition: createEmptyBCDataLoaderDefinition()
          };
        } else {
          setSaveStatus(SaveStatus.Saved);
          console.log('LoadedItem definition: ', LoadedItem.definition);
        }

        // Initialize the item
        setItem(LoadedItem);

        // Initialize current definition
        setCurrentDefinition(LoadedItem.definition || createEmptyBCDataLoaderDefinition());

      } catch (error) {
        console.error('Failed to load item:', error);
        setItem(undefined);
      }
    } else {
      console.log(`non-editor context. Current Path: ${pathname}`);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    loadDataFromUrl(pageContext, pathname);
  }, [pageContext, pathname]);

  async function saveItem() {
    setSaveStatus(SaveStatus.Saving);

    // Update item definition with current changes
    item.definition = {
      ...currentDefinition,
      lastUpdated: new Date().toISOString()
    };
    setCurrentDefinition(item.definition);

    let successResult;
    let errorMessage = "";

    try {
      successResult = await saveWorkloadItem<BCDataLoaderItemDefinition>(
        workloadClient,
        item,
      );
    } catch (error) {
      errorMessage = error?.message;
    }

    const wasSaved = Boolean(successResult);

    if (wasSaved) {
      setSaveStatus(SaveStatus.Saved);
      callNotificationOpen(
        props.workloadClient,
        t("ItemEditor_Saved_Notification_Title"),
        t("ItemEditor_Saved_Notification_Text", { itemName: item.displayName }),
        undefined,
        undefined
      );
    } else {
      setSaveStatus(SaveStatus.NotSaved);
      const failureMessage = errorMessage
        ? `${t("ItemEditor_SaveFailed_Notification_Text", { itemName: item.displayName })} ${errorMessage}.`
        : t("ItemEditor_SaveFailed_Notification_Text", { itemName: item.displayName });

      callNotificationOpen(
        props.workloadClient,
        t("ItemEditor_SaveFailed_Notification_Title"),
        failureMessage,
        NotificationType.Error,
        undefined
      );
    }
  }

  // Check if Save should be enabled
  const isSaveEnabled = (currentView: string) => {
    if (currentView === EDITOR_VIEW_TYPES.EMPTY) {
      return false;
    }

    if (saveStatus === SaveStatus.Saving) {
      return false;
    }

    return saveStatus === SaveStatus.NotSaved;
  };

  // Wrapper component for empty view
  const EmptyViewWrapper = () => {
    const { setCurrentView } = useViewNavigation();

    return (
      <BCDataLoaderItemEmptyView
        workloadClient={workloadClient}
        item={item}
        currentDefinition={currentDefinition}
        onDefinitionChange={(newDefinition) => {
          setCurrentDefinition(newDefinition);
          setSaveStatus(SaveStatus.NotSaved);
        }}
        onNavigateToDefault={() => {
          setCurrentView(EDITOR_VIEW_TYPES.DEFAULT);
        }}
      />
    );
  };

  // Static view definitions
  const views = [
    {
      name: EDITOR_VIEW_TYPES.EMPTY,
      component: <EmptyViewWrapper />
    },
    {
      name: EDITOR_VIEW_TYPES.DEFAULT,
      component: (
        <BCDataLoaderItemDefaultView
          workloadClient={workloadClient}
          item={item}
          currentDefinition={currentDefinition}
          onDefinitionChange={(newDefinition) => {
            setCurrentDefinition(newDefinition);
            setSaveStatus(SaveStatus.NotSaved);
          }}
        />
      )
    }
  ];

  // Effect to set the correct view after loading completes
  useEffect(() => {
    if (!isLoading && item && viewSetter) {
      // Determine the correct view based on item configuration state
      const correctView = isDefinitionValid(currentDefinition)
        ? EDITOR_VIEW_TYPES.DEFAULT
        : EDITOR_VIEW_TYPES.EMPTY;
      viewSetter(correctView);
    }
  }, [isLoading, item, viewSetter]);

  return (
    <ItemEditor
      isLoading={isLoading}
      loadingMessage={t("BCDataLoaderItemEditor_Loading", "Loading BC Data Loader...")}
      ribbon={(context) => (
        <BCDataLoaderItemRibbon
          {...props}
          viewContext={context}
          isSaveButtonEnabled={isSaveEnabled(context.currentView)}
          saveItemCallback={saveItem}
          currentDefinition={currentDefinition}
        />
      )}
      views={views}
      viewSetter={(setCurrentView) => {
        if (!viewSetter) {
          setViewSetter(() => setCurrentView);
        }
      }}
    />
  );
}
