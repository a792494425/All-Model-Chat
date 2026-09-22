import { act } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@/test/render/renderer';
import { useMessageListUi } from './useMessageListUi';
import type { ChatMessage, UploadedFile } from '@/types';

describe('useMessageListUi - Single Message Gallery Isolation', () => {
  const onUpdateMessageFile = vi.fn();

  const file1: UploadedFile = {
    id: 'f1',
    name: 'photo1.png',
    type: 'image/png',
    size: 100,
    dataUrl: 'blob:photo1',
  };

  const file2: UploadedFile = {
    id: 'f2',
    name: 'photo2.png',
    type: 'image/png',
    size: 200,
    dataUrl: 'blob:photo2',
  };

  const messages: ChatMessage[] = [
    {
      id: 'msg-1',
      role: 'user',
      timestamp: new Date(),
      content: 'Here are two images: ![Inline 1](data:image/png;base64,inline1)',
      files: [file1],
    },
    {
      id: 'msg-2',
      role: 'model',
      timestamp: new Date(),
      content: 'Another generation: ![Inline 2](data:image/png;base64,inline2)',
      files: [file2],
    },
  ];

  it('scopes gallery navigation to the clicked message (attachments + inline images)', () => {
    const { result } = renderHook(() =>
      useMessageListUi({
        messages,
        onUpdateMessageFile,
      }),
    );

    // Click image in msg-1
    act(() => {
      result.current.handleFileClick(file1, 'msg-1');
    });

    // msg-1 has file1 and 1 inline image => total 2 images in gallery
    expect(result.current.previewFile).toBe(file1);
    expect(result.current.allImages).toHaveLength(2);
    expect(result.current.currentImageIndex).toBe(0);

    // Navigate to next image within msg-1
    act(() => {
      result.current.handleNextImage();
    });

    expect(result.current.currentImageIndex).toBe(1);
    expect(result.current.previewFile?.dataUrl).toBe('data:image/png;base64,inline1');

    // Trying to navigate further does nothing because msg-1 gallery ended
    act(() => {
      result.current.handleNextImage();
    });
    expect(result.current.currentImageIndex).toBe(1);

    // Close preview
    act(() => {
      result.current.closeFilePreviewModal();
    });
    expect(result.current.previewFile).toBeNull();
  });

  it('isolates gallery when clicking an image in a different message', () => {
    const { result } = renderHook(() =>
      useMessageListUi({
        messages,
        onUpdateMessageFile,
      }),
    );

    // Click image in msg-2
    act(() => {
      result.current.handleFileClick(file2, 'msg-2');
    });

    expect(result.current.previewFile).toBe(file2);
    expect(result.current.allImages).toHaveLength(2); // file2 + inline2
    expect(result.current.currentImageIndex).toBe(0);

    // Navigate to next in msg-2
    act(() => {
      result.current.handleNextImage();
    });

    expect(result.current.currentImageIndex).toBe(1);
    expect(result.current.previewFile?.dataUrl).toBe('data:image/png;base64,inline2');
  });
});
