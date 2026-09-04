import { type LibraryItem, type PersistedSessionFileRecord, type SavedChatSession } from '@/types';
import { getKeyValue, setKeyValue, getItem, getAll } from './indexedDbAccess';
import { FILES_STORE, SESSIONS_STORE } from './dbSchema';
import { extractLibraryItemsFromSessions } from '@/utils/library/libraryFiles';
import { logService } from '@/services/logService';

const STANDALONE_LIBRARY_STORAGE_KEY = 'amc_library_standalone_files_v1';

export const getStandaloneLibraryFiles = async (): Promise<LibraryItem[]> => {
  try {
    const items = await getKeyValue<LibraryItem[]>(STANDALONE_LIBRARY_STORAGE_KEY);
    return Array.isArray(items) ? items : [];
  } catch (error) {
    logService.error('Failed to get standalone library files from DB:', error);
    return [];
  }
};

export const saveStandaloneLibraryFiles = async (files: LibraryItem[]): Promise<void> => {
  try {
    await setKeyValue(STANDALONE_LIBRARY_STORAGE_KEY, files);
  } catch (error) {
    logService.error('Failed to save standalone library files to DB:', error);
  }
};

export const addStandaloneLibraryFiles = async (newFiles: LibraryItem[]): Promise<void> => {
  const current = await getStandaloneLibraryFiles();
  const existingIds = new Set(current.map((item) => item.id));
  const merged = [...newFiles.filter((item) => !existingIds.has(item.id)), ...current];
  await saveStandaloneLibraryFiles(merged);
};

export const deleteStandaloneLibraryFiles = async (ids: string[]): Promise<void> => {
  const current = await getStandaloneLibraryFiles();
  const idSet = new Set(ids);
  const remaining = current.filter((item) => !idSet.has(item.id));
  await saveStandaloneLibraryFiles(remaining);
};

export const renameStandaloneLibraryFile = async (id: string, newName: string): Promise<void> => {
  const current = await getStandaloneLibraryFiles();
  const updated = current.map((item) => (item.id === id ? { ...item, name: newName } : item));
  await saveStandaloneLibraryFiles(updated);
};

export const fetchLibraryFileBlob = async (item: LibraryItem): Promise<Blob | undefined> => {
  if (item.rawFile instanceof Blob) {
    return item.rawFile;
  }

  // If item is associated with a session, attempt to retrieve from FILES_STORE
  try {
    const record = await getItem<PersistedSessionFileRecord>(FILES_STORE, item.id);
    if (record && record.rawFile instanceof Blob) {
      return record.rawFile;
    }
  } catch (error) {
    logService.warn(`Failed to fetch file payload for ${item.id}:`, error);
  }

  return undefined;
};

export const getAllHistoricalSessionFiles = async (): Promise<LibraryItem[]> => {
  try {
    const sessions = await getAll<SavedChatSession>(SESSIONS_STORE);
    return extractLibraryItemsFromSessions(sessions);
  } catch (error) {
    logService.error('Failed to get historical session files from DB:', error);
    return [];
  }
};
