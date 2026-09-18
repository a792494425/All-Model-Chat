import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extractAudioFromVideo } from './extractAudioFromVideo';

describe('extractAudioFromVideo', () => {
  const originalAudioContext = window.AudioContext;
  const originalWebkitAudioContext = (window as unknown as { webkitAudioContext?: typeof AudioContext })
    .webkitAudioContext;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    window.AudioContext = originalAudioContext;
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext = originalWebkitAudioContext;
  });

  it('extracts audio and encodes to standard 16kHz mono WAV Blob', async () => {
    // Mock decoded AudioBuffer: 1 channel, 44100Hz, 1 second duration
    const sampleRate = 44100;
    const channelData = new Float32Array(sampleRate);
    for (let i = 0; i < sampleRate; i++) {
      channelData[i] = Math.sin((i / sampleRate) * 2 * Math.PI * 440); // 440Hz sine wave
    }

    const mockAudioBuffer = {
      numberOfChannels: 1,
      sampleRate,
      duration: 1.0,
      length: sampleRate,
      getChannelData: vi.fn().mockReturnValue(channelData),
    };

    const mockDecodeAudioData = vi.fn().mockResolvedValue(mockAudioBuffer);
    const mockClose = vi.fn().mockResolvedValue(undefined);

    class MockAudioContext {
      decodeAudioData = mockDecodeAudioData;
      close = mockClose;
    }

    window.AudioContext = MockAudioContext as unknown as typeof AudioContext;

    const fakeVideoBlob = new Blob([new Uint8Array([0, 1, 2, 3])], { type: 'video/mp4' });
    const result = await extractAudioFromVideo(fakeVideoBlob);

    expect(result).toBeDefined();
    expect(result.durationSeconds).toBeCloseTo(1.0, 1);
    expect(result.audioBlob).toBeInstanceOf(Blob);
    expect(result.audioBlob.type).toBe('audio/wav');
    expect(result.audioBlob.size).toBeGreaterThan(44); // WAV header is 44 bytes

    // Verify WAV header RIFF and WAVE signatures
    const buffer = await result.audioBlob.arrayBuffer();
    const view = new DataView(buffer);
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    expect(riff).toBe('RIFF');
    expect(wave).toBe('WAVE');

    expect(mockClose).toHaveBeenCalled();
  });

  it('throws NO_AUDIO_TRACK error if video has 0 channels', async () => {
    const mockAudioBuffer = {
      numberOfChannels: 0,
      sampleRate: 44100,
      duration: 1.0,
      length: 44100,
      getChannelData: vi.fn(),
    };

    class MockAudioContext {
      decodeAudioData = vi.fn().mockResolvedValue(mockAudioBuffer);
      close = vi.fn().mockResolvedValue(undefined);
    }

    window.AudioContext = MockAudioContext as unknown as typeof AudioContext;

    const fakeVideoBlob = new Blob([new Uint8Array([0])], { type: 'video/mp4' });
    await expect(extractAudioFromVideo(fakeVideoBlob)).rejects.toThrow('NO_AUDIO_TRACK');
  });

  it('throws when aborted via AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort();

    const fakeVideoBlob = new Blob([new Uint8Array([0])], { type: 'video/mp4' });
    await expect(extractAudioFromVideo(fakeVideoBlob, controller.signal)).rejects.toThrow();
  });
});
