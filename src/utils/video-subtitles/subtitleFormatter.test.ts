import { describe, expect, it, vi } from 'vitest';
import {
  downloadTextFile,
  formatTimestampSrt,
  formatTimestampVtt,
  generateSrtContent,
  generateVttContent,
  groupWordsIntoCues,
  parseOffsetSeconds,
  type WordAnnotation,
} from './subtitleFormatter';

describe('subtitleFormatter', () => {
  describe('parseOffsetSeconds', () => {
    it('parses offset strings like "1.250s" into float seconds', () => {
      expect(parseOffsetSeconds('1.250s')).toBe(1.25);
      expect(parseOffsetSeconds('0.100s')).toBe(0.1);
      expect(parseOffsetSeconds('15s')).toBe(15);
      expect(parseOffsetSeconds('0s')).toBe(0);
      expect(parseOffsetSeconds('invalid')).toBe(0);
    });
  });

  describe('formatTimestampSrt and formatTimestampVtt', () => {
    it('formats seconds into HH:MM:SS,mmm for SRT', () => {
      expect(formatTimestampSrt(1.25)).toBe('00:00:01,250');
      expect(formatTimestampSrt(65.5)).toBe('00:01:05,500');
      expect(formatTimestampSrt(3661.123)).toBe('01:01:01,123');
    });

    it('formats seconds into HH:MM:SS.mmm for VTT', () => {
      expect(formatTimestampVtt(1.25)).toBe('00:00:01.250');
      expect(formatTimestampVtt(65.5)).toBe('00:01:05.500');
      expect(formatTimestampVtt(3661.123)).toBe('01:01:01.123');
    });
  });

  describe('groupWordsIntoCues', () => {
    it('returns empty array when words input is empty', () => {
      expect(groupWordsIntoCues([])).toEqual([]);
    });

    it('groups continuous words into a single cue', () => {
      const words: WordAnnotation[] = [
        { text: 'Hello', start_offset: '1.000s', end_offset: '1.400s' },
        { text: 'world', start_offset: '1.450s', end_offset: '1.900s' },
      ];

      const cues = groupWordsIntoCues(words);
      expect(cues).toHaveLength(1);
      expect(cues[0].id).toBe(1);
      expect(cues[0].startSeconds).toBe(1.0);
      expect(cues[0].endSeconds).toBe(1.9);
      expect(cues[0].text).toBe('Hello world');
      expect(cues[0].startTimeSrt).toBe('00:00:01,000');
      expect(cues[0].endTimeSrt).toBe('00:00:01,900');
      expect(cues[0].startTimeVtt).toBe('00:00:01.000');
      expect(cues[0].endTimeVtt).toBe('00:00:01.900');
    });

    it('breaks into a new cue on silence pause gap > 0.45s', () => {
      const words: WordAnnotation[] = [
        { text: 'First', start_offset: '1.000s', end_offset: '1.500s' },
        // gap of 0.600s between 1.500s and 2.100s
        { text: 'Second', start_offset: '2.100s', end_offset: '2.600s' },
      ];

      const cues = groupWordsIntoCues(words);
      expect(cues).toHaveLength(2);
      expect(cues[0].text).toBe('First');
      expect(cues[1].text).toBe('Second');
    });

    it('breaks on sentence-ending punctuation', () => {
      const words: WordAnnotation[] = [
        { text: 'Done.', start_offset: '1.000s', end_offset: '1.300s' },
        { text: 'Next', start_offset: '1.400s', end_offset: '1.700s' },
      ];

      const cues = groupWordsIntoCues(words);
      expect(cues).toHaveLength(2);
      expect(cues[0].text).toBe('Done.');
      expect(cues[1].text).toBe('Next');
    });

    it('breaks when speaker changes', () => {
      const words: WordAnnotation[] = [
        { text: 'Hi', speaker: 'spk_1', start_offset: '1.000s', end_offset: '1.300s' },
        { text: 'there', speaker: 'spk_2', start_offset: '1.400s', end_offset: '1.700s' },
      ];

      const cues = groupWordsIntoCues(words);
      expect(cues).toHaveLength(2);
      expect(cues[0].speaker).toBe('spk_1');
      expect(cues[1].speaker).toBe('spk_2');
    });
  });

  describe('generateSrtContent and generateVttContent', () => {
    const sampleCues = [
      {
        id: 1,
        startSeconds: 1.0,
        endSeconds: 2.5,
        startTimeSrt: '00:00:01,000',
        endTimeSrt: '00:00:02,500',
        startTimeVtt: '00:00:01.000',
        endTimeVtt: '00:00:02.500',
        text: 'Hello world.',
      },
      {
        id: 2,
        startSeconds: 3.0,
        endSeconds: 4.5,
        startTimeSrt: '00:00:03,000',
        endTimeSrt: '00:00:04,500',
        startTimeVtt: '00:00:03.000',
        endTimeVtt: '00:00:04.500',
        text: 'How are you?',
      },
    ];

    it('generates standard SRT format', () => {
      const srt = generateSrtContent(sampleCues);
      expect(srt).toContain('1\n00:00:01,000 --> 00:00:02,500\nHello world.');
      expect(srt).toContain('2\n00:00:03,000 --> 00:00:04,500\nHow are you?');
    });

    it('generates standard WebVTT format', () => {
      const vtt = generateVttContent(sampleCues);
      expect(vtt.startsWith('WEBVTT')).toBe(true);
      expect(vtt).toContain('00:00:01.000 --> 00:00:02.500\nHello world.');
      expect(vtt).toContain('00:00:03.000 --> 00:00:04.500\nHow are you?');
    });
  });

  describe('downloadTextFile', () => {
    it('creates an anchor element and simulates download', () => {
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      downloadTextFile('test.srt', 'sample content', 'text/plain');

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalled();

      clickSpy.mockRestore();
    });
  });
});
