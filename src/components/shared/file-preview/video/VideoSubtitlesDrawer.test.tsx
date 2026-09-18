import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/render/providerRenderer';
import { fireEvent, act } from '@testing-library/react';
import { VideoSubtitlesDrawer } from './VideoSubtitlesDrawer';
import type { SubtitleCue } from '@/utils/video-subtitles/subtitleFormatter';
import * as subtitleFormatter from '@/utils/video-subtitles/subtitleFormatter';

vi.mock('@/utils/video-subtitles/subtitleFormatter', async () => {
  const actual = await vi.importActual<typeof subtitleFormatter>('@/utils/video-subtitles/subtitleFormatter');
  return {
    ...actual,
    downloadTextFile: vi.fn(),
  };
});

describe('VideoSubtitlesDrawer', () => {
  const renderer = setupTestRenderer({ providers: { language: 'zh' } });

  const mockCues: SubtitleCue[] = [
    {
      id: 1,
      startSeconds: 1.0,
      endSeconds: 3.5,
      startTimeSrt: '00:00:01,000',
      endTimeSrt: '00:00:03,500',
      startTimeVtt: '00:00:01.000',
      endTimeVtt: '00:00:03.500',
      text: '第一句字幕测试',
      speaker: 'spk_0',
    },
    {
      id: 2,
      startSeconds: 4.0,
      endSeconds: 6.0,
      startTimeSrt: '00:00:04,000',
      endTimeSrt: '00:00:06,000',
      startTimeVtt: '00:00:04.000',
      endTimeVtt: '00:00:06.000',
      text: '第二句字幕测试',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when cues list is empty', () => {
    renderer.render(
      <VideoSubtitlesDrawer cues={[]} currentTime={0} onSeek={vi.fn()} onClose={vi.fn()} videoFileName="test.mp4" />,
    );

    expect(renderer.container.textContent).toContain('暂无字幕');
  });

  it('renders all cues with timestamps and speaker badge', () => {
    renderer.render(
      <VideoSubtitlesDrawer
        cues={mockCues}
        currentTime={0}
        onSeek={vi.fn()}
        onClose={vi.fn()}
        videoFileName="test.mp4"
      />,
    );

    expect(renderer.container.textContent).toContain('第一句字幕测试');
    expect(renderer.container.textContent).toContain('第二句字幕测试');
    expect(renderer.container.textContent).toContain('spk_0');
  });

  it('highlights the active cue based on currentTime', () => {
    renderer.render(
      <VideoSubtitlesDrawer
        cues={mockCues}
        currentTime={2.0} // Falls within cue 1 (1.0 - 3.5)
        onSeek={vi.fn()}
        onClose={vi.fn()}
        videoFileName="test.mp4"
      />,
    );

    const cueElements = renderer.container.querySelectorAll('[data-testid="subtitle-cue-item"]');
    expect(cueElements).toHaveLength(2);
    expect(cueElements[0].getAttribute('data-active')).toBe('true');
    expect(cueElements[1].getAttribute('data-active')).toBe('false');
  });

  it('calls onSeek when a cue item is clicked', () => {
    const onSeekMock = vi.fn();
    renderer.render(
      <VideoSubtitlesDrawer
        cues={mockCues}
        currentTime={0}
        onSeek={onSeekMock}
        onClose={vi.fn()}
        videoFileName="test.mp4"
      />,
    );

    const cueElements = renderer.container.querySelectorAll('[data-testid="subtitle-cue-item"]');
    fireEvent.click(cueElements[1]);

    expect(onSeekMock).toHaveBeenCalledWith(4.0);
  });

  it('calls onClose when close button is clicked', () => {
    const onCloseMock = vi.fn();
    renderer.render(
      <VideoSubtitlesDrawer
        cues={mockCues}
        currentTime={0}
        onSeek={vi.fn()}
        onClose={onCloseMock}
        videoFileName="test.mp4"
      />,
    );

    const closeBtn = renderer.container.querySelector('button[aria-label="关闭"]')!;
    expect(closeBtn).not.toBeNull();
    fireEvent.click(closeBtn);

    expect(onCloseMock).toHaveBeenCalledTimes(1);
  });

  it('triggers download for SRT and VTT formats', () => {
    renderer.render(
      <VideoSubtitlesDrawer
        cues={mockCues}
        currentTime={0}
        onSeek={vi.fn()}
        onClose={vi.fn()}
        videoFileName="sample-video.mp4"
      />,
    );

    const srtBtn = renderer.container.querySelector('button[data-testid="download-srt-btn"]')!;
    const vttBtn = renderer.container.querySelector('button[data-testid="download-vtt-btn"]')!;

    expect(srtBtn).not.toBeNull();
    expect(vttBtn).not.toBeNull();

    fireEvent.click(srtBtn);
    expect(subtitleFormatter.downloadTextFile).toHaveBeenCalledWith(
      'sample-video.srt',
      expect.stringContaining('第一句字幕测试'),
      'text/plain;charset=utf-8',
    );

    fireEvent.click(vttBtn);
    expect(subtitleFormatter.downloadTextFile).toHaveBeenCalledWith(
      'sample-video.vtt',
      expect.stringContaining('WEBVTT'),
      'text/vtt;charset=utf-8',
    );
  });

  it('copies plain subtitle text to clipboard', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    renderer.render(
      <VideoSubtitlesDrawer
        cues={mockCues}
        currentTime={0}
        onSeek={vi.fn()}
        onClose={vi.fn()}
        videoFileName="sample-video.mp4"
      />,
    );

    const copyBtn = renderer.container.querySelector('button[data-testid="copy-subtitles-btn"]')!;
    expect(copyBtn).not.toBeNull();

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('第一句字幕测试\n第二句字幕测试'));
  });

  it('filters cues based on search input query', () => {
    renderer.render(
      <VideoSubtitlesDrawer
        cues={mockCues}
        currentTime={0}
        onSeek={vi.fn()}
        onClose={vi.fn()}
        videoFileName="sample-video.mp4"
      />,
    );

    const searchInput = renderer.container.querySelector('input[type="text"]')!;
    expect(searchInput).not.toBeNull();

    fireEvent.change(searchInput, { target: { value: '第二句' } });

    const cueElements = renderer.container.querySelectorAll('[data-testid="subtitle-cue-item"]');
    expect(cueElements).toHaveLength(1);
    expect(cueElements[0].textContent).toContain('第二句字幕测试');
  });
});
