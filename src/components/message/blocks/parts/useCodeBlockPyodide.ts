import { useState, useEffect, useMemo, useCallback } from 'react';
import type { UploadedFile } from '@/types';
import { usePyodide } from '@/features/local-python/usePyodide';
import { extractTextFromNode } from '@/utils/format/reactNodeText';
import { isImageMimeType } from '@/utils/file/fileTypeClassification';
import { createManagedObjectUrl, releaseManagedObjectUrl } from '@/services/objectUrlManager';
import { useChatStore } from '@/stores/chatStore';
import { collectLocalPythonInputFiles } from '@/features/local-python/executionFiles';

export type GeneratedFileEntry = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadState: 'active';
};

interface UseCodeBlockPyodideOptions {
  finalLanguage: string;
  codeElement?: React.ReactElement | null;
  children: React.ReactNode;
  cacheKey?: string;
  messageId?: string;
  files?: UploadedFile[];
  disableRun?: boolean;
}

export const useCodeBlockPyodide = ({
  finalLanguage,
  codeElement,
  children,
  cacheKey,
  messageId,
  files: inputFiles,
  disableRun,
}: UseCodeBlockPyodideOptions) => {
  const isPython = finalLanguage.toLowerCase() === 'python' || finalLanguage.toLowerCase() === 'py';

  const rawCode = useMemo(() => {
    if (!isPython) return '';
    if (codeElement) {
      return extractTextFromNode(codeElement.props.children);
    }
    return extractTextFromNode(children);
  }, [codeElement, children, isPython]);

  const { isRunning, output, image, files, error, hasRun, runCode, clearOutput, resetState } = usePyodide(cacheKey);

  const handleRun = useCallback(() => {
    if (!rawCode) return;

    let executionFiles: UploadedFile[] = [];
    if (messageId) {
      const state = useChatStore.getState();
      const currentSession = state.savedSessions.find((session) => session.id === state.activeSessionId);
      if (currentSession?.messages) {
        executionFiles = collectLocalPythonInputFiles(currentSession.messages, messageId);
      }
    }
    if (executionFiles.length === 0 && inputFiles?.length) {
      executionFiles = inputFiles.filter(
        (uploadedFile) =>
          uploadedFile.rawFile &&
          (uploadedFile.uploadState === undefined || uploadedFile.uploadState === 'active') &&
          !uploadedFile.error,
      );
    }

    runCode(rawCode, { files: executionFiles });
  }, [rawCode, messageId, inputFiles, runCode]);

  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFileEntry[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const nextEntries = files.map((file, fileIndex) => {
      const blob = new Blob([file.data], { type: file.type });
      return {
        id: `generated-file-${fileIndex}`,
        name: file.name,
        type: file.type,
        size: file.data.byteLength,
        dataUrl: createManagedObjectUrl(blob),
        uploadState: 'active' as const,
      };
    });

    setGeneratedFiles(nextEntries);
    return () => {
      for (const entry of nextEntries) {
        releaseManagedObjectUrl(entry.dataUrl);
      }
    };
  }, [files]);

  useEffect(() => {
    const url = image ? createManagedObjectUrl(new Blob([image], { type: 'image/png' })) : null;

    setImageUrl(url);
    return () => {
      if (url) {
        releaseManagedObjectUrl(url);
      }
    };
  }, [image]);

  const generatedImageFile = generatedFiles.find((file) => isImageMimeType(file.type));
  const displayInlineImage = imageUrl || (generatedImageFile ? generatedImageFile.dataUrl : null);
  const canRun = isPython && !disableRun;

  return {
    isPython,
    canRun,
    isRunning,
    hasRun,
    output,
    error,
    generatedFiles,
    displayInlineImage,
    handleRun,
    clearOutput,
    resetState,
  };
};
