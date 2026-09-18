import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { dbService } from '@/services/db/dbService';
import { autoIndexingQueue } from '@/services/embedding/autoIndexingQueue';
import { logService } from '@/services/logService';
import { useChatStore } from '@/stores/chatStore';
import { extractLibraryItemsFromSessions, resolveLibraryItemToUploadedFile } from '@/utils/library/libraryFiles';
import { cleanupFilePreviewUrl } from '@/utils/file/filePreviewUrls';
import { isMarkdownFile, isTextFile } from '@/utils/file/fileTypeClassification';
import type { LibraryItem, UploadedFile } from '@/types';

export interface UseLibraryPickerFilesOptions {
  isOpen: boolean;
  onAutoSelectUploaded?: (newIds: string[]) => void;
}

export const useLibraryPickerFiles = ({ isOpen, onAutoSelectUploaded }: UseLibraryPickerFilesOptions) => {
  const savedSessions = useChatStore((state) => state.savedSessions);

  const [standaloneFiles, setStandaloneFiles] = useState<LibraryItem[]>([]);
  const [historicalFiles, setHistoricalFiles] = useState<LibraryItem[]>([]);
  const [deletedFileIds, setDeletedFileIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [previewFile, setPreviewFile] = useState<UploadedFile | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewOriginalDataUrlRef = useRef<string | null>(null);

  // Load files when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const loadFiles = async () => {
      setIsLoading(true);
      try {
        const [standalone, historical, deleted] = await Promise.all([
          dbService.getStandaloneLibraryFiles(),
          dbService.getAllHistoricalSessionFiles(),
          dbService.getDeletedLibraryFileIds(),
        ]);
        if (active) {
          setStandaloneFiles(standalone);
          setHistoricalFiles(historical);
          setDeletedFileIds(new Set(deleted));
        }
      } catch (loadError) {
        logService.error('Failed to load library files for picker', loadError);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadFiles();

    return () => {
      active = false;
    };
  }, [isOpen]);

  // Upload handlers
  const handleUploadFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setIsUploading(true);
      try {
        const newItems: LibraryItem[] = await Promise.all(
          files.map(async (file) => {
            const id = `lib-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            let textContent: string | undefined;

            const isText =
              file.type.startsWith('text/') ||
              isTextFile({ name: file.name, type: file.type }) ||
              isMarkdownFile({ name: file.name, type: file.type });

            if (isText && file.size <= 5 * 1024 * 1024) {
              try {
                textContent = await file.text();
              } catch {
                // ignore
              }
            }

            return {
              id,
              name: file.name,
              type: file.type || 'application/octet-stream',
              size: file.size,
              timestamp: Date.now(),
              rawFile: file,
              textContent,
              source: 'uploaded' as const,
              isStandalone: true,
            };
          }),
        );

        await dbService.addStandaloneLibraryFiles(newItems);
        autoIndexingQueue.enqueueItems(newItems);
        const updated = await dbService.getStandaloneLibraryFiles();
        setStandaloneFiles(updated);

        onAutoSelectUploaded?.(newItems.map((i) => i.id));
      } catch (uploadError) {
        logService.error('Failed to upload files to library in picker', uploadError);
      } finally {
        setIsUploading(false);
      }
    },
    [onAutoSelectUploaded],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        void handleUploadFiles(files);
        e.target.value = '';
      }
    },
    [handleUploadFiles],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes('Files')) return;
      e.preventDefault();
      setIsDraggingOver(false);

      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        await handleUploadFiles(droppedFiles);
      }
    },
    [handleUploadFiles],
  );

  // Preview handlers
  const handlePreviewItem = useCallback(async (item: LibraryItem) => {
    try {
      previewOriginalDataUrlRef.current = item.dataUrl ?? null;
      const file = await resolveLibraryItemToUploadedFile(item, (i) => dbService.fetchLibraryFileBlob(i));
      setPreviewFile(file);
    } catch (previewError) {
      logService.error('Failed to resolve file for preview', previewError);
    }
  }, []);

  const handleClosePreview = useCallback(() => {
    if (previewFile?.dataUrl) {
      if (previewFile.dataUrl !== previewOriginalDataUrlRef.current) {
        cleanupFilePreviewUrl(previewFile);
      }
    }
    previewOriginalDataUrlRef.current = null;
    setPreviewFile(null);
  }, [previewFile]);

  // Merge items, excluding deleted items
  const allItems = useMemo(() => {
    const map = new Map<string, LibraryItem>();

    standaloneFiles.forEach((file) => {
      if (!deletedFileIds.has(file.id)) {
        map.set(file.id, file);
      }
    });

    historicalFiles.forEach((file) => {
      if (!deletedFileIds.has(file.id) && !map.has(file.id)) {
        map.set(file.id, file);
      }
    });

    const inMemorySessionFiles = extractLibraryItemsFromSessions(savedSessions);
    inMemorySessionFiles.forEach((file) => {
      if (!deletedFileIds.has(file.id)) {
        map.set(file.id, file);
      }
    });

    return Array.from(map.values());
  }, [standaloneFiles, historicalFiles, savedSessions, deletedFileIds]);

  return {
    allItems,
    isLoading,
    isUploading,
    isDraggingOver,
    previewFile,
    fileInputRef,
    previewOriginalDataUrlRef,
    handleUploadFiles,
    handleFileInputChange,
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePreviewItem,
    handleClosePreview,
  };
};
