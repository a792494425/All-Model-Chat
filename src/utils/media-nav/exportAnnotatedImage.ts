import type { ImageNavHighlight } from '@/stores/mediaNavStore';

export interface ExportAnnotatedImageOptions {
  imageSrc: string;
  fileName?: string;
  highlights: ImageNavHighlight[];
  rotation?: number;
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (loadError) => reject(loadError);
    img.src = src;
  });

/**
 * Composite high-res original image with visual grounding HUD annotations
 * (bounding boxes, corner brackets, arrows, numbered badges) onto a canvas and trigger PNG download.
 */
export const exportAnnotatedImage = async (options: ExportAnnotatedImageOptions): Promise<void> => {
  const { imageSrc, fileName = 'image.png', highlights, rotation = 0 } = options;
  if (!imageSrc) return;

  const img = await loadImage(imageSrc);
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;

  if (naturalW <= 0 || naturalH <= 0) return;

  const rad = ((rotation % 360) * Math.PI) / 180;
  const isQuarterTurn = rotation % 180 !== 0;
  const canvasW = isQuarterTurn ? naturalH : naturalW;
  const canvasH = isQuarterTurn ? naturalW : naturalH;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const canvasContext = canvas.getContext('2d');
  if (!canvasContext) return;

  canvasContext.save();

  // Position and rotate
  canvasContext.translate(canvasW / 2, canvasH / 2);
  canvasContext.rotate(rad);
  canvasContext.drawImage(img, -naturalW / 2, -naturalH / 2, naturalW, naturalH);

  // Draw annotations in original image coordinate space
  canvasContext.translate(-naturalW / 2, -naturalH / 2);

  // Base scale for line thickness and fonts based on image resolution
  const resScale = Math.max(0.6, Math.min(3.5, naturalW / 1000));
  const cornerLen = Math.max(12, Math.round(18 * resScale));
  const lineWidth = Math.max(2, Math.round(2.5 * resScale));
  const bracketWidth = Math.max(3, Math.round(4.5 * resScale));
  const fontSize = Math.max(13, Math.round(15 * resScale));

  highlights.forEach((highlight, highlightIndex) => {
    const { box2d, point, label, snippet, index } = highlight;
    const itemIndex = typeof index === 'number' ? index : highlightIndex + 1;
    const displayText = (highlights.length > 1 ? `[${itemIndex}] ` : '') + (label || snippet || '目标定位');

    // 1. Draw Bounding Box
    if (box2d && box2d.length === 4) {
      const [ymin, xmin, ymax, xmax] = box2d;
      const boxX = (Math.min(xmin, xmax) / 1000) * naturalW;
      const boxY = (Math.min(ymin, ymax) / 1000) * naturalH;
      const boxWidth = (Math.abs(xmax - xmin) / 1000) * naturalW;
      const boxHeight = (Math.abs(ymax - ymin) / 1000) * naturalH;

      // Fill semi-transparent
      canvasContext.fillStyle = 'rgba(239, 68, 68, 0.12)';
      canvasContext.fillRect(boxX, boxY, boxWidth, boxHeight);

      // Bounding box border
      canvasContext.strokeStyle = 'rgba(239, 68, 68, 0.65)';
      canvasContext.lineWidth = lineWidth;
      canvasContext.strokeRect(boxX, boxY, boxWidth, boxHeight);

      // 4 Cyber HUD Corner brackets
      canvasContext.strokeStyle = '#ef4444';
      canvasContext.lineWidth = bracketWidth;
      canvasContext.lineCap = 'round';
      canvasContext.lineJoin = 'miter';

      // Top-Left
      canvasContext.beginPath();
      canvasContext.moveTo(boxX, boxY + cornerLen);
      canvasContext.lineTo(boxX, boxY);
      canvasContext.lineTo(boxX + cornerLen, boxY);
      canvasContext.stroke();

      // Top-Right
      canvasContext.beginPath();
      canvasContext.moveTo(boxX + boxWidth - cornerLen, boxY);
      canvasContext.lineTo(boxX + boxWidth, boxY);
      canvasContext.lineTo(boxX + boxWidth, boxY + cornerLen);
      canvasContext.stroke();

      // Bottom-Left
      canvasContext.beginPath();
      canvasContext.moveTo(boxX, boxY + boxHeight - cornerLen);
      canvasContext.lineTo(boxX, boxY + boxHeight);
      canvasContext.lineTo(boxX + cornerLen, boxY + boxHeight);
      canvasContext.stroke();

      // Bottom-Right
      canvasContext.beginPath();
      canvasContext.moveTo(boxX + boxWidth - cornerLen, boxY + boxHeight);
      canvasContext.lineTo(boxX + boxWidth, boxY + boxHeight);
      canvasContext.lineTo(boxX + boxWidth, boxY + boxHeight - cornerLen);
      canvasContext.stroke();

      // Badge on top of box
      const badgeX = boxX + boxWidth / 2;
      const badgeY = boxY > 40 * resScale ? boxY - 10 * resScale : boxY + boxHeight + 24 * resScale;
      drawBadge(canvasContext, displayText, badgeX, badgeY, fontSize, resScale);
    } else if (point && point.length === 2) {
      // 2. Draw Point Reticle
      const [py, px] = point;
      const pointX = (px / 1000) * naturalW;
      const pointY = (py / 1000) * naturalH;
      const radius = 10 * resScale;

      canvasContext.strokeStyle = '#ef4444';
      canvasContext.lineWidth = bracketWidth;
      canvasContext.beginPath();
      canvasContext.arc(pointX, pointY, radius, 0, Math.PI * 2);
      canvasContext.stroke();

      canvasContext.fillStyle = '#ef4444';
      canvasContext.beginPath();
      canvasContext.arc(pointX, pointY, radius * 0.4, 0, Math.PI * 2);
      canvasContext.fill();

      // Badge near point
      const badgeY = pointY > 40 * resScale ? pointY - 16 * resScale : pointY + 24 * resScale;
      drawBadge(canvasContext, displayText, pointX, badgeY, fontSize, resScale);
    }
  });

  canvasContext.restore();

  await new Promise<void>((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      const baseName = fileName.replace(/\.[^/.]+$/, '');
      downloadAnchor.download = `${baseName}_annotated.png`;
      downloadAnchor.href = url;
      downloadAnchor.click();
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve();
      }, 1000);
    }, 'image/png');
  });
};

