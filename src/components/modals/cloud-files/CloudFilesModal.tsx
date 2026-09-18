import React from 'react';
import type { File as GeminiFile } from '@google/genai';
import { Cloud, Loader2 } from 'lucide-react';
import { Modal } from '@/components/shared/Modal';
import { ConfirmationModal } from '@/components/modals/ConfirmationModal';
import { useI18n } from '@/contexts/I18nContext';
import { interpolate } from '@/i18n/interpolate';
import type { AppSettings, ChatSettings } from '@/types';
import { useCloudFilesLogic, type CloudFileCategoryFilter } from './useCloudFilesLogic';
import { CloudFilesHeader } from './CloudFilesHeader';
import { CloudFilesDirectInput } from './CloudFilesDirectInput';
import { CloudFilesToolbar } from './CloudFilesToolbar';
import { CloudFilesTable } from './CloudFilesTable';
import { CloudFilesErrorState } from './CloudFilesErrorState';
import { CloudFilesFooter } from './CloudFilesFooter';

export type { CloudFileCategoryFilter };

export interface CloudFilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddFiles?: (files: GeminiFile[]) => void;
  onAddFileById?: (fileId: string) => Promise<void>;
  appSettings: AppSettings;
  currentChatSettings: ChatSettings;
}

export const CloudFilesModal: React.FC<CloudFilesModalProps> = (props) => {
  const { isOpen, onClose } = props;
  const { t } = useI18n();

  const {
    files,
    isLoading,
    isRefreshing,
    fetchError,
    showErrorDetails,
    setShowErrorDetails,
    isNoKeyWarning,
    isPermissionOrProxyError,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    selectedFileNames,
    toggleSelectFile,
    allFilteredSelected,
    handleSelectAllToggle,
    directInputId,
    setDirectInputId,
    isAddingDirect,
    directAddError,
    directAddSuccess,
    handleDirectAdd,
    copiedFileName,
    handleCopyId,
    fileToDelete,
    setFileToDelete,
    isBatchDeleteModalOpen,
    setIsBatchDeleteModalOpen,
    isDeleting,
    handleDeleteSingle,
    handleBatchDelete,
    handleConfirmInsert,
    handleRowDoubleClick,
    loadFiles,
    totalBytesUsed,
    quotaPercent,
    filteredFiles,
    searchInputRef,
  } = useCloudFilesLogic(props);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        contentClassName="w-full max-w-3xl sm:max-w-4xl h-[85vh] max-h-[760px] bg-[var(--theme-bg-primary)] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[var(--theme-border-primary)]"
        noPadding
        ariaLabel={t('cloudFilesModalTitle')}
      >
        <CloudFilesHeader
          isLoading={isLoading}
          isRefreshing={isRefreshing}
          onRefresh={() => void loadFiles(true)}
          onClose={onClose}
          totalBytesUsed={totalBytesUsed}
          quotaPercent={quotaPercent}
          totalFileCount={files.length}
        />

        <CloudFilesDirectInput
          directInputId={directInputId}
          setDirectInputId={setDirectInputId}
          isAddingDirect={isAddingDirect}
          directAddError={directAddError}
          directAddSuccess={directAddSuccess}
          onSubmit={handleDirectAdd}
        />

        <CloudFilesToolbar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          categoryFilter={categoryFilter}
          setCategoryFilter={setCategoryFilter}
          searchInputRef={searchInputRef}
        />

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-5">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-[var(--theme-text-tertiary)] gap-3">
              <Loader2 size={32} className="animate-spin text-blue-500" />
              <p className="text-sm font-medium">{t('cloudFilesRefreshing')}</p>
            </div>
          ) : fetchError ? (
            <CloudFilesErrorState
              fetchError={fetchError}
              isNoKeyWarning={isNoKeyWarning}
              isPermissionOrProxyError={isPermissionOrProxyError}
              isRefreshing={isRefreshing}
              showErrorDetails={showErrorDetails}
              setShowErrorDetails={setShowErrorDetails}
              onRetry={() => void loadFiles(true)}
              onCopyId={handleCopyId}
              copiedFileName={copiedFileName}
            />
          ) : filteredFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-20 text-[var(--theme-text-tertiary)] gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[var(--theme-bg-tertiary)] flex items-center justify-center text-[var(--theme-text-secondary)]">
                <Cloud size={24} />
              </div>
              <p className="text-sm font-medium text-[var(--theme-text-primary)]">{t('cloudFilesEmpty')}</p>
            </div>
          ) : (
            <CloudFilesTable
              files={filteredFiles}
              selectedFileNames={selectedFileNames}
              allFilteredSelected={allFilteredSelected}
              onSelectAllToggle={handleSelectAllToggle}
              onToggleSelectFile={toggleSelectFile}
              onRowDoubleClick={handleRowDoubleClick}
              onCopyId={handleCopyId}
              copiedFileName={copiedFileName}
              onSetFileToDelete={setFileToDelete}
            />
          )}
        </div>

        <CloudFilesFooter
          selectedCount={selectedFileNames.size}
          onOpenBatchDeleteModal={() => setIsBatchDeleteModalOpen(true)}
          onClose={onClose}
          onConfirmInsert={handleConfirmInsert}
        />
      </Modal>

      {fileToDelete && (
        <ConfirmationModal
          isOpen={!!fileToDelete}
          onClose={() => setFileToDelete(null)}
          onConfirm={() => void handleDeleteSingle()}
          title={t('cloudFilesDelete')}
          message={t('cloudFilesDeleteConfirm')}
          confirmLabel={isDeleting ? t('cloudFilesRefreshing') : t('delete')}
          isDanger
        />
      )}

      {isBatchDeleteModalOpen && (
        <ConfirmationModal
          isOpen={isBatchDeleteModalOpen}
          onClose={() => setIsBatchDeleteModalOpen(false)}
          onConfirm={() => void handleBatchDelete()}
          title={t('cloudFilesDelete')}
          message={interpolate(t('cloudFilesDeleteBatchConfirm'), {
            count: selectedFileNames.size.toString(),
          })}
          confirmLabel={isDeleting ? t('cloudFilesRefreshing') : t('delete')}
          isDanger
        />
      )}
    </>
  );
};
