import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWindowContext } from '@/contexts/WindowContext';
import { useI18n } from '@/contexts/I18nContext';
import { useSettingsStore } from '@/stores/settingsStore';
import { useSelectionAsk } from '@/hooks/text-selection/useSelectionAsk';
import { PANEL_Z_INDEX, useAskPanelFloating } from './useAskPanelFloating';
import { AskPanelDockHandle } from './AskPanelDockHandle';
import { AskPanelHeader } from './AskPanelHeader';
import { AskPanelContent } from './AskPanelContent';
import { AskPanelInput } from './AskPanelInput';
import { AskPanelResizeHandles } from './AskPanelResizeHandles';

interface SelectionAskPanelProps {
  selectedText: string;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onInsert?: (text: string) => void;
  onQuote?: (text: string) => void;
}

export const SelectionAskPanel: React.FC<SelectionAskPanelProps> = ({
  selectedText,
  anchorRect,
  onClose,
  onInsert,
  onQuote,
}) => {
  const { t } = useI18n();
  const { document: targetDocument, window: targetWindow } = useWindowContext();
  const themeId = useSettingsStore((state) => state.currentTheme.id);
  const selectionAskModelId = useSettingsStore((state) => state.appSettings.selectionAskModelId);
  const selectionAskProviderId = useSettingsStore((state) => state.appSettings.selectionAskProviderId);

  const { answer, isLoading, error, ask, cancel, reset } = useSelectionAsk();
  const [question, setQuestion] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    position,
    size,
    panelRef,
    isDragging,
    isResizing,
    docked,
    dockedTop,
    handlePointerDown,
    handleResizePointerDown,
    handleResetSize,
    expandFromDock,
  } = useAskPanelFloating({
    anchorRect,
    targetWindow,
    textareaRef,
  });

  // 卸载时 abort
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  // 面板开着时再次"询问"换锚点：重置旧答案与提问输入
  const lastAnchorRef = useRef<DOMRect | null>(anchorRect);
  useEffect(() => {
    if (lastAnchorRef.current === anchorRect) return;
    lastAnchorRef.current = anchorRect;
    reset();
    setQuestion('');
  }, [anchorRect, reset]);

  // 挂载聚焦输入框
  useEffect(() => {
    const id = targetWindow.setTimeout(() => textareaRef.current?.focus(), 100);
    return () => targetWindow.clearTimeout(id);
  }, [targetWindow]);

  // 全局快捷键 Escape 监听
  useEffect(() => {
    const isEditableElement = (el: Element | null): boolean =>
      el instanceof HTMLElement && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (e.defaultPrevented) return;
      const active = targetDocument.activeElement;

      // 停靠状态下面板已卸载：焦点不在任何可编辑元素里时，Escape 直接关闭整个询问会话
      if (docked) {
        if (isEditableElement(active)) return;
        e.stopPropagation();
        onClose();
        return;
      }

      if (panelRef.current && active && panelRef.current.contains(active)) {
        e.stopPropagation();
        onClose();
      } else if (!panelRef.current?.contains(active as Node | null)) {
        return;
      }
    };
    targetDocument.addEventListener('keydown', onKey);
    return () => targetDocument.removeEventListener('keydown', onKey);
  }, [docked, onClose, panelRef, targetDocument]);

  const handleAsk = useCallback(
    (promptQuery: string) => {
      const trimmed = promptQuery.trim();
      if (!trimmed || !selectedText.trim()) return;
      ask(selectedText, trimmed);
    },
    [ask, selectedText],
  );

  const handleSubmit = useCallback(() => {
    if (!question.trim() || isLoading) return;
    handleAsk(question);
  }, [question, isLoading, handleAsk]);

  const handleQuick = useCallback(
    (type: 'explain' | 'translate' | 'summarize') => {
      const promptMap: Record<string, string> = {
        explain: t('selectionAskPromptExplain'),
        translate: t('selectionAskPromptTranslate'),
        summarize: t('selectionAskPromptSummarize'),
      };
      const quickQuery = promptMap[type];
      setQuestion(quickQuery);
      handleAsk(quickQuery);
      targetWindow.setTimeout(() => textareaRef.current?.focus(), 0);
    },
    [handleAsk, t, targetWindow],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit();
      }
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    },
    [handleSubmit, onClose],
  );

  const handleTextareaInput = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement> | React.FormEvent<HTMLTextAreaElement>) => {
      const textarea = event.currentTarget;
      setQuestion(textarea.value);
      textarea.style.height = 'auto';
      const maxH = 96;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxH)}px`;
      textarea.style.overflowY = textarea.scrollHeight > maxH ? 'auto' : 'hidden';
    },
    [],
  );

  if (!position) return null;

  if (docked) {
    return (
      <AskPanelDockHandle
        docked={docked}
        dockedTop={dockedTop}
        size={size}
        targetWindow={targetWindow}
        targetDocument={targetDocument}
        isLoading={isLoading}
        error={error}
        expandFromDock={expandFromDock}
        onClose={onClose}
        t={t}
      />
    );
  }

  return createPortal(
    <>
      <div
        ref={panelRef}
        className={`fixed ${PANEL_Z_INDEX} flex flex-col overflow-hidden rounded-[20px] border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)]/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.14)]`}
        style={{
          top: position.top,
          left: position.left,
          width: size.width,
          height: size.height,
          animation: 'askPanelIn 0.22s var(--ease-out-expo) both',
        }}
        role="dialog"
        aria-label={t('ask')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <AskPanelHeader
          isDragging={isDragging}
          isResizing={Boolean(isResizing)}
          selectionAskModelId={selectionAskModelId}
          selectionAskProviderId={selectionAskProviderId}
          handlePointerDown={handlePointerDown}
          handleResetSize={handleResetSize}
          onClose={onClose}
          t={t}
        />

        <AskPanelContent
          selectedText={selectedText}
          answer={answer}
          isLoading={isLoading}
          error={error}
          themeId={themeId}
          question={question}
          targetDocument={targetDocument}
          targetWindow={targetWindow}
          onInsert={onInsert}
          onQuote={onQuote}
          handleQuick={handleQuick}
          handleAsk={handleAsk}
          t={t}
        />

        <AskPanelInput
          textareaRef={textareaRef}
          question={question}
          isLoading={isLoading}
          hasAnswer={Boolean(answer)}
          handleTextareaInput={handleTextareaInput}
          handleKeyDown={handleKeyDown}
          handleQuick={handleQuick}
          handleSubmit={handleSubmit}
          cancel={cancel}
          t={t}
        />

        {/* 把手仅作视觉指示，命中区在面板外侧热区；内缩 4px 防圆角裁剪 */}
        <div
          aria-hidden
          className={`pointer-events-none absolute bottom-1 right-1 flex h-4 w-4 items-end justify-end p-0.5 transition-opacity ${
            isResizing === 'se'
              ? 'text-[var(--theme-text-link)] opacity-100'
              : 'text-[var(--theme-text-tertiary)] opacity-70'
          }`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
            <path
              d="M9 1 L9 9 L1 9"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <AskPanelResizeHandles
        position={position}
        size={size}
        handleResizePointerDown={handleResizePointerDown}
        handleResetSize={handleResetSize}
        t={t}
      />
    </>,
    targetDocument.body,
  );
};