const drawBadge = (
  canvasContext: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  fontSize: number,
  scale: number,
) => {
  canvasContext.save();
  canvasContext.font = `600 ${fontSize}px sans-serif`;
  canvasContext.textBaseline = 'middle';
  canvasContext.textAlign = 'center';

  const textMetrics = canvasContext.measureText(text);
  const paddingX = 10 * scale;
  const paddingY = 6 * scale;
  const badgeWidth = textMetrics.width + paddingX * 2;
  const badgeHeight = fontSize + paddingY * 2;
  const badgeX = centerX - badgeWidth / 2;
  const badgeY = centerY - badgeHeight / 2;
  const radius = 6 * scale;

  // Background rounded rect
  canvasContext.fillStyle = 'rgba(15, 23, 42, 0.88)';
  canvasContext.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  canvasContext.lineWidth = 1.5 * scale;

  canvasContext.beginPath();
  if (typeof canvasContext.roundRect === 'function') {
    canvasContext.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, radius);
  } else {
    canvasContext.rect(badgeX, badgeY, badgeWidth, badgeHeight);
  }
  canvasContext.fill();
  canvasContext.stroke();

  // Text
  canvasContext.fillStyle = '#ffffff';
  canvasContext.fillText(text, centerX, centerY);
  canvasContext.restore();
};
