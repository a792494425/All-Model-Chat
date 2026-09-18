import React from 'react';
import type { PanelSize, ResizeDir } from './useAskPanelFloating';

export interface AskPanelResizeHandlesProps {
  position: { top: number; left: number };
  size: PanelSize;
  handleResizePointerDown: (dir: ResizeDir) => (e: React.PointerEvent) => void;
  handleResetSize: () => void;
  t: (key: string) => string;
}

export const AskPanelResizeHandles: React.FC<AskPanelResizeHandlesProps> = ({
  position,
  size,
  handleResizePointerDown,
  handleResetSize,
  t,
}) => {
  return (
    <>
      {/* 热区是面板兄弟节点、跨边框（外 6 内 1）：放面板内会盖住右缘滚动条 */}
      {(
        [
          [
            'n',
            { top: position.top - 6, left: position.left + 5, width: size.width - 10, height: 7 },
            'cursor-n-resize',
          ],
          [
            's',
            { top: position.top + size.height - 1, left: position.left + 5, width: size.width - 10, height: 7 },
            'cursor-s-resize',
          ],
          [
            'e',
            { top: position.top + 5, left: position.left + size.width - 1, width: 7, height: size.height - 10 },
            'cursor-e-resize',
          ],
          [
            'w',
            { top: position.top + 5, left: position.left - 6, width: 7, height: size.height - 10 },
            'cursor-w-resize',
          ],
        ] as const
      ).map(([dir, hitStyle, cursor]) => (
        <div
          key={dir}
          onPointerDown={handleResizePointerDown(dir)}
          className={`fixed z-[10000] ${cursor} touch-none`}
          style={hitStyle}
        />
      ))}
      {(
        [
          ['ne', position.top - 5, position.left + size.width - 5, 'cursor-ne-resize'],
          ['nw', position.top - 5, position.left - 5, 'cursor-nw-resize'],
          ['sw', position.top + size.height - 5, position.left - 5, 'cursor-sw-resize'],
          ['se', position.top + size.height - 5, position.left + size.width - 5, 'cursor-se-resize'],
        ] as const
      ).map(([dir, hitTop, hitLeft, cursor]) => (
        <div
          key={dir}
          onPointerDown={handleResizePointerDown(dir)}
          onDoubleClick={dir === 'se' ? handleResetSize : undefined}
          title={dir === 'se' ? t('askResizeHint') : undefined}
          aria-label={dir === 'se' ? t('askResetSize') : undefined}
          className={`fixed z-[10000] ${cursor} touch-none`}
          style={{ top: hitTop, left: hitLeft, width: 10, height: 10 }}
        />
      ))}
    </>
  );
};
