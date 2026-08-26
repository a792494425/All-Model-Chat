import React, { lazy, Suspense, useRef, useEffect } from 'react';
import { ChatTextArea } from './area/ChatTextArea';

const ChatInputTiptapRuntime = lazy(() => import('./ChatInputTiptapRuntime'));

interface Props {
  text: string;
  onTextChange: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onCompositionStart: () => void;
  onCompositionEnd: (value: string) => void;
  placeholder: string;
  disabled: boolean;
  isFullscreen: boolean;
  hasCustomHeight?: boolean;
  isMobile: boolean;
  initialTextareaHeight: number;
  isConverting: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  isExpanded: boolean;
  compactWhenSingleLine?: boolean;
  editorContentStyle?: React.CSSProperties;
  compactEditorContentStyle?: React.CSSProperties;
  editorElementStyle?: string;
  isCompact?: boolean;
  draftTokens?: unknown[];
}

export const DeferredChatInputSurface: React.FC<Props> = (props) => {
  const {
    text,
    onTextChange,
    placeholder,
    isExpanded,
    draftTokens,
    compactWhenSingleLine,
    textareaRef,
    isCompact,
    editorContentStyle,
    compactEditorContentStyle,
    editorElementStyle,
    ...rest
  } = props;

  const needsRuntime =
    isExpanded || text.trim().length > 0 || Boolean(draftTokens?.length) || Boolean(compactWhenSingleLine);

  const selectionRef = useRef({ start: text.length, end: text.length });

  useEffect(() => {
    selectionRef.current = { start: text.length, end: text.length };
  }, [text]);

  if (needsRuntime) {
    return (
      <Suspense fallback={
        <ChatTextArea
          textareaRef={textareaRef}
          value={text}
          onChange={(e) => onTextChange(e.currentTarget.value)}
          placeholder={placeholder}
          disabled={props.disabled}
          isFullscreen={props.isFullscreen}
          hasCustomHeight={props.hasCustomHeight}
          isMobile={props.isMobile}
          initialTextareaHeight={props.initialTextareaHeight}
          isConverting={props.isConverting}
          onKeyDown={props.onKeyDown}
          onPaste={props.onPaste}
          onCompositionStart={props.onCompositionStart}
          onCompositionEnd={props.onCompositionEnd}
          editorContentStyle={editorContentStyle}
          compactEditorContentStyle={compactEditorContentStyle}
          editorElementStyle={editorElementStyle}
          isCompact={isCompact}
        />
      }>
        <ChatInputTiptapRuntime
          text={text}
          onTextChange={onTextChange}
          placeholder={placeholder}
          editorContentStyle={editorContentStyle}
          compactEditorContentStyle={compactEditorContentStyle}
          isCompact={isCompact}
        />
      </Suspense>
    );
  }

  return (
    <ChatTextArea
      textareaRef={textareaRef}
      value={text}
      onChange={(e) => onTextChange(e.currentTarget.value)}
      placeholder={placeholder}
      disabled={props.disabled}
      isFullscreen={props.isFullscreen}
      hasCustomHeight={props.hasCustomHeight}
      isMobile={props.isMobile}
      initialTextareaHeight={props.initialTextareaHeight}
      isConverting={props.isConverting}
      onKeyDown={props.onKeyDown}
      onPaste={props.onPaste}
      onCompositionStart={props.onCompositionStart}
      onCompositionEnd={props.onCompositionEnd}
      editorContentStyle={editorContentStyle}
      compactEditorContentStyle={compactEditorContentStyle}
      editorElementStyle={editorElementStyle}
      isCompact={isCompact}
    />
  );
};

export default DeferredChatInputSurface;
