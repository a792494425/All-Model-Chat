import React, { useEffect, useRef } from 'react';

interface Props {
  text: string;
  onTextChange: (text: string) => void;
  placeholder: string;
  editorContentStyle?: React.CSSProperties;
  editorElementStyle?: string;
  compactEditorContentStyle?: React.CSSProperties;
  isCompact?: boolean;
}

export const ChatInputTiptapRuntime: React.FC<Props> = ({
  text,
  onTextChange,
  placeholder,
  editorContentStyle,
  compactEditorContentStyle,
  isCompact,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const contentStyle = isCompact ? compactEditorContentStyle : editorContentStyle;

  useEffect(() => {
    if (ref.current && ref.current.textContent !== text) {
      ref.current.textContent = text;
    }
  }, [text]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const next = (e.currentTarget as HTMLDivElement).innerText ?? '';
    onTextChange(next);
  };

  return (
    <div
      className="composer-tiptap custom-scrollbar w-full bg-transparent px-1 pr-9 pt-0.5 pb-0 text-base outline-none"
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label={placeholder}
      data-testid="tiptap-editor"
      ref={ref}
      onInput={handleInput}
      style={contentStyle as React.CSSProperties}
      data-composer-tiptap="true"
    />
  );
};

export default ChatInputTiptapRuntime;
