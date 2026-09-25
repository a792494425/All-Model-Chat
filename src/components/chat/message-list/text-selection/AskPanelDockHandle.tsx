import React from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { AskPanelDockSide } from '@/utils/text-selection/askPanelDocking';
import {
  DOCK_HANDLE_HEIGHT,
  DOCK_HANDLE_WIDTH,
  PANEL_Z_INDEX,
  VIEWPORT_PADDING,
  type PanelSize,
} from './useAskPanelFloating';

export interface AskPanelDockHandleProps {
  docked: AskPanelDockSide;
  dockedTop: number;
  size: PanelSize;
  targetWindow: Window;
  targetDocument: Document;
  isLoading: boolean;
  error: string | null;
  expandFromDock: (focusTextarea?: boolean) => void;
  onClose: () => void;
  t: (key: string) => string;
}

export const AskPanelDockHandle: React.FC<AskPanelDockHandleProps> = ({
  docked,
  dockedTop,
  size,
  targetWindow,
  targetDocument,
  isLoading,
  error,
  expandFromDock,
  onClose,
  t,
}) => {
  const handleTop = Math.round(
    Math.max(
      VIEWPORT_PADDING,
      Math.min(
        dockedTop + size.height / 2 - DOCK_HANDLE_HEIGHT / 2,
        targetWindow.innerHeight - DOCK_HANDLE_HEIGHT - VIEWPORT_PADDING,
      ),
    ),
  );
  const isRight = docked === 'right';

  return createPortal(
    <button
      type="button"
      className={`fixed ${PANEL_Z_INDEX} flex items-center justify-center border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] text-[var(--theme-text-secondary)] shadow-[0_6px_20px_rgba(0,0,0,0.18)] backdrop-blur-xl transition-colors hover:bg-[var(--theme-bg-tertiary)] hover:text-[var(--theme-text-primary)]`}
      style={{
        top: handleTop,
        width: DOCK_HANDLE_WIDTH,
        height: DOCK_HANDLE_HEIGHT,
        ...(isRight ? { right: 0, borderRadius: '10px 0 0 10px' } : { left: 0, borderRadius: '0 10px 10px 0' }),
      }}
      onMouseEnter={() => expandFromDock()}
      onFocus={() => expandFromDock(true)}
      onClick={() => expandFromDock(true)}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={t('ask')}
      title={t('askDockHandleHint')}
    >
      {/* 常显品牌色条：贴边收起后把手要有足够的视觉存在感，避免找不到面板 */}
      <span
        aria-hidden
        className={`absolute top-2.5 bottom-2.5 w-[3px] rounded-full bg-[var(--theme-text-link)] opacity-80 ${
          isRight ? 'right-1' : 'left-1'
        }`}
      />
      {isRight ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      {(isLoading || error) && (
        <span
          aria-hidden
          className={`absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full ${
            error ? 'bg-[var(--theme-text-danger)]' : 'animate-pulse bg-[var(--theme-text-link)]'
          }`}
        />
      )}
    </button>,
    targetDocument.body,
  );
};
