import React from 'react';
import { Modal } from '@/components/shared/Modal';
import { useI18n } from '@/contexts/I18nContext';
import { useMultimodalSearchLogic } from './useMultimodalSearchLogic';
import { MultimodalSearchHeader } from './MultimodalSearchHeader';
import { MultimodalSearchInputBar } from './MultimodalSearchInputBar';
import { MultimodalSearchResultsView } from './MultimodalSearchResultsView';
import { MultimodalSearchActionBar } from './MultimodalSearchActionBar';

export const MultimodalSearchModal: React.FC = () => {
  const { t } = useI18n();
  const logic = useMultimodalSearchLogic();

  if (!logic.isOpen) return null;

  return (
    <Modal
      isOpen={logic.isOpen}
      onClose={logic.closeModal}
      contentClassName="w-[94vw] max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] shadow-2xl overflow-hidden p-0"
      ariaLabel={t('multimodalSearchTitle')}
    >
      <MultimodalSearchHeader
        isAutoIndexEnabled={logic.isAutoIndexEnabled}
        setIsAutoIndexEnabled={logic.setIsAutoIndexEnabled}
        isIndexing={logic.isIndexing}
        indexedCount={logic.indexedCount}
        onTriggerIndexing={logic.triggerIndexing}
        onClose={logic.closeModal}
      />

      <MultimodalSearchInputBar
        searchInputRef={logic.searchInputRef}
        fileInputRef={logic.fileInputRef}
        searchQuery={logic.searchQuery}
        setSearchQuery={logic.setSearchQuery}
        searchImagePreviewUrl={logic.searchImagePreviewUrl}
        clearSearchImage={logic.clearSearchImage}
        categoryFilter={logic.categoryFilter}
        setCategoryFilter={logic.setCategoryFilter}
        isSearching={logic.isSearching}
        isDragOver={logic.isDragOver}
        handleKeyDown={logic.handleKeyDown}
        handleImageSelect={logic.handleImageSelect}
        handleDragOver={logic.handleDragOver}
        handleDragLeave={logic.handleDragLeave}
        handleDrop={logic.handleDrop}
        executeSearch={logic.executeSearch}
      />

      <MultimodalSearchResultsView
        isIndexing={logic.isIndexing}
        indexProgress={logic.indexProgress}
        indexedCount={logic.indexedCount}
        searchError={logic.searchError}
        isSearching={logic.isSearching}
        results={logic.results}
        selectedResultIds={logic.selectedResultIds}
        isInserting={logic.isInserting}
        searchQuery={logic.searchQuery}
        searchImagePreviewUrl={logic.searchImagePreviewUrl}
        onToggleSelect={logic.handleToggleSelect}
        onInsertSingleItem={logic.handleInsertSingleItem}
        onDownloadItem={logic.handleDownloadItem}
        onJumpToSession={logic.handleJumpToSession}
        onTriggerIndexing={logic.triggerIndexing}
      />

      <MultimodalSearchActionBar
        selectedCount={logic.selectedResultIds.size}
        totalResultsCount={logic.results.length}
        isInserting={logic.isInserting}
        onSelectAllToggle={logic.handleSelectAllToggle}
        onClearSelection={() => logic.setSelectedResultIds(new Set())}
        onBatchInsert={logic.handleBatchInsert}
      />
    </Modal>
  );
};
