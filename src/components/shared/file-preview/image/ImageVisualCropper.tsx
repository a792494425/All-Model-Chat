import React, { useState, useRef, useCallback } from 'react';
import { Check, Copy, X, Sparkles } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';
import { copyTextToClipboard } from '@/utils/clipboard';

export interface ImageVisualCropperProps {
  fileName: string;
  imageDimensions: { width: number; height: number };
  rotation?: number;
  onConfirmSelection: (box2d: [number, number, number, number]) => void;
  onCancel: () => void;
}

interface DragRect {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/**
 * Visual Prompting Tool: Allows user to drag-select an area of an image,
 * view normalized coordinates, and insert an <image-locate> prompt directly into the chat composer.
 */
export const ImageVisualCropper: React.FC<ImageVisualCropperProps> = ({
  fileName,
  imageDimensions,
  rotation = 0,
  onConfirmSelection,
  onCancel,
}) => {
  const { t } = useI18n();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmedBox, setConfirmedBox] = useState<[number, number, number, number] | null>(null);
  const [copied, setCopied] = useState(false);

  const getRelativeCoords = useCallback(
    (clientX: number, clientY: number) => {
      const surfaceElement = surfaceRef.current;
      if (!surfaceElement) return { x: 0, y: 0 };
      const rect = surfaceElement.getBoundingClientRect();
      if (!rect || rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };

      // The unrotated dimensions of the element in local coordinates
      const unrotatedWidth =
        surfaceElement.offsetWidth > 0 ? surfaceElement.offsetWidth : (imageDimensions?.width ?? rect.width);
      const unrotatedHeight =
        surfaceElement.offsetHeight > 0 ? surfaceElement.offsetHeight : (imageDimensions?.height ?? rect.height);

      if (unrotatedWidth <= 0 || unrotatedHeight <= 0) return { x: 0, y: 0 };

      // Invariant center of rotation
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = clientX - centerX;
      const dy = clientY - centerY;

      // Rotate vector back by -rotation
      const normalizedRotation = ((rotation % 360) + 360) % 360;
      const rad = (-normalizedRotation * Math.PI) / 180;
      const localDx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const localDy = dx * Math.sin(rad) + dy * Math.cos(rad);

      // Map back to [0, unrotatedWidth] and [0, unrotatedHeight]
      const localX = Math.max(0, Math.min(unrotatedWidth, localDx + unrotatedWidth / 2));
      const localY = Math.max(0, Math.min(unrotatedHeight, localDy + unrotatedHeight / 2));

      return {
        x: (localX / unrotatedWidth) * 1000,
        y: (localY / unrotatedHeight) * 1000,
      };
    },
    [imageDimensions?.height, imageDimensions?.width, rotation],
  );

