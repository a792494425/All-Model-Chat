import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  type FormEvent,
  type MouseEvent,
  type RefObject,
} from 'react';
import type { File as GeminiFile } from '@google/genai';
import { useI18n } from '@/contexts/I18nContext';
import { listFilesApi, deleteFileApi } from '@/services/api/fileApi';
import { getGeminiKeyForRequest } from '@/utils/api/apiKeySelection';
import { copyTextToClipboard } from '@/utils/clipboard';
import { logService } from '@/services/logService';
import type { AppSettings, ChatSettings } from '@/types';

export type CloudFileCategoryFilter = 'all' | 'video' | 'audio' | 'document' | 'image';

const MAX_PROJECT_QUOTA_BYTES = 20 * 1024 * 1024 * 1024; // 20 GB limit per project

export interface UseCloudFilesLogicParams {
  isOpen: boolean;
  onClose: () => void;
  onAddFiles?: (files: GeminiFile[]) => void;
  onAddFileById?: (fileId: string) => Promise<void>;
  appSettings: AppSettings;
  currentChatSettings: ChatSettings;
}

export interface UseCloudFilesLogicReturn {
  files: GeminiFile[];
  isLoading: boolean;
  isRefreshing: boolean;
  fetchError: string | null;
  showErrorDetails: boolean;
  setShowErrorDetails: React.Dispatch<React.SetStateAction<boolean>>;
  isNoKeyWarning: boolean;
  isPermissionOrProxyError: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: CloudFileCategoryFilter;
  setCategoryFilter: (category: CloudFileCategoryFilter) => void;
  selectedFileNames: Set<string>;
  toggleSelectFile: (name: string) => void;
  allFilteredSelected: boolean;
  handleSelectAllToggle: () => void;
  directInputId: string;
  setDirectInputId: (id: string) => void;
  isAddingDirect: boolean;
  directAddError: string | null;
  directAddSuccess: string | null;
  handleDirectAdd: (e?: FormEvent) => Promise<void>;
  copiedFileName: string | null;
  handleCopyId: (name: string, e?: MouseEvent) => void;
  fileToDelete: GeminiFile | null;
  setFileToDelete: (file: GeminiFile | null) => void;
  isBatchDeleteModalOpen: boolean;
  setIsBatchDeleteModalOpen: (open: boolean) => void;
  isDeleting: boolean;
  handleDeleteSingle: () => Promise<void>;
  handleBatchDelete: () => Promise<void>;
  handleConfirmInsert: () => void;
  handleRowDoubleClick: (file: GeminiFile) => void;
  loadFiles: (showRefreshIndicator?: boolean) => Promise<void>;
  totalBytesUsed: number;
  quotaPercent: number;
  filteredFiles: GeminiFile[];
  searchInputRef: RefObject<HTMLInputElement>;
}

