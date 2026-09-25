const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/';
const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

export const audioCompressionWorkerCode = `
const resolvedBaseUrl = (typeof location !== 'undefined' && location.origin)
  ? new URL(${JSON.stringify(normalizedBase)}, location.origin).href
  : ${JSON.stringify(normalizedBase)};
importScripts(new URL('lame.min.js', resolvedBaseUrl).href);

self.onmessage = function(event) {
    try {
        const { pcmData, sampleRate, kbps } = event.data;

        const samples = new Int16Array(pcmData.length);
        for (let sampleIndex = 0; sampleIndex < pcmData.length; sampleIndex++) {
            const clampedSample = Math.max(-1, Math.min(1, pcmData[sampleIndex]));
            samples[sampleIndex] = clampedSample < 0 ? clampedSample * 0x8000 : clampedSample * 0x7FFF;
        }

        if (typeof lamejs === 'undefined') {
            throw new Error('lamejs not loaded in worker');
        }

        const mp3Encoder = new lamejs.Mp3Encoder(1, sampleRate, kbps);
        const mp3Data = [];
        const sampleBlockSize = 1152;

        for (let sampleOffset = 0; sampleOffset < samples.length; sampleOffset += sampleBlockSize) {
            const chunk = samples.subarray(sampleOffset, sampleOffset + sampleBlockSize);
            const encodedChunk = mp3Encoder.encodeBuffer(chunk);
            if (encodedChunk.length > 0) {
                mp3Data.push(encodedChunk);
            }
        }

        const finalChunk = mp3Encoder.flush();
        if (finalChunk.length > 0) {
            mp3Data.push(finalChunk);
        }

        self.postMessage({ type: 'success', buffers: mp3Data });
    } catch (encodeError) {
        self.postMessage({ type: 'error', error: encodeError.message });
    }
};
`;
