import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchMediaSeekFromBridge } from './mediaNavBridgeDispatch';
import * as seekPdfModule from './seekPdf';
import * as seekVideoModule from './seekVideo';
import * as seekImageModule from './seekImage';

describe('dispatchMediaSeekFromBridge', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false for null or non-object payloads', () => {
    expect(dispatchMediaSeekFromBridge(null as any)).toBe(false);
    expect(dispatchMediaSeekFromBridge(undefined as any)).toBe(false);
  });

  it('dispatches PDF seek when kind is pdf or page is specified', () => {
    const seekPdfSpy = vi.spyOn(seekPdfModule, 'seekSessionPdf').mockReturnValue(true);

    const result = dispatchMediaSeekFromBridge(
      {
        kind: 'pdf',
        page: 3,
        doc: 'report.pdf',
        box2d: [100, 200, 300, 400],
        snippet: 'Summary',
      },
      { messageId: 'msg-123' },
    );

    expect(result).toBe(true);
    expect(seekPdfSpy).toHaveBeenCalledWith({
      pageNumber: 3,
      docName: 'report.pdf',
      box2d: [100, 200, 300, 400],
      point: undefined,
      snippet: 'Summary',
      messageId: 'msg-123',
    });
  });

  it('dispatches Video seek when kind is video or seconds is specified', () => {
    const seekVideoSpy = vi.spyOn(seekVideoModule, 'seekSessionVideo').mockReturnValue(true);

    const result = dispatchMediaSeekFromBridge(
      {
        kind: 'video',
        seconds: 145,
        doc: 'lesson.mp4',
        snippet: 'Key concept',
      },
      { messageId: 'msg-456' },
    );

    expect(result).toBe(true);
    expect(seekVideoSpy).toHaveBeenCalledWith({
      startSeconds: 145,
      videoName: 'lesson.mp4',
      kind: 'video',
      messageId: 'msg-456',
      annotation: {
        box2d: undefined,
        point: undefined,
        snippet: 'Key concept',
      },
    });
  });

  it('dispatches Audio seek when kind is audio', () => {
    const seekVideoSpy = vi.spyOn(seekVideoModule, 'seekSessionVideo').mockReturnValue(true);

    const result = dispatchMediaSeekFromBridge({
      kind: 'audio',
      seconds: 62,
      doc: 'podcast.mp3',
    });

    expect(result).toBe(true);
    expect(seekVideoSpy).toHaveBeenCalledWith({
      startSeconds: 62,
      videoName: 'podcast.mp3',
      kind: 'audio',
      messageId: undefined,
      annotation: undefined,
    });
  });

  it('dispatches Image seek when kind is image', () => {
    const seekImageSpy = vi.spyOn(seekImageModule, 'seekSessionImage').mockReturnValue(true);

    const result = dispatchMediaSeekFromBridge(
      {
        kind: 'image',
        doc: 'chart.png',
        box2d: [50, 60, 150, 160],
        snippet: 'Legend',
      },
      { messageId: 'msg-789' },
    );

    expect(result).toBe(true);
    expect(seekImageSpy).toHaveBeenCalledWith({
      fileName: 'chart.png',
      box2d: [50, 60, 150, 160],
      point: undefined,
      snippet: 'Legend',
      messageId: 'msg-789',
    });
  });

  it('dispatches Image seek with arrow and label attributes', () => {
    const seekImageSpy = vi.spyOn(seekImageModule, 'seekSessionImage').mockReturnValue(true);

    const result = dispatchMediaSeekFromBridge(
      {
        kind: 'image',
        doc: 'diagram.png',
        point: [320, 480],
        arrow: 'top-left',
        label: 'Action Button',
        snippet: 'Click here',
      },
      { messageId: 'msg-999' },
    );

    expect(result).toBe(true);
    expect(seekImageSpy).toHaveBeenCalledWith({
      fileName: 'diagram.png',
      box2d: undefined,
      point: [320, 480],
      arrow: 'top-left',
      label: 'Action Button',
      snippet: 'Click here',
      messageId: 'msg-999',
    });
  });

  it('returns false when no valid media target is identifiable', () => {
    expect(dispatchMediaSeekFromBridge({})).toBe(false);
  });
});
