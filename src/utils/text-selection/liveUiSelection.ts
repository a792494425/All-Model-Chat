export const LIVE_UI_SELECTION_EVENT = 'amc-live-artifact-selection';
export const LIVE_UI_CLEAR_SELECTION_EVENT = 'amc-live-artifact-clear-selection';

export const LIVE_ARTIFACT_SELECTION_EVENT = LIVE_UI_SELECTION_EVENT;
export const LIVE_ARTIFACT_CLEAR_SELECTION_EVENT = LIVE_UI_CLEAR_SELECTION_EVENT;

export interface LiveUiSelectionRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
}

export type LiveArtifactSelectionRect = LiveUiSelectionRect;

export interface LiveUiSelectionDetail {
  text: string;
  copyText?: string;
  rect: LiveUiSelectionRect;
}

export type LiveArtifactSelectionDetail = LiveUiSelectionDetail;

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export const isLiveUiSelectionRect = (value: unknown): value is LiveUiSelectionRect => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const rect = value as Record<string, unknown>;
  return (
    isFiniteNumber(rect.top) &&
    isFiniteNumber(rect.left) &&
    isFiniteNumber(rect.width) &&
    isFiniteNumber(rect.height) &&
    isFiniteNumber(rect.bottom)
  );
};

export const isLiveArtifactSelectionRect = isLiveUiSelectionRect;

export const isLiveUiSelectionDetail = (value: unknown): value is LiveUiSelectionDetail => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const detail = value as Record<string, unknown>;
  return (
    typeof detail.text === 'string' &&
    detail.text.trim().length > 0 &&
    (detail.copyText === undefined || typeof detail.copyText === 'string') &&
    isLiveUiSelectionRect(detail.rect)
  );
};

export const isLiveArtifactSelectionDetail = isLiveUiSelectionDetail;

export const dispatchLiveUiSelection = (targetWindow: Window, detail: LiveUiSelectionDetail | null) => {
  targetWindow.dispatchEvent(
    new CustomEvent(LIVE_UI_SELECTION_EVENT, {
      detail,
    }),
  );
};

export const dispatchLiveArtifactSelection = dispatchLiveUiSelection;

export const dispatchLiveUiClearSelection = (targetWindow: Window) => {
  targetWindow.dispatchEvent(new CustomEvent(LIVE_UI_CLEAR_SELECTION_EVENT));
};

export const dispatchLiveArtifactClearSelection = dispatchLiveUiClearSelection;

export const createRelayedLiveUiSelectionDetail = (
  iframe: HTMLIFrameElement | null,
  payload: unknown,
  scale = 1,
): LiveUiSelectionDetail | null => {
  if (!iframe || !isLiveUiSelectionDetail(payload)) {
    return null;
  }

  const iframeRect = iframe.getBoundingClientRect();
  const effectiveScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

  return {
    text: payload.text,
    copyText: payload.copyText,
    rect: {
      top: iframeRect.top + payload.rect.top * effectiveScale,
      left: iframeRect.left + payload.rect.left * effectiveScale,
      width: payload.rect.width * effectiveScale,
      height: payload.rect.height * effectiveScale,
      bottom: iframeRect.top + payload.rect.bottom * effectiveScale,
    },
  };
};

export const createRelayedLiveArtifactSelectionDetail = createRelayedLiveUiSelectionDetail;
