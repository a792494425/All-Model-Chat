import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { type UploadedFile } from '@/types';
import { FloatingToolbar, ToolbarButton, ToolbarDivider, ToolbarLabel } from './FloatingToolbar';
import { useI18n } from '@/contexts/I18nContext';
import { ImageHighlightOverlay } from '@/components/media-nav/ImageHighlightOverlay';
import type { ImageNavHighlight } from '@/stores/mediaNavStore';

interface ImageViewerProps {
  file: UploadedFile;
  highlight?: ImageNavHighlight | null;
}

const MIN_SCALE = 0.2;
const MAX_SCALE = 10;
const ZOOM_SPEED_FACTOR = 1.1;
const BUTTON_ZOOM_FACTOR = 1.5;

const ImageViewerContent: React.FC<ImageViewerProps> = ({ file, highlight }) => {
  const { t } = useI18n();
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const imageRef = useRef<HTMLImageElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastDistRef = useRef<number | null>(null);

  const getWrapperOffset = useCallback((vpRectWidth: number, vpRectHeight: number) => {
    const wrapper = wrapperRef.current;
    const img = imageRef.current;
    const imgWidth = img?.offsetWidth ?? 0;
    const imgHeight = img?.offsetHeight ?? 0;
    const x = wrapper && wrapper.offsetLeft > 0 ? wrapper.offsetLeft : (vpRectWidth - imgWidth) / 2;
    const y = wrapper && wrapper.offsetTop > 0 ? wrapper.offsetTop : (vpRectHeight - imgHeight) / 2;
    return { x, y, imgWidth, imgHeight };
  }, []);

  const handleZoom = useCallback(
    (direction: 'in' | 'out') => {
      if (!viewportRef.current || !imageRef.current) return;

      const rect = viewportRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const newScale =
        direction === 'in'
          ? Math.min(MAX_SCALE, scale * BUTTON_ZOOM_FACTOR)
          : Math.max(MIN_SCALE, scale / BUTTON_ZOOM_FACTOR);

      if (newScale === scale) return;

      const { x: imageOffsetX, y: imageOffsetY } = getWrapperOffset(rect.width, rect.height);
      const ratio = newScale / scale;
      const newPositionX = (centerX - imageOffsetX) * (1 - ratio) + position.x * ratio;
      const newPositionY = (centerY - imageOffsetY) * (1 - ratio) + position.y * ratio;

      setPosition({ x: newPositionX, y: newPositionY });
      setScale(newScale);
    },
    [scale, position, getWrapperOffset],
  );

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (!viewportRef.current || !imageRef.current) return;
      event.preventDefault();

      const rect = viewportRef.current.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const newScale =
        event.deltaY < 0
          ? Math.min(MAX_SCALE, scale * ZOOM_SPEED_FACTOR)
          : Math.max(MIN_SCALE, scale / ZOOM_SPEED_FACTOR);

      if (newScale === scale) return;

      const { x: imageOffsetX, y: imageOffsetY } = getWrapperOffset(rect.width, rect.height);
      const ratio = newScale / scale;
      const newPositionX = (mouseX - imageOffsetX) * (1 - ratio) + position.x * ratio;
      const newPositionY = (mouseY - imageOffsetY) * (1 - ratio) + position.y * ratio;

      setPosition({ x: newPositionX, y: newPositionY });
      setScale(newScale);
    },
    [scale, position, getWrapperOffset],
  );

  const handleMouseDown = (event: React.MouseEvent<HTMLImageElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    });
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    event.preventDefault();
    setPosition({
      x: event.clientX - dragStart.x,
      y: event.clientY - dragStart.y,
    });
  };

  const handleMouseUp = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      setDragStart({
        x: touch.clientX - position.x,
        y: touch.clientY - position.y,
      });
      setIsDragging(true);
    } else if (event.touches.length === 2) {
      setIsDragging(false);
      const firstTouch = event.touches[0];
      const secondTouch = event.touches[1];
      lastDistRef.current = Math.hypot(
        firstTouch.clientX - secondTouch.clientX,
        firstTouch.clientY - secondTouch.clientY,
      );
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 1 && isDragging) {
      const touch = event.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y,
      });
    } else if (event.touches.length === 2 && lastDistRef.current && viewportRef.current && imageRef.current) {
      const firstTouch = event.touches[0];
      const secondTouch = event.touches[1];
      const touchDistance = Math.hypot(
        firstTouch.clientX - secondTouch.clientX,
        firstTouch.clientY - secondTouch.clientY,
      );

      const pinchScaleRatio = touchDistance / lastDistRef.current;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale * pinchScaleRatio));

      if (newScale !== scale) {
        const rect = viewportRef.current.getBoundingClientRect();
        const pinchCenterX = (firstTouch.clientX + secondTouch.clientX) / 2 - rect.left;
        const pinchCenterY = (firstTouch.clientY + secondTouch.clientY) / 2 - rect.top;

        const { x: imageOffsetX, y: imageOffsetY } = getWrapperOffset(rect.width, rect.height);
        const positionScaleRatio = newScale / scale;
        const newPositionX = (pinchCenterX - imageOffsetX) * (1 - positionScaleRatio) + position.x * positionScaleRatio;
        const newPositionY = (pinchCenterY - imageOffsetY) * (1 - positionScaleRatio) + position.y * positionScaleRatio;

        setPosition({ x: newPositionX, y: newPositionY });
        setScale(newScale);
        lastDistRef.current = touchDistance;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastDistRef.current = null;
  };

  useEffect(() => {
    const vpRef = viewportRef.current;
    if (vpRef) {
      vpRef.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (vpRef) {
        vpRef.removeEventListener('wheel', handleWheel);
      }
    };
  }, [handleWheel]);

  const focusHighlight = useCallback(() => {
    if (!highlight || !imageRef.current || !viewportRef.current) return;
    const { box2d, point } = highlight;
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

      const fitScale = Math.min((vpWidth * 0.45) / boxW, (vpHeight * 0.45) / boxH);
      targetScale = Math.min(3.5, Math.max(1.3, fitScale));
    } else if (point && point.length === 2) {
      const [y, x] = point;
      targetCenterX = (x / 1000) * imgWidth;
      targetCenterY = (y / 1000) * imgHeight;
      targetScale = 1.8;
    }

    const wrapper = wrapperRef.current;
    const wrapperLeft = wrapper && wrapper.offsetLeft > 0 ? wrapper.offsetLeft : (vpWidth - imgWidth) / 2;
    const wrapperTop = wrapper && wrapper.offsetTop > 0 ? wrapper.offsetTop : (vpHeight - imgHeight) / 2;

    const newPosX = vpWidth / 2 - wrapperLeft - targetCenterX * targetScale;
    const newPosY = vpHeight / 2 - wrapperTop - targetCenterY * targetScale;

    setScale(targetScale);
    setPosition({ x: Math.round(newPosX), y: Math.round(newPosY) });
  }, [highlight]);

  useEffect(() => {
    focusHighlight();
  }, [focusHighlight, highlight?.focusToken]);

  const isMermaidDiagram = file.type === 'image/svg+xml';

  return (
    <div
      className="w-full h-full relative flex flex-col select-none touch-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        ref={viewportRef}
        className="flex-grow w-full h-full flex items-center justify-center overflow-hidden relative"
      >
        <div
          ref={wrapperRef}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
            position: 'relative',
            display: 'inline-flex',
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
              cursor: isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              backgroundColor: isMermaidDiagram ? 'white' : 'transparent',
              borderRadius: isMermaidDiagram ? '4px' : '0',
              boxShadow: isMermaidDiagram ? '0 0 0 1px rgba(255,255,255,0.1)' : 'none',
            }}
            onMouseDown={handleMouseDown}
            onDoubleClick={handleReset}
            onLoad={() => {
              if (highlight) focusHighlight();
            }}
            draggable="false"
          />
          {highlight && <ImageHighlightOverlay highlight={highlight} />}
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-auto">
        <FloatingToolbar className="p-1.5">
          <ToolbarButton
            onClick={() => handleZoom('out')}
            disabled={scale <= MIN_SCALE}
            title={t('filePreviewZoomOut')}
          >
            <ZoomOut size={16} strokeWidth={1.5} />
          </ToolbarButton>

          <ToolbarLabel className="min-w-[50px] text-center">{(scale * 100).toFixed(0)}%</ToolbarLabel>

          <ToolbarButton onClick={() => handleZoom('in')} disabled={scale >= MAX_SCALE} title={t('filePreviewZoomIn')}>
            <ZoomIn size={16} strokeWidth={1.5} />
          </ToolbarButton>

          <ToolbarDivider />

          <ToolbarButton onClick={handleReset} title={t('filePreviewResetView')}>
            <RotateCw size={16} strokeWidth={1.5} />
          </ToolbarButton>
        </FloatingToolbar>
      </div>
    </div>
  );
};

export const ImageViewer: React.FC<ImageViewerProps> = ({ file, highlight }) => (
  <ImageViewerContent key={file.id} file={file} highlight={highlight} />
);
