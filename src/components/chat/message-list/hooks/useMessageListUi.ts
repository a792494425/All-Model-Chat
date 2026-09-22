import { useState, useMemo, useCallback } from 'react';
import { type UploadedFile, type ChatMessage, type VideoMetadata, type MediaResolution } from '@/types';
import { useFileModalState } from '@/hooks/ui/useFileModalState';
import { extractMessageImages } from '@/utils/file/messageImages';
import {
  createHtmlPreviewRequest,
  type HtmlPreviewOpenOptions,
  type HtmlPreviewRequest,
} from '@/utils/html-preview/previewPrivilege';

interface UseMessageListUiProps {
  messages: ChatMessage[];
  onUpdateMessageFile: (
    messageId: string,
    fileId: string,
    updates: { videoMetadata?: VideoMetadata; mediaResolution?: MediaResolution },
  ) => void;
}

export const useMessageListUi = ({ messages, onUpdateMessageFile }: UseMessageListUiProps) => {
  const [isHtmlPreviewModalOpen, setIsHtmlPreviewModalOpen] = useState(false);
  const [htmlPreview, setHtmlPreview] = useState<HtmlPreviewRequest | null>(null);

  const allFiles = useMemo(() => messages.flatMap((message) => message.files || []), [messages]);
  const {
    previewFile,
    closePreview,
    allImages,
    currentImageIndex,
    handlePrevImage,
    handleNextImage,
    configuringFile,
    setConfiguringFile,
    openPreview,
    openConfiguration,
  } = useFileModalState<{ file: UploadedFile; messageId: string }>(allFiles);

  const handleFileClick = useCallback(
    (file: UploadedFile, messageId?: string) => {
      const targetMessage = messageId
        ? messages.find((m) => m.id === messageId)
        : messages.find(
            (m) =>
              m.files?.some((f) => f.id === file.id || (Boolean(f.dataUrl) && f.dataUrl === file.dataUrl)) ||
              (Boolean(file.dataUrl) && m.content?.includes(file.dataUrl!)) ||
              (Boolean(file.id) && file.id.startsWith(`${m.id}-`)),
          );

      if (targetMessage) {
        const messageImages = extractMessageImages(targetMessage);
        if (messageImages.length > 0) {
          const matchedFile =
            messageImages.find((img) => img.id === file.id || (Boolean(img.dataUrl) && img.dataUrl === file.dataUrl)) ||
            file;
          openPreview(matchedFile, { galleryFiles: messageImages });
          return;
        }
      }

      openPreview(file);
    },
    [messages, openPreview],
  );

  const handleOpenHtmlPreview = useCallback((htmlContent: string, options?: HtmlPreviewOpenOptions) => {
    setHtmlPreview(createHtmlPreviewRequest(htmlContent, options));
    setIsHtmlPreviewModalOpen(true);
  }, []);

  const handleCloseHtmlPreview = useCallback(() => {
    setIsHtmlPreviewModalOpen(false);
    setHtmlPreview(null);
  }, []);

  const handleConfigureFile = useCallback(
    (file: UploadedFile, messageId: string) => {
      openConfiguration({ file, messageId });
    },
    [openConfiguration],
  );

  const handleSaveFileConfig = useCallback(
    (fileId: string, updates: { videoMetadata?: VideoMetadata; mediaResolution?: MediaResolution }) => {
      if (configuringFile) {
        onUpdateMessageFile(configuringFile.messageId, fileId, updates);
      }
    },
    [configuringFile, onUpdateMessageFile],
  );

  return {
    previewFile,
    isHtmlPreviewModalOpen,
    htmlPreview,
    configuringFile,
    setConfiguringFile,
    handleFileClick,
    closeFilePreviewModal: closePreview,
    allImages,
    currentImageIndex,
    handlePrevImage,
    handleNextImage,
    handleOpenHtmlPreview,
    handleCloseHtmlPreview,
    handleConfigureFile,
    handleSaveFileConfig,
  };
};