  const handleStart = (clientX: number, clientY: number, pointerId?: number, target?: HTMLElement) => {
    if (pointerId !== undefined && target?.setPointerCapture) {
      try {
        target.setPointerCapture(pointerId);
      } catch {
        // Safe fallback in test or unsupported env
      }
    }
    const coords = getRelativeCoords(clientX, clientY);
    setDragState({
      startX: coords.x,
      startY: coords.y,
      currentX: coords.x,
      currentY: coords.y,
    });
    setIsDragging(true);
    setConfirmedBox(null);
    setCopied(false);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || !dragState) return;
    const coords = getRelativeCoords(clientX, clientY);
    setDragState((prev) => (prev ? { ...prev, currentX: coords.x, currentY: coords.y } : null));
  };

  const handleEnd = (clientX: number, clientY: number, pointerId?: number, target?: HTMLElement) => {
    if (!isDragging || !dragState) return;
    if (pointerId !== undefined && target?.releasePointerCapture) {
      try {
        target.releasePointerCapture(pointerId);
      } catch {
        // Safe fallback
      }
    }
    setIsDragging(false);

    const coords = getRelativeCoords(clientX, clientY);
    const xmin = Math.round(Math.min(dragState.startX, coords.x));
    const xmax = Math.round(Math.max(dragState.startX, coords.x));
    const ymin = Math.round(Math.min(dragState.startY, coords.y));
    const ymax = Math.round(Math.max(dragState.startY, coords.y));

    // Threshold check (must be at least 15 units wide/high)
    if (xmax - xmin >= 15 && ymax - ymin >= 15) {
      setConfirmedBox([ymin, xmin, ymax, xmax]);
    } else {
      setDragState(null);
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.stopPropagation();
    handleStart(event.clientX, event.clientY, event.pointerId, event.currentTarget);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.stopPropagation();
    handleMove(event.clientX, event.clientY);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.stopPropagation();
    handleEnd(event.clientX, event.clientY, event.pointerId, event.currentTarget);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.stopPropagation();
    if (event.currentTarget?.releasePointerCapture) {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Safe fallback
      }
    }
    setIsDragging(false);
    setDragState(null);
  };

  // Fallback handlers for legacy mouse events / testing
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || event.button !== 0) return;
    event.stopPropagation();
    handleStart(event.clientX, event.clientY);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.stopPropagation();
    handleMove(event.clientX, event.clientY);
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.stopPropagation();
    handleEnd(event.clientX, event.clientY);
  };

  // Compute bounding box percentage for rendering in local coordinates
  let boxStyle: React.CSSProperties | null = null;
  if (dragState) {
    const xmin = Math.min(dragState.startX, dragState.currentX);
    const xmax = Math.max(dragState.startX, dragState.currentX);
    const ymin = Math.min(dragState.startY, dragState.currentY);
    const ymax = Math.max(dragState.startY, dragState.currentY);

    boxStyle = {
      left: `${xmin / 10}%`,
      top: `${ymin / 10}%`,
      width: `${Math.max(0.5, (xmax - xmin) / 10)}%`,
      height: `${Math.max(0.5, (ymax - ymin) / 10)}%`,
    };
  }

  const handleCopyTag = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!confirmedBox) return;
    const tag = `<image-locate file="${fileName}" box="[${confirmedBox.join(',')}]">${t('imageLocatePromptQuery')}</image-locate>`;
    void copyTextToClipboard(tag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsert = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirmedBox) {
      onConfirmSelection(confirmedBox);
    }
  };

  return (
    <div
      ref={surfaceRef}
      data-testid="visual-cropper-surface"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className="absolute inset-0 z-30 cursor-crosshair select-none touch-none bg-black/30 panzoom-exclude"
    >
      <div
        className="absolute top-4 left-1/2 z-40 pointer-events-auto flex items-center gap-2 panzoom-exclude"
        style={{
          transform: rotation ? `translate(-50%, 0) rotate(${-rotation}deg)` : 'translate(-50%, 0)',
        }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-red-500/40 text-zinc-100 text-xs shadow-2xl">
          <Sparkles size={13} className="text-amber-400 animate-pulse" />
          <span>{t('filePreviewVisualSelectHint')}</span>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onCancel();
          }}
          className="p-1 rounded-full bg-zinc-950/85 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/20 transition-all cursor-pointer shadow-lg"
          title={t('filePreviewVisualSelectExit')}
          aria-label={t('filePreviewVisualSelectExit')}
        >
          <X size={14} />
        </button>
      </div>

      {boxStyle && (
        <div
          data-testid="visual-crop-box"
          className="absolute border-2 border-red-500 bg-red-500/15 rounded shadow-[0_0_12px_rgba(239,68,68,0.5)] transition-none"
          style={boxStyle}
        >
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white" />
          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white" />
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white" />

          {confirmedBox && !isDragging && (
            <div
              className="absolute left-1/2 z-50 pointer-events-auto flex items-center gap-1.5 p-1 rounded-lg bg-zinc-900/95 backdrop-blur-xl border border-white/20 shadow-2xl whitespace-nowrap panzoom-exclude"
              style={{
                top: confirmedBox[0] > 120 ? '-48px' : 'calc(100% + 10px)',
                transform: rotation ? `translateX(-50%) rotate(${-rotation}deg)` : 'translateX(-50%)',
              }}
            >
              <button
                type="button"
                data-testid="visual-crop-insert-btn"
                onClick={handleInsert}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-semibold shadow transition-all cursor-pointer"
                title={t('filePreviewInsertQuestion')}
              >
                <Sparkles size={12} />
                <span>{t('filePreviewInsertQuestion')}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyTag}
                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 active:scale-95 text-zinc-200 text-xs transition-all cursor-pointer"
                title={t('filePreviewCopyLocateTag')}
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? t('copied') : t('filePreviewCopyLocateTag')}</span>
              </button>

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmedBox(null);
                  setDragState(null);
                }}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/15 transition-all cursor-pointer"
                title={t('filePreviewReselect')}
              >
                <X size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
