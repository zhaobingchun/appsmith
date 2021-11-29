import React, { useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import * as log from "loglevel";

import {
  getIsFetchingPage,
  getCurrentPageId,
  getCurrentPageName,
  previewModeSelector,
} from "selectors/editorSelectors";
import PageTabs from "./PageTabs";
import PerformanceTracker, {
  PerformanceTransactionName,
} from "utils/PerformanceTracker";
import Toolbar from "./Toolbar";
import AnalyticsUtil from "utils/AnalyticsUtil";
import CanvasContainer from "./CanvasContainer";
import { flashElementsById } from "utils/helpers";
import Debugger from "components/editorComponents/Debugger";
import OnboardingTasks from "../FirstTimeUserOnboarding/Tasks";
import CrudInfoModal from "../GeneratePage/components/CrudInfoModal";
import { useWidgetSelection } from "utils/hooks/useWidgetSelection";
import { useDynamicAppLayout } from "utils/hooks/useDynamicAppLayout";
import { getCurrentApplication } from "selectors/applicationSelectors";
import { setCanvasSelectionFromEditor } from "actions/canvasSelectionActions";
import { closePropertyPane, closeTableFilterPane } from "actions/widgetActions";
import {
  getIsOnboardingTasksView,
  getIsOnboardingWidgetSelection,
} from "selectors/entitiesSelector";
import { useAllowEditorDragToSelect } from "utils/hooks/useAllowEditorDragToSelect";
import { getIsFirstTimeUserOnboardingEnabled } from "selectors/onboardingSelectors";
import EditorContextProvider from "components/editorComponents/EditorContextProvider";

/* eslint-disable react/display-name */
function WidgetsEditor() {
  const { deselectAll, focusWidget, selectWidget } = useWidgetSelection();
  const dispatch = useDispatch();
  const currentPageId = useSelector(getCurrentPageId);
  const currentPageName = useSelector(getCurrentPageName);
  const currentApp = useSelector(getCurrentApplication);
  const isFetchingPage = useSelector(getIsFetchingPage);
  const isPreviewMode = useSelector(previewModeSelector);
  const showOnboardingTasks = useSelector(getIsOnboardingTasksView);
  const enableFirstTimeUserOnboarding = useSelector(
    getIsFirstTimeUserOnboardingEnabled,
  );
  const isOnboardingWidgetSelection = useSelector(
    getIsOnboardingWidgetSelection,
  );
  useDynamicAppLayout();
  useEffect(() => {
    PerformanceTracker.stopTracking(PerformanceTransactionName.CLOSE_SIDE_PANE);
  });

  // log page load
  useEffect(() => {
    if (currentPageName !== undefined && currentPageId !== undefined) {
      AnalyticsUtil.logEvent("PAGE_LOAD", {
        pageName: currentPageName,
        pageId: currentPageId,
        appName: currentApp?.name,
        mode: "EDIT",
      });
    }
  }, [currentPageName, currentPageId]);

  // navigate to widget
  useEffect(() => {
    if (!isFetchingPage && window.location.hash.length > 0) {
      const widgetIdFromURLHash = window.location.hash.substr(1);
      flashElementsById(widgetIdFromURLHash);
      if (document.getElementById(widgetIdFromURLHash))
        selectWidget(widgetIdFromURLHash);
    }
  }, [isFetchingPage, selectWidget]);

  const allowDragToSelect = useAllowEditorDragToSelect();

  const handleWrapperClick = useCallback(() => {
    if (allowDragToSelect) {
      focusWidget && focusWidget();
      deselectAll && deselectAll();
      dispatch(closePropertyPane());
      dispatch(closeTableFilterPane());
      dispatch(setCanvasSelectionFromEditor(false));
    }
  }, [allowDragToSelect, focusWidget, deselectAll]);

  /**
   *  drag event handler for selection drawing
   */
  const onDragStart = useCallback(
    (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      if (allowDragToSelect) {
        const startPoints = {
          x: e.clientX,
          y: e.clientY,
        };
        dispatch(setCanvasSelectionFromEditor(true, startPoints));
      }
    },
    [allowDragToSelect],
  );

  log.debug("Canvas rendered");

  PerformanceTracker.stopTracking();
  return (
    <EditorContextProvider>
      {enableFirstTimeUserOnboarding &&
      showOnboardingTasks &&
      !isOnboardingWidgetSelection ? (
        <OnboardingTasks />
      ) : (
        <div
          className="relative flex flex-col overflow-hidden"
          data-testid="widgets-editor"
          draggable
          onClick={handleWrapperClick}
          onDragStart={onDragStart}
        >
          <PageTabs />
          {isPreviewMode === false && <Toolbar />}
          <CanvasContainer />
          <CrudInfoModal />
          <Debugger />
        </div>
      )}
    </EditorContextProvider>
  );
}

export default WidgetsEditor;
