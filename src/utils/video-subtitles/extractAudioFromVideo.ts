export interface AudioExtractionResult {
  audioBlob: Blob;
  durationSeconds: number;
}

/**
 * Extracts the audio track from a video File/Blob in the browser using Web Audio API,
 * downsamples to 16kHz mono, and encodes as a standard 16-bit PCM WAV Blob.
 */
export async function extractAudioFromVideo(videoBlob: Blob, signal?: AbortSignal): Promise<AudioExtractionResult> {
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('Web Audio API is not supported in this environment.');
  }

  const audioContext = new AudioContextClass();

  try {
    const arrayBuffer = await videoBlob.arrayBuffer();

    if (signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    if (signal?.aborted) {
      throw new DOMException('The operation was aborted.', 'AbortError');
    }

    if (!audioBuffer || audioBuffer.numberOfChannels === 0) {
      throw new Error('NO_AUDIO_TRACK: The provided video contains no audio track.');
    }

    // Downmix to mono if multi-channel
    const numChannels = audioBuffer.numberOfChannels;
    const originalLength = audioBuffer.length;
    const monoData = new Float32Array(originalLength);

    for (let channelIndex = 0; channelIndex < numChannels; channelIndex++) {
      const channelData = audioBuffer.getChannelData(channelIndex);
      for (let sampleIndex = 0; sampleIndex < originalLength; sampleIndex++) {
        monoData[sampleIndex] += channelData[sampleIndex] / numChannels;
      }
    }

    // Resample to 16kHz (speech standard)
    const targetSampleRate = 16000;
    const originalSampleRate = audioBuffer.sampleRate;
    let resampledData: Float32Array;

    if (originalSampleRate === targetSampleRate) {
      resampledData = monoData;
    } else {
      const ratio = originalSampleRate / targetSampleRate;
      const newLength = Math.round(originalLength / ratio);
      resampledData = new Float32Array(newLength);

      for (let sampleIndex = 0; sampleIndex < newLength; sampleIndex++) {
        const originIndex = sampleIndex * ratio;
        const leftIndex = Math.floor(originIndex);
        const rightIndex = Math.min(leftIndex + 1, originalLength - 1);
        const fraction = originIndex - leftIndex;
        resampledData[sampleIndex] = monoData[leftIndex] * (1 - fraction) + monoData[rightIndex] * fraction;
      }
    }

    // Encode to 16-bit PCM WAV
    const wavBuffer = encodeWav(resampledData, targetSampleRate);
    const audioBlob = new Blob([wavBuffer], { type: 'audio/wav' });

    return {
      audioBlob,
      durationSeconds: audioBuffer.duration,
    };
  } finally {
    if (typeof audioContext.close === 'function') {
      await audioContext.close().catch(() => {});
    }
  }
}

/**
 * Encodes Float32 mono audio samples into a standard 44-byte WAV ArrayBuffer.
 */
function encodeWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF identifier
  writeAsciiString(view, 0, 'RIFF');
  // RIFF chunk length
  view.setUint32(4, 36 + dataSize, true);
  // RIFF type
  writeAsciiString(view, 8, 'WAVE');
  // format chunk identifier
  writeAsciiString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate
  view.setUint32(28, byteRate, true);
  // block align
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeAsciiString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataSize, true);

  // Write PCM 16-bit samples
  let offset = 44;
  for (let sampleIndex = 0; sampleIndex < samples.length; sampleIndex++, offset += 2) {
    const clampedSample = Math.max(-1, Math.min(1, samples[sampleIndex]));
    const pcmSample = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7fff;
    view.setInt16(offset, pcmSample, true);
  }

  return buffer;
}

function writeAsciiString(view: DataView, offset: number, text: string): void {
  for (let charIndex = 0; charIndex < text.length; charIndex++) {
    view.setUint8(offset + charIndex, text.charCodeAt(charIndex));
  }
}
