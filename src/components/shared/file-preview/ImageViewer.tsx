import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Camera, Crosshair, Grid2x2 } from 'lucide-react';
import Panzoom, { type PanzoomObject } from '@panzoom/panzoom';
import { type UploadedFile } from '@/types';
import { FloatingToolbar, ToolbarButton, ToolbarDivider } from './FloatingToolbar';
import { useI18n } from '@/contexts/I18nContext';
import { ImageHighlightOverlay } from '@/components/media-nav/ImageHighlightOverlay';
import { useMediaNavStore, type ImageNavHighlight } from '@/stores/mediaNavStore';

import { useChatStore } from '@/stores/chatStore';
import { exportAnnotatedImage } from '@/utils/media-nav/exportAnnotatedImage';
import { ImageMinimap } from './image/ImageMinimap';
import { ImageVisualCropper } from './image/ImageVisualCropper';

export type ImageBgMode = 'default' | 'grid' | 'white' | 'black';

interface ImageViewerProps {
  file: UploadedFile;
  highlight?: ImageNavHighlight | null;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 10;
const BUTTON_ZOOM_FACTOR = 1.3;

const ImageViewerContent: React.FC<ImageViewerProps> = ({ file, highlight }) => {
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [bgMode, setBgMode] = useState<ImageBgMode>('default');
  const [isVisualCropActive, setIsVisualCropActive] = useState(false);
  const [dimensions, setDimensions] = useState({
    imgW: 0,
    imgH: 0,
    vpW: 0,
    vpH: 0,
  });

  const storeHighlights = useMediaNavStore((state) => state.imageHighlights);
  const storeHighlight = useMediaNavStore((state) => state.imageHighlight);
  const rawHighlight = highlight || storeHighlight;

  const isHighlightForFile = useCallback(
    (hl?: ImageNavHighlight | null) => {
      if (!hl || !hl.imageName) return true;
      const hlName = hl.imageName.toLowerCase();
      const fileName = file.name.toLowerCase();
      return hlName === fileName || fileName.includes(hlName) || hlName.includes(fileName);
    },
    [file.name],
  );

  const currentHighlight = isHighlightForFile(rawHighlight) ? rawHighlight : null;
  const effectiveHighlights = useMemo(
    () => storeHighlights.filter(isHighlightForFile),
    [storeHighlights, isHighlightForFile],
  );

  const viewportRef = useRef<HTMLDivElement>(null);
  const panzoomElementRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<PanzoomObject | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Initialize Panzoom
  useEffect(() => {
    const panzoomElement = panzoomElementRef.current;
    if (!panzoomElement) return;

    const panzoomInstance = Panzoom(panzoomElement, {
      minScale: MIN_SCALE,
      maxScale: MAX_SCALE,
      canvas: true,
      cursor: 'grab',
      animate: false,
    });
    panzoomRef.current = panzoomInstance;

    const handlePanzoomChange = (event: Event) => {
      const detail = (event as CustomEvent<{ scale: number; x: number; y: number }>).detail;
      if (!detail) return;
      if (typeof detail.scale === 'number') setScale(detail.scale);
      if (typeof detail.x === 'number' && typeof detail.y === 'number') {
        setPan({ x: detail.x, y: detail.y });
      }
    };

    panzoomElement.addEventListener('panzoomchange', handlePanzoomChange);

    return () => {
      panzoomElement.removeEventListener('panzoomchange', handlePanzoomChange);
      panzoomInstance.destroy();
      panzoomRef.current = null;
    };
  }, []);

  // Smooth continuous exponential wheel zooming
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      const pz = panzoomRef.current;
      if (!pz) return;

      event.preventDefault();
      event.stopPropagation();

      let delta = event.deltaY;
      if (delta === 0 && event.deltaX) {
        delta = event.deltaX;
      }
      if (event.deltaMode === 1) {
        delta *= 20;
      } else if (event.deltaMode === 2) {
        delta *= 100;
      }

      const isPinch = event.ctrlKey;
      const zoomFactor = isPinch ? 0.012 : 0.0018;
      const currentScale = pz.getScale();
      const targetScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale * Math.exp(-delta * zoomFactor)));

      if (targetScale !== currentScale) {
        pz.zoomToPoint(targetScale, event, { animate: false });
      }
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', onWheel);
    };
  }, []);

  const handleZoomIn = useCallback(() => {
    const pz = panzoomRef.current;
    if (!pz) return;
    const current = pz.getScale();
    const next = Math.min(MAX_SCALE, current * BUTTON_ZOOM_FACTOR);
    pz.zoom(next, { animate: true });
    setScale(next);
  }, []);

  const handleZoomOut = useCallback(() => {
    const pz = panzoomRef.current;
    if (!pz) return;
    const current = pz.getScale();
    const next = Math.max(MIN_SCALE, current / BUTTON_ZOOM_FACTOR);
    pz.zoom(next, { animate: true });
    setScale(next);
  }, []);

  const handleRotateLeft = useCallback(() => {
    setRotation((prevRotation) => (prevRotation - 90 + 360) % 360);
  }, []);

  const handleRotateRight = useCallback(() => {
    setRotation((prevRotation) => (prevRotation + 90) % 360);
  }, []);

  const handleReset = useCallback(() => {
    setRotation(0);
    setScale(1);
    panzoomRef.current?.reset({ animate: true });
  }, []);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    const pz = panzoomRef.current;
    if (!pz) return;
    const current = pz.getScale();
    if (Math.abs(current - 1) < 0.1) {
      pz.zoomToPoint(1.8, event.nativeEvent, { animate: true });
    } else {
      pz.reset({ animate: true });
      setRotation(0);
      setScale(1);
    }
  }, []);

  const calculateActualScale = useCallback(() => {
    const img = imageRef.current;
    if (!img || img.offsetWidth <= 0 || img.naturalWidth <= 0) return 1;
    const target = img.naturalWidth / img.offsetWidth;
    return Math.min(MAX_SCALE, Math.max(MIN_SCALE, target));
  }, []);

  const isActualSize = useMemo(() => {
    const actualScale = calculateActualScale();
    return Math.abs(scale - actualScale) < 0.05;
  }, [calculateActualScale, scale]);

  const handleToggleActualSize = useCallback(() => {
    const pz = panzoomRef.current;
    if (!pz) return;
    const actualScale = calculateActualScale();
    if (Math.abs(pz.getScale() - actualScale) < 0.05) {
      pz.reset({ animate: true });
      setScale(1);
      setRotation(0);
    } else {
      pz.zoom(actualScale, { animate: true });
      pz.pan(0, 0, { animate: true });
      setScale(actualScale);
    }
  }, [calculateActualScale]);

  const handleCycleBackground = useCallback(() => {
    setBgMode((prev) => {
      if (prev === 'default') return 'grid';
      if (prev === 'grid') return 'white';
      if (prev === 'white') return 'black';
      return 'default';
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl?.getAttribute('contenteditable') === 'true'
      ) {
        return;
      }
      if (e.key === '1') {
        e.preventDefault();
        handleToggleActualSize();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleActualSize]);

  const focusHighlight = useCallback(() => {
    if (!currentHighlight || !imageRef.current || !panzoomRef.current || !viewportRef.current) return;
    const { box2d, point } = currentHighlight;
    if (!box2d && !point) return;

    const img = imageRef.current;
    const vp = viewportRef.current;
    const imgWidth = img.offsetWidth;
    const imgHeight = img.offsetHeight;
    const vpWidth = vp.clientWidth;
    const vpHeight = vp.clientHeight;

    if (imgWidth <= 0 || imgHeight <= 0 || vpWidth <= 0 || vpHeight <= 0) return;

    let targetCenterX = 0;
    let targetCenterY = 0;
    let targetScale = 1.8;

    if (box2d && box2d.length === 4) {
      const [ymin, xmin, ymax, xmax] = box2d;
      const actualYmin = Math.min(ymin, ymax);
      const actualYmax = Math.max(ymin, ymax);
      const actualXmin = Math.min(xmin, xmax);
      const actualXmax = Math.max(xmin, xmax);

      targetCenterX = ((actualXmin + actualXmax) / 2000) * imgWidth;
      targetCenterY = ((actualYmin + actualYmax) / 2000) * imgHeight;

      const boxW = Math.max(1, ((actualXmax - actualXmin) / 1000) * imgWidth);
      const boxH = Math.max(1, ((actualYmax - actualYmin) / 1000) * imgHeight);

      const isQuarterTurn = rotation % 180 !== 0;
      const visualBoxW = isQuarterTurn ? boxH : boxW;
      const visualBoxH = isQuarterTurn ? boxW : boxH;

      const fitScale = Math.min((vpWidth * 0.45) / visualBoxW, (vpHeight * 0.45) / visualBoxH);
      targetScale = Math.min(3.5, Math.max(1.3, fitScale));
    } else if (point && point.length === 2) {
      const [pointY, pointX] = point;
      targetCenterX = (pointX / 1000) * imgWidth;
      targetCenterY = (pointY / 1000) * imgHeight;
      targetScale = 1.8;
    }

    const centerX = imgWidth / 2;
    const centerY = imgHeight / 2;
    const deltaX = targetCenterX - centerX;
    const deltaY = targetCenterY - centerY;

    const angleRadians = (rotation * Math.PI) / 180;
    const rotatedDeltaX = deltaX * Math.cos(angleRadians) - deltaY * Math.sin(angleRadians);
    const rotatedDeltaY = deltaX * Math.sin(angleRadians) + deltaY * Math.cos(angleRadians);

    try {
      panzoomRef.current.zoom(targetScale, { animate: true });
      panzoomRef.current.pan(-rotatedDeltaX, -rotatedDeltaY, { animate: true });
      setScale(targetScale);
    } catch {
      // Ignore unmounted or animation cancellation errors
    }
  }, [currentHighlight, rotation]);

  const updateDimensions = useCallback(() => {
    const img = imageRef.current;
    const vp = viewportRef.current;
    if (img && vp) {
      setDimensions({
        imgW: img.offsetWidth,
        imgH: img.offsetHeight,
        vpW: vp.clientWidth,
        vpH: vp.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [updateDimensions, scale]);

  const handlePanTo = useCallback((x: number, y: number) => {
    panzoomRef.current?.pan(x, y, { animate: true });
    setPan({ x, y });
  }, []);

  const handleExportAnnotated = useCallback(async () => {
    if (!file.dataUrl) return;
    const highlightsToExport =
      effectiveHighlights.length > 0 ? effectiveHighlights : currentHighlight ? [currentHighlight] : [];
    await exportAnnotatedImage({
      imageSrc: file.dataUrl,
      fileName: file.name,
      highlights: highlightsToExport,
      rotation,
    });
  }, [file.dataUrl, file.name, currentHighlight, effectiveHighlights, rotation]);

  const handleConfirmVisualSelection = useCallback(
    (box2d: [number, number, number, number]) => {
      const tag = `<image-locate file="${file.name}" box="[${box2d.join(',')}]">${t('imageLocatePromptQuery')}</image-locate>`;
      useChatStore.getState().setCommandedInput({
        id: Date.now(),
        text: tag,
        mode: 'append',
      });
      setIsVisualCropActive(false);
    },
    [file.name, t],
  );

  useEffect(() => {
    const pz = panzoomRef.current;
    if (!pz) return;
    pz.setOptions({ disablePan: isVisualCropActive });
  }, [isVisualCropActive]);

  const handleImageLoad = useCallback(() => {
    updateDimensions();
    if (currentHighlight) {
      focusHighlight();
    }
  }, [currentHighlight, focusHighlight, updateDimensions]);

  useEffect(() => {
    if (!currentHighlight) return;
    focusHighlight();
    const rafId = requestAnimationFrame(() => {
      focusHighlight();
    });
    return () => cancelAnimationFrame(rafId);
  }, [focusHighlight, currentHighlight, currentHighlight?.focusToken]);

  const isMermaidDiagram = file.type === 'image/svg+xml';

  const imageBackgroundStyle = useMemo(() => {
    if (isMermaidDiagram) {
      return {
        backgroundColor: 'white',
        borderRadius: '4px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
      };
    }

    switch (bgMode) {
      case 'grid':
        return {
          backgroundImage: `
            linear-gradient(45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(255, 255, 255, 0.15) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.15) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.15) 75%)
          `,
          backgroundSize: '16px 16px',
          backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
          backgroundColor: '#18181b',
          borderRadius: '4px',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.15)',
        };
      case 'white':
        return {
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.1)',
        };
      case 'black':
        return {
          backgroundColor: '#000000',
          borderRadius: '4px',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.15)',
        };
      case 'default':
      default:
        return {
          backgroundColor: 'transparent',
          borderRadius: '0',
          boxShadow: 'none',
        };
    }
  }, [bgMode, isMermaidDiagram]);

  return (
    <div
      ref={viewportRef}
      className="w-full h-full relative flex flex-col select-none overflow-hidden"
      onDoubleClick={handleDoubleClick}
    >
      <div className="w-full h-full flex items-center justify-center overflow-hidden">
        <div
          ref={panzoomElementRef}
          className="flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{ width: '100%', height: '100%' }}
        >
          <div
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            <img
              ref={imageRef}
              src={file.dataUrl}
              alt={`Zoomed view of ${file.name}`}
              style={{
                display: 'block',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                userSelect: 'none',
                pointerEvents: 'none',
                ...imageBackgroundStyle,
              }}
              onLoad={handleImageLoad}
              draggable={false}
            />
            {currentHighlight && (
              <ImageHighlightOverlay highlight={currentHighlight} highlights={effectiveHighlights} scale={scale} />
            )}
            {isVisualCropActive && (
              <ImageVisualCropper
                fileName={file.name}
                imageDimensions={{ width: dimensions.imgW, height: dimensions.imgH }}
                rotation={rotation}
                onConfirmSelection={handleConfirmVisualSelection}
                onCancel={() => setIsVisualCropActive(false)}
              />
            )}
          </div>
        </div>
      </div>

      {!isVisualCropActive && file.dataUrl && dimensions.imgW > 0 && dimensions.vpW > 0 && (
        <ImageMinimap
          src={file.dataUrl}
          scale={scale}
          pan={pan}
          imageDimensions={{ width: dimensions.imgW, height: dimensions.imgH }}
          viewportDimensions={{ width: dimensions.vpW, height: dimensions.vpH }}
          rotation={rotation}
          highlights={effectiveHighlights.length > 0 ? effectiveHighlights : currentHighlight ? [currentHighlight] : []}
          onPanTo={handlePanTo}
        />
      )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto panzoom-exclude">
        <FloatingToolbar className="p-1.5">
          <ToolbarButton
            onClick={handleZoomOut}
            disabled={scale <= MIN_SCALE}
            title={t('filePreviewZoomOut')}
            aria-label={t('filePreviewZoomOut')}
          >
            <ZoomOut size={16} strokeWidth={1.5} />
          </ToolbarButton>

          <button
            type="button"
            onClick={handleReset}
            title={t('filePreviewResetView')}
            aria-label={t('filePreviewResetView')}
            className="min-w-[52px] px-1.5 py-0.5 rounded-full font-mono text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors select-none text-center"
          >
            {Math.round(scale * 100)}%
          </button>

          <ToolbarButton
            active={isActualSize}
            onClick={handleToggleActualSize}
            title={isActualSize ? t('filePreviewFitToScreen') : t('filePreviewActualSize')}
            aria-label={isActualSize ? t('filePreviewFitToScreen') : t('filePreviewActualSize')}
            data-testid="image-actual-size-btn"
            className="px-1.5 text-[11px] font-mono font-semibold"
          >
            1:1
          </ToolbarButton>

          <ToolbarButton
            onClick={handleZoomIn}
            disabled={scale >= MAX_SCALE}
            title={t('filePreviewZoomIn')}
            aria-label={t('filePreviewZoomIn')}
          >
            <ZoomIn size={16} strokeWidth={1.5} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            onClick={handleRotateLeft}
            title={t('filePreviewRotateLeft')}
            aria-label={t('filePreviewRotateLeft')}
          >
            <RotateCcw size={16} strokeWidth={1.5} />
          </ToolbarButton>

          <ToolbarButton onClick={handleRotateRight} title={t('filePreviewRotate')} aria-label={t('filePreviewRotate')}>
            <RotateCw size={16} strokeWidth={1.5} />
          </ToolbarButton>

          <ToolbarButton
            active={bgMode !== 'default'}
            onClick={handleCycleBackground}
            title={
              bgMode === 'default'
                ? t('filePreviewBgDefault')
                : bgMode === 'grid'
                  ? t('filePreviewBgGrid')
                  : bgMode === 'white'
                    ? t('filePreviewBgWhite')
                    : t('filePreviewBgBlack')
            }
            aria-label={t('filePreviewBgToggle')}
            data-testid="image-bg-toggle-btn"
          >
            <Grid2x2 size={16} strokeWidth={1.5} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton
            active={isVisualCropActive}
            onClick={() => setIsVisualCropActive((prev) => !prev)}
            title={isVisualCropActive ? t('filePreviewVisualSelectExit') : t('filePreviewVisualSelect')}
            aria-label={t('filePreviewVisualSelect')}
            data-testid="image-visual-select-btn"
          >
            <Crosshair size={16} strokeWidth={1.5} className={isVisualCropActive ? 'text-red-400' : ''} />
          </ToolbarButton>

          <ToolbarButton
            onClick={handleExportAnnotated}
            title={t('filePreviewExportAnnotated')}
            aria-label={t('filePreviewExportAnnotated')}
            data-testid="image-export-annotated-btn"
          >
            <Camera size={16} strokeWidth={1.5} />
          </ToolbarButton>
        </FloatingToolbar>
      </div>
    </div>
  );
};

export const ImageViewer: React.FC<ImageViewerProps> = ({ file, highlight }) => (
  <ImageViewerContent key={file.id} file={file} highlight={highlight} />
);
