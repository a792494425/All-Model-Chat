import { useChatStore } from '@/stores/chatStore';
import { useMediaNavStore } from '@/stores/mediaNavStore';
import { collectSessionMediaFiles, isImageFile } from './sessionMediaFiles';
import { parseLocateMarkers } from './locateMarker';
import { applyMediaNavKindToSettings } from './mediaNavSettings';

const resolveNamedFile = (files: { id: string; name: string }[], locateName?: string, activeFileId?: string | null) => {
  if (locateName) {
    return (
      files.find((file) => file.name === locateName) ??
      files.find((file) => file.name.toLowerCase().includes(locateName.toLowerCase())) ??
      files[0]
    );
  }
  if (activeFileId) {
    const current = files.find((file) => file.id === activeFileId);
    if (current) return current;
  }
  return files[0];
};

export interface SeekSessionImageParams {
  fileName?: string;
  box2d?: [number, number, number, number];
  point?: [number, number];
  arrow?: string;
  label?: string;
  snippet?: string;
  messageId?: string;
}

let focusTokenCounter = 0;

/**
 * Open the media navigation panel anchored to image view, switch to target image,
 * and activate visual grounding highlight (BBox / arrow) with automatic viewport focus.
 */
export const seekSessionImage = (params: SeekSessionImageParams): boolean => {
  const { selectedFiles, activeMessages } = useChatStore.getState();
  const { images } = collectSessionMediaFiles(selectedFiles, activeMessages);
  if (images.length === 0) return false;

  let { fileName, box2d, point, arrow, label, snippet } = params;

  if (params.messageId && (!fileName || (!box2d && !point))) {
    const msg = activeMessages.find((m) => m.id === params.messageId);
    if (msg) {
      if (!fileName && msg.files) {
        const msgImg = msg.files.find(isImageFile);
        if (msgImg) fileName = msgImg.name;
      }
      if (!box2d && !point && msg.content) {
        const { imageLocates } = parseLocateMarkers(msg.content);
        if (imageLocates.length > 0) {
          const matched =
            imageLocates.find((loc) => (label && loc.label === label) || (snippet && loc.snippet === snippet)) ??
            imageLocates[0];
          if (matched) {
            fileName = fileName || matched.imageName;
            box2d = box2d || matched.box2d;
            point = point || matched.point;
            arrow = arrow || matched.arrow;
            label = label || matched.label;
            snippet = snippet || matched.snippet;
          }
        }
      }
    }
  }

  const store = useMediaNavStore.getState();
  const target = resolveNamedFile(images, fileName, store.activeFileId);
  if (!target) return false;

  store.openAs('image');
  store.setActiveFile(target.id);
  store.setImageHighlight({
    messageId: params.messageId,
    imageName: target.name,
    box2d,
    point,
    arrow,
    label,
    snippet,
    focusToken: ++focusTokenCounter,
  });

  const chatStore = useChatStore.getState();
  if (typeof chatStore.setCurrentChatSettings === 'function') {
    chatStore.setCurrentChatSettings((prev) => applyMediaNavKindToSettings(prev, 'image'));
  }

  return true;
};
