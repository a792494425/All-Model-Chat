import type { File as GeminiFile } from '@google/genai';
import { uploadFileApi, deleteFileApi } from '@/services/api/fileApi';
import { getConfiguredApiClient, getConfiguredApiClientContext } from '@/services/api/apiClient';
import { logService } from '@/services/logService';
import type { WordAnnotation } from './subtitleFormatter';

export type { WordAnnotation };

export interface TranscribeProgressCallback {
  (phase: 'uploading' | 'transcribing', progressPercent?: number): void;
}

/**
 * Extracts word-level annotations from Gemini 3.5 Transcribe response payload.
 */
export function extractWordAnnotations(data: any): WordAnnotation[] {
  const words: WordAnnotation[] = [];
  const steps = Array.isArray(data?.steps) ? data.steps : [];

  for (const step of steps) {
    const contents = Array.isArray(step?.content) ? step.content : [];
    for (const content of contents) {
      const annotations = Array.isArray(content?.annotations) ? content.annotations : [];
      for (const annotation of annotations) {
        if (annotation && (annotation.type === 'word_info' || annotation.start_offset !== undefined)) {
          words.push({
            text: String(annotation.text || ''),
            start_offset: String(annotation.start_offset || '0s'),
            end_offset: String(annotation.end_offset || '0s'),
            speaker: annotation.speaker ? String(annotation.speaker) : undefined,
          });
        }
      }
    }
  }

  return words;
}

/**
 * Transcribes audio using Gemini 3.5 Transcribe model (`gemini-3.5-transcribe`).
 * Uploads audioBlob to Gemini Files API, calls interactions.create,
 * and cleans up the temporary file on completion.
 */
export async function transcribeAudioWithGemini(
  apiKey: string,
  audioBlob: Blob,
  fileName: string,
  signal: AbortSignal,
  onProgress?: TranscribeProgressCallback,
): Promise<WordAnnotation[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API key is required for video subtitle transcription.');
  }

  if (signal?.aborted) {
    throw new DOMException('Transcription was aborted by user.', 'AbortError');
  }

  const audioMimeType = audioBlob.type || 'audio/wav';
  const audioFile = new File([audioBlob], fileName, { type: audioMimeType });

  let uploadedFile: GeminiFile | null = null;

  try {
    // 1. Upload audio to Gemini Files API
    logService.info(`[VideoSubtitles] Uploading extracted audio (${audioFile.size} bytes) for transcription`);
    uploadedFile = await uploadFileApi(apiKey, audioFile, audioMimeType, fileName, signal, (loaded, total) => {
      const percent = total > 0 ? Math.round((loaded / total) * 100) : undefined;
      onProgress?.('uploading', percent);
    });

    if (signal?.aborted) {
      throw new DOMException('Transcription was aborted by user.', 'AbortError');
    }

    onProgress?.('transcribing');
    logService.info(`[VideoSubtitles] Requesting gemini-3.5-transcribe for ${uploadedFile.uri}`);

    const interactionPayload = {
      model: 'gemini-3.5-transcribe',
      input: [
        {
          type: 'audio',
          uri: uploadedFile.uri,
          mime_type: audioMimeType,
        },
      ],
      generation_config: {
        transcription_config: {
          mode: {
            type: 'verbatim',
            timestamp_granularities: ['word'],
          },
        },
      },
    };

    let interactionResult: any = null;

    const ai = await getConfiguredApiClient(apiKey);
    if (ai?.interactions && typeof ai.interactions.create === 'function') {
      interactionResult = await ai.interactions.create(interactionPayload as any, { fetchOptions: { signal } } as any);
    } else {
      // Fallback to REST call if SDK interactions is not available
      const clientContext = await getConfiguredApiClientContext(apiKey);
      const apiBaseUrl = clientContext?.apiBaseUrl;
      const proxyBaseUrl = clientContext?.proxyBaseUrl;
      const baseUrl = (proxyBaseUrl || apiBaseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
      const url = `${baseUrl}/v1beta/interactions`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(interactionPayload),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Gemini Transcribe API call failed (${response.status}): ${errText}`);
      }

      interactionResult = await response.json();
    }

    const annotations = extractWordAnnotations(interactionResult);
    logService.info(`[VideoSubtitles] Transcription succeeded with ${annotations.length} word annotations`);
    return annotations;
  } catch (error) {
    logService.error('[VideoSubtitles] Transcription failed:', error);
    throw error;
  } finally {
    // Clean up temporary audio file from Gemini Files storage
    if (uploadedFile?.name) {
      try {
        await deleteFileApi(apiKey, uploadedFile.name);
        logService.info(`[VideoSubtitles] Cleaned up temporary audio file: ${uploadedFile.name}`);
      } catch (cleanupError) {
        logService.warn(`[VideoSubtitles] Failed to clean up temporary audio file: ${uploadedFile.name}`, cleanupError);
      }
    }
  }
}
