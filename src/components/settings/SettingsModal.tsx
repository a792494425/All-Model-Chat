import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { type AppSettings, type ChatSettings, type ModelOption } from '@/types';
import { Modal } from '@/components/shared/Modal';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { useSettingsLogic } from '@/hooks/settings/useSettingsLogic';
import { SettingsSidebar } from './SettingsSidebar';
import { SettingsContent } from './SettingsContent';
import { SettingsSearchResults } from './SettingsSearchResults';
import { type SettingsTransferProps } from './settingsTypes';
import type { LogViewerProps } from '@/components/log-viewer/LogViewer';
import {
  buildSettingsForModal,
  type SettingsScope,
  splitScopedSettingsUpdate,
} from '@/components/layout/mainContentModels';
import { useSettingsTransferActions } from '@/hooks/data-management/useSettingsTransferActions';
import type { SettingsTab } from '@/stores/settingsUiStore';
import { useSettingsModalSearch } from './modal/useSettingsModalSearch';
import { SettingsModalHeader } from './modal/SettingsModalHeader';

interface SettingsModalProps extends SettingsTransferProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  currentThemeId: string;
  currentChatSettings?: ChatSettings;
  hasActiveSession?: boolean;
  availableModels: ModelOption[];
  onSave: (newSettings: AppSettings) => void;
  onSaveCurrentChatSettings?: (newSettings: ChatSettings) => void;
  onClearAllHistory: () => void;
  onClearCache: () => void;
  onOpenLogViewer: (state?: Pick<LogViewerProps, 'initialTab' | 'initialUsageTab'>) => void;
  setAvailableModels: (models: ModelOption[]) => void;
  onImportSettings?: (file: File) => void;
  onExportSettings?: () => void;
  onImportHistory?: (file: File) => void;
  onExportHistory?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentSettings,
  currentThemeId,
  currentChatSettings,
  hasActiveSession = false,
  availableModels,
  onSave,
  onSaveCurrentChatSettings,
  onClearAllHistory,
  onClearCache,
  onOpenLogViewer,
  onInstallPwa,
  installState,
  onImportScenarios,
  onExportScenarios,
  setAvailableModels,
}) => {
  const { t } = useI18n();
  const [liveSettings, setLiveSettings] = useState(currentSettings);
  const [liveCurrentChatSettings, setLiveCurrentChatSettings] = useState(currentChatSettings);
  const [settingsScope, setSettingsScope] = useState<SettingsScope>('defaults');

  const canEditCurrentChat = hasActiveSession && Boolean(liveCurrentChatSettings) && Boolean(onSaveCurrentChatSettings);
  const chatScopedTabs = useMemo(() => new Set<SettingsTab>(['models']), []);

  useEffect(() => {
    setLiveSettings(currentSettings);
  }, [currentSettings]);

  useEffect(() => {
    setLiveCurrentChatSettings(currentChatSettings);
  }, [currentChatSettings]);

  useEffect(() => {
    if (!canEditCurrentChat && settingsScope === 'currentChat') {
      setSettingsScope('defaults');
    }
  }, [canEditCurrentChat, settingsScope]);

  const effectiveScope = canEditCurrentChat ? settingsScope : 'defaults';

  const scopedSettings = useMemo(
    () =>
      buildSettingsForModal({
        appSettings: liveSettings,
        activeSessionId: canEditCurrentChat ? 'active' : null,
        currentChatSettings: liveCurrentChatSettings,
        scope: effectiveScope,
      }),
    [canEditCurrentChat, effectiveScope, liveCurrentChatSettings, liveSettings],
  );
  const settingsTransferActions = useSettingsTransferActions();

  const saveScopedSettings = useCallback(
    (nextSettings: AppSettings) => {
      const previousSettings = buildSettingsForModal({
        appSettings: liveSettings,
        activeSessionId: canEditCurrentChat ? 'active' : null,
        currentChatSettings: liveCurrentChatSettings,
        scope: effectiveScope,
      });
      const splitUpdate = splitScopedSettingsUpdate({
        scope: effectiveScope,
        previousSettings,
        nextSettings,
        appSettings: liveSettings,
        currentChatSettings: liveCurrentChatSettings,
      });

      if (splitUpdate.nextAppSettings) {
        setLiveSettings(splitUpdate.nextAppSettings);
        onSave(splitUpdate.nextAppSettings);
      }

      if (splitUpdate.nextChatSettings && onSaveCurrentChatSettings) {
        setLiveCurrentChatSettings(splitUpdate.nextChatSettings);
        onSaveCurrentChatSettings(splitUpdate.nextChatSettings);
      }
    },
    [canEditCurrentChat, effectiveScope, liveCurrentChatSettings, liveSettings, onSave, onSaveCurrentChatSettings],
  );

  const {
    activeTab,
    setActiveTab,
    confirmConfig,
    closeConfirm,
    scrollContainerRef,
    handleContentScroll,
    beginAnchorScroll,
    saveActiveScrollPosition,
    handleResetToDefaults,
    handleClearLogs,
    handleRequestClearHistory,
    handleRequestClearCache,
    handleRequestImportHistory,
    updateSetting,
    handleModelChange,
    tabs,
  } = useSettingsLogic({
    isOpen,
    currentSettings: scopedSettings,
    onSave: saveScopedSettings,
    onClearAllHistory,
    onClearCache,
    onImportHistory: settingsTransferActions.onImportHistory,
    t,
  });

  const {
    searchQuery,
    setSearchQuery,
    isSearching,
    searchResults,
    clampedSearchSelectedIndex,
    activeSearchOptionId,
    searchInputRef,
    activeTabRef,
    handleTabChange,
    handleSelectSearchResult,
    searchResultsId,
  } = useSettingsModalSearch({
    isOpen,
    activeTab,
    setActiveTab,
    scrollContainerRef,
    beginAnchorScroll,
    saveActiveScrollPosition,
    t,
  });

  const activeTabLabelKey = tabs.find((tab) => tab.id === activeTab)?.labelKey;
  const activeTabUsesScope = !isSearching && chatScopedTabs.has(activeTab);
  const visibleScope = activeTabUsesScope ? settingsScope : 'defaults';

  useEffect(() => {
    if (!activeTabUsesScope && settingsScope !== 'defaults') {
      setSettingsScope('defaults');
    }
  }, [activeTabUsesScope, settingsScope]);

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        noPadding
        enterAnimationClassName=""
        ariaLabel={t('settingsTitle')}
        contentClassName="w-full h-[100dvh] sm:h-[85vh] sm:max-h-[800px] sm:w-[90vw] max-w-6xl sm:rounded-xl overflow-hidden flex flex-col md:flex-row shadow-2xl bg-[var(--theme-bg-primary)] transition-all"
        initialFocusRef={searchInputRef}
      >
        <SettingsSidebar
          tabs={tabs}
          activeTab={activeTab}
          setActiveTab={handleTabChange}
          onClose={onClose}
          activeTabRef={activeTabRef}
          searchInputRef={searchInputRef}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          resultsCount={searchResults.length}
          searchExpanded={isSearching}
          searchResultsId={searchResultsId}
          searchActiveOptionId={activeSearchOptionId}
        />

        <main
          data-settings-main-container="true"
          className="flex-1 flex flex-col min-w-0 bg-[var(--theme-bg-primary)] relative overflow-hidden"
        >
          <div
            ref={scrollContainerRef}
            onScroll={handleContentScroll}
            className={`flex-1 ${activeTab === 'providers' && !isSearching ? 'overflow-hidden p-0 flex flex-col' : 'overflow-y-auto overflow-x-hidden custom-scrollbar px-4 py-4 sm:px-6 sm:py-6 md:px-8 md:pt-4 md:pb-8'}`}
          >
            <SettingsModalHeader
              activeTab={activeTab}
              activeTabLabelKey={activeTabLabelKey}
              isSearching={isSearching}
              searchResultsCount={searchResults.length}
              activeTabUsesScope={activeTabUsesScope}
              visibleScope={visibleScope}
              canEditCurrentChat={canEditCurrentChat}
              onScopeChange={setSettingsScope}
              onClose={onClose}
            />
            {isSearching ? (
              <div className="max-w-3xl mx-auto w-full">
                <SettingsSearchResults
                  results={searchResults}
                  onSelect={handleSelectSearchResult}
                  selectedIndex={clampedSearchSelectedIndex}
                  query={searchQuery}
                />
              </div>
            ) : (
              <SettingsContent
                activeTab={activeTab}
                currentSettings={scopedSettings}
                currentThemeId={currentThemeId}
                availableModels={availableModels}
                updateSetting={updateSetting}
                handleModelChange={handleModelChange}
                setAvailableModels={setAvailableModels}
                onClearHistory={handleRequestClearHistory}
                onClearCache={handleRequestClearCache}
                onOpenLogViewer={() => {
                  onOpenLogViewer();
                  onClose();
                }}
                onClearLogs={handleClearLogs}
                onReset={handleResetToDefaults}
                onInstallPwa={onInstallPwa}
                installState={installState}
                onImportSettings={settingsTransferActions.onImportSettings}
                onExportSettings={settingsTransferActions.onExportSettings}
                onImportHistory={handleRequestImportHistory}
                onExportHistory={settingsTransferActions.onExportHistory}
                onImportScenarios={onImportScenarios}
                onExportScenarios={onExportScenarios}
                onCloseModal={onClose}
                activeModelBadgeLabel={
                  activeTabUsesScope && visibleScope === 'defaults' ? t('settingsDefaultModelBadge') : undefined
                }
              />
            )}
          </div>
        </main>
      </Modal>

      {confirmConfig.isOpen && (
        <ConfirmationModal
          isOpen={confirmConfig.isOpen}
          onClose={closeConfirm}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDanger={confirmConfig.isDanger}
          confirmLabel={confirmConfig.confirmLabel}
          cancelLabel={t('cancel')}
        />
      )}
    </>
  );
};
