import React, { type RefObject } from 'react';
import type { UploadedFile } from '@/types';
import type { MarkdownHandlers, MarkdownImageProps } from './markdownTypes';

interface MarkdownImageElementProps extends MarkdownImageProps {
  isInteractive: boolean;
  handlersRef: RefObject<MarkdownHandlers>;
  messageId?: string;
}

export const MarkdownImageElement: React.FC<MarkdownImageElementProps> = ({
  src,
  alt,
  className,
  isInteractive,
  handlersRef,
  messageId,
  ...rest
}) => {
  const imageClassName = isInteractive
    ? `${className || ''} cursor-pointer hover:opacity-90 transition-opacity`
    : className || '';

  return (
    <img
      src={src}
      alt={alt}
      className={imageClassName}
      onClick={(event) => {
        if (!isInteractive) return;
        event.stopPropagation();
        const prefix = messageId ? `${messageId}-inline` : 'inline-img';
        if (src && src.startsWith('data:image/')) {
          const mimeType = src.split(';')[0].split(':')[1];
          const file: UploadedFile = {
            id: `${prefix}-${Date.now()}`,
            name: alt || 'generated-plot.png',
            type: mimeType,
            size: 0,
            dataUrl: src,
            uploadState: 'active',
          };
          handlersRef.current?.onImageClick(file, messageId);
        } else if (src) {
          const file: UploadedFile = {
            id: `${prefix}-${Date.now()}`,
            name: alt || 'image',
            type: 'image/jpeg',
            size: 0,
            dataUrl: src,
            uploadState: 'active',
          };
          handlersRef.current?.onImageClick(file, messageId);
        }
      }}
      {...rest}
    />
  );
};