export function useCloudFilesLogic({
  isOpen,
  onClose,
  onAddFiles,
  onAddFileById,
  appSettings,
  currentChatSettings,
}: UseCloudFilesLogicParams): UseCloudFilesLogicReturn {
  const { t } = useI18n();

  const [files, setFiles] = useState<GeminiFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const isNoKeyWarning = useMemo(() => {
    return fetchError === t('cloudFilesNoKeyWarning');
  }, [fetchError, t]);

  const isPermissionOrProxyError = useMemo(() => {
    if (!fetchError || isNoKeyWarning) return false;
    const lower = fetchError.toLowerCase();
    return (
      lower.includes('permission_denied') ||
      lower.includes('403') ||
      lower.includes('proxy browser error') ||
      lower.includes('the caller does not have permission')
    );
  }, [fetchError, isNoKeyWarning]);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CloudFileCategoryFilter>('all');
  const [selectedFileNames, setSelectedFileNames] = useState<Set<string>>(new Set());

  const [directInputId, setDirectInputId] = useState('');
  const [isAddingDirect, setIsAddingDirect] = useState(false);
  const [directAddError, setDirectAddError] = useState<string | null>(null);
  const [directAddSuccess, setDirectAddSuccess] = useState<string | null>(null);

  const [copiedFileName, setCopiedFileName] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<GeminiFile | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const apiKeyResult = useMemo(() => {
    return getGeminiKeyForRequest(appSettings, currentChatSettings, { skipIncrement: true });
  }, [appSettings, currentChatSettings]);

  const activeApiKey = useMemo(() => {
    return 'error' in apiKeyResult ? null : apiKeyResult.key;
  }, [apiKeyResult]);

  const loadFiles = useCallback(
    async (showRefreshIndicator = false) => {
      if (!activeApiKey) {
        setFetchError(t('cloudFilesNoKeyWarning'));
        setFiles([]);
        return;
      }

      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setFetchError(null);

      try {
        let allFiles: GeminiFile[] = [];
        let nextToken: string | undefined = undefined;

        do {
          const res = await listFilesApi(activeApiKey, 100, nextToken);
          allFiles = [...allFiles, ...res.files];
          nextToken = res.nextPageToken;
        } while (nextToken && allFiles.length < 500);

        setFiles(allFiles);
      } catch (fetchError) {
        const errorMsg = fetchError instanceof Error ? fetchError.message : String(fetchError);
        logService.error('Failed to fetch cloud files from Gemini Files API:', fetchError);
        setFetchError(errorMsg);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [activeApiKey, t],
  );

  useEffect(() => {
    if (isOpen) {
      void loadFiles(false);
      setSelectedFileNames(new Set());
      setSearchQuery('');
      setCategoryFilter('all');
      setDirectInputId('');
      setDirectAddError(null);
      setDirectAddSuccess(null);
      setShowErrorDetails(false);
    }
  }, [isOpen, loadFiles]);

  const totalBytesUsed = useMemo(() => {
    return files.reduce((sum, file) => sum + (Number(file.sizeBytes) || 0), 0);
  }, [files]);

  const quotaPercent = useMemo(() => {
    return Math.min(100, Math.round((totalBytesUsed / MAX_PROJECT_QUOTA_BYTES) * 1000) / 10);
  }, [totalBytesUsed]);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const mime = file.mimeType ?? '';
      let matchCategory = true;
      if (categoryFilter === 'video') matchCategory = mime.startsWith('video/');
      else if (categoryFilter === 'audio') matchCategory = mime.startsWith('audio/');
      else if (categoryFilter === 'image') matchCategory = mime.startsWith('image/');
      else if (categoryFilter === 'document') {
        matchCategory =
          mime.startsWith('text/') ||
          mime === 'application/pdf' ||
          mime.includes('officedocument') ||
          mime.includes('msword') ||
          mime.includes('json') ||
          mime.includes('csv');
      }

      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const displayName = (file.displayName ?? '').toLowerCase();
      const name = (file.name ?? '').toLowerCase();
      return displayName.includes(q) || name.includes(q);
    });
  }, [files, categoryFilter, searchQuery]);

  const toggleSelectFile = useCallback((name: string) => {
    setSelectedFileNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const allFilteredSelected = useMemo(() => {
    return filteredFiles.length > 0 && filteredFiles.every((f) => (f.name ? selectedFileNames.has(f.name) : false));
  }, [filteredFiles, selectedFileNames]);

  const handleSelectAllToggle = useCallback(() => {
    if (allFilteredSelected) {
      setSelectedFileNames(new Set());
    } else {
      const allNames = new Set(filteredFiles.map((f) => f.name).filter((n): n is string => Boolean(n)));
      setSelectedFileNames(allNames);
    }
  }, [allFilteredSelected, filteredFiles]);

  const handleCopyId = useCallback((name: string, e?: MouseEvent) => {
    e?.stopPropagation();
    void copyTextToClipboard(name);
    setCopiedFileName(name);
    setTimeout(() => {
      setCopiedFileName((cur) => (cur === name ? null : cur));
    }, 2000);
  }, []);

  const handleDirectAdd = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault();
      const trimmed = directInputId.trim();
      if (!trimmed || isAddingDirect) return;

      setIsAddingDirect(true);
      setDirectAddError(null);
      setDirectAddSuccess(null);

      try {
        if (onAddFileById) {
          await onAddFileById(trimmed);
        }
        if (trimmed.startsWith('gs://')) {
          setDirectAddSuccess(t('cloudFilesGcsSuccess'));
        }
        setDirectInputId('');
        await loadFiles(true);
      } catch (directAddError) {
        const msg = directAddError instanceof Error ? directAddError.message : String(directAddError);
        setDirectAddError(msg);
      } finally {
        setIsAddingDirect(false);
      }
    },
    [directInputId, isAddingDirect, loadFiles, onAddFileById, t],
  );

  const handleDeleteSingle = useCallback(async () => {
    if (!fileToDelete?.name || !activeApiKey) return;
    const targetName = fileToDelete.name;
    setIsDeleting(true);

    try {
      await deleteFileApi(activeApiKey, targetName);
      setFiles((prev) => prev.filter((f) => f.name !== targetName));
      setSelectedFileNames((prev) => {
        const next = new Set(prev);
        next.delete(targetName);
        return next;
      });
      setFileToDelete(null);
    } catch (deleteError) {
      logService.error('Failed to delete cloud file:', deleteError);
    } finally {
      setIsDeleting(false);
    }
  }, [activeApiKey, fileToDelete]);

  const handleBatchDelete = useCallback(async () => {
    if (!selectedFileNames.size || !activeApiKey) return;
    setIsDeleting(true);

    try {
      const toDelete = Array.from(selectedFileNames);
      for (const name of toDelete) {
        try {
          await deleteFileApi(activeApiKey, name);
        } catch (batchDeleteError) {
          logService.error(`Failed to delete file ${name} during batch deletion:`, batchDeleteError);
        }
      }
      setFiles((prev) => prev.filter((f) => !f.name || !selectedFileNames.has(f.name)));
      setSelectedFileNames(new Set());
      setIsBatchDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }, [activeApiKey, selectedFileNames]);

  const handleConfirmInsert = useCallback(() => {
    if (!selectedFileNames.size || !onAddFiles) return;
    const selectedList = files.filter((f) => f.name && selectedFileNames.has(f.name));
    onAddFiles(selectedList);
    onClose();
  }, [files, onAddFiles, onClose, selectedFileNames]);

  const handleRowDoubleClick = useCallback(
    (file: GeminiFile) => {
      if (onAddFiles) {
        onAddFiles([file]);
        onClose();
      }
    },
    [onAddFiles, onClose],
  );

  return {
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
  };
}
