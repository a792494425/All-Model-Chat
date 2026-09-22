import { describe, it, expect } from 'vitest';
import { extractMessageImages } from './messageImages';
import type { ChatMessage, UploadedFile } from '@/types';

describe('extractMessageImages', () => {
  it('extracts image files from message.files', () => {
    const imgFile: UploadedFile = {
      id: 'file-1',
      name: 'photo.png',
      type: 'image/png',
      size: 1024,
      dataUrl: 'blob:http://localhost/photo.png',
    };
    const textFile: UploadedFile = {
      id: 'file-2',
      name: 'notes.txt',
      type: 'text/plain',
      size: 512,
    };
    const message: ChatMessage = {
      id: 'msg-1',
      role: 'user',
      timestamp: new Date(),
      content: 'Here is my photo',
      files: [imgFile, textFile],
    };

    const result = extractMessageImages(message);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('file-1');
    expect(result[0].name).toBe('photo.png');
  });

  it('extracts markdown inline images from message.content', () => {
    const message: ChatMessage = {
      id: 'msg-2',
      role: 'model',
      timestamp: new Date(),
      content:
        'Generated images:\n\n![Sunset View](data:image/png;base64,sunset123)\n\nAnd another:\n![Mountain](https://example.com/mountain.jpg "Scenic mountain")',
    };

    const result = extractMessageImages(message);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: 'msg-2-inline-0',
      name: 'Sunset View',
      type: 'image/png',
      dataUrl: 'data:image/png;base64,sunset123',
    });
    expect(result[1]).toMatchObject({
      id: 'msg-2-inline-1',
      name: 'Mountain',
      type: 'image/jpeg',
      dataUrl: 'https://example.com/mountain.jpg',
    });
  });

  it('extracts HTML <img> tags from message.content', () => {
    const message: ChatMessage = {
      id: 'msg-3',
      role: 'model',
      timestamp: new Date(),
      content: '<p>Graph:</p><img src="data:image/svg+xml;base64,svgdata" alt="Diagram" />',
    };

    const result = extractMessageImages(message);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'msg-3-inline-0',
      name: 'Diagram',
      type: 'image/svg+xml',
      dataUrl: 'data:image/svg+xml;base64,svgdata',
    });
  });

  it('deduplicates images between message.files and markdown content with same dataUrl', () => {
    const imgFile: UploadedFile = {
      id: 'file-shared',
      name: 'diagram.png',
      type: 'image/png',
      size: 2048,
      dataUrl: 'data:image/png;base64,sharedData',
    };
    const message: ChatMessage = {
      id: 'msg-4',
      role: 'user',
      timestamp: new Date(),
      content: 'Look at this diagram: ![diagram](data:image/png;base64,sharedData)',
      files: [imgFile],
    };

    const result = extractMessageImages(message);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('file-shared');
  });

  it('returns empty array when message has no images', () => {
    const message: ChatMessage = {
      id: 'msg-5',
      role: 'user',
      timestamp: new Date(),
      content: 'Just plain text with no images',
    };

    expect(extractMessageImages(message)).toEqual([]);
  });
});
