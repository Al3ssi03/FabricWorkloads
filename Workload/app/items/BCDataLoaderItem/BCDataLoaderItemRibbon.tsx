import React from "react";
import { useTranslation } from "react-i18next";
import { PageProps } from '../../App';
import {
  Ribbon,
  RibbonAction,
  createSaveAction
} from '../../components/ItemEditor';
import { ViewContext } from '../../components';
import { ArrowSync24Regular } from "@fluentui/react-icons";
import { BCDataLoaderItemDefinition } from "./BCDataLoaderItemDefinition";

/**
 * Props interface for the BC Data Loader Ribbon component
 */
export interface BCDataLoaderItemRibbonProps extends PageProps {
  isSaveButtonEnabled?: boolean;
  viewContext: ViewContext;
  saveItemCallback: () => Promise<void>;
  currentDefinition: BCDataLoaderItemDefinition;
}

/**
 * BCDataLoaderItemRibbon - Ribbon with Save and Sync actions
 *
 * This ribbon provides:
 * - Save action (standard)
 * - Sync action (custom for BC Data Loader)
 */
export function BCDataLoaderItemRibbon(props: BCDataLoaderItemRibbonProps) {
  const { viewContext, currentDefinition } = props;
  const { t } = useTranslation();

  // Use the save action factory for automatic translation and consistent styling
  const saveAction = createSaveAction(
    props.saveItemCallback,
    !props.isSaveButtonEnabled
  );

  // Custom sync action - will be triggered from the view itself
  // This is just a placeholder to show it could be here
  /*
  const syncAction: RibbonAction = {
    key: 'sync-data',
    icon: ArrowSync24Regular,
    label: t("BCDataLoader_Ribbon_Sync_Label", "Sync Data"),
    onClick: async () => {
      // Sync is handled in the view itself
      console.log("Sync action - handled in view");
    },
    testId: 'ribbon-sync-btn',
    disabled: !currentDefinition.isConfigured
  };
  */

  // Define home toolbar actions
  const homeToolbarActions: RibbonAction[] = [
    saveAction,
    // syncAction  // Uncomment if you want sync in ribbon instead of in the view
  ];

  return (
    <Ribbon
      homeToolbarActions={homeToolbarActions}
      viewContext={viewContext}
    />
  );
}
