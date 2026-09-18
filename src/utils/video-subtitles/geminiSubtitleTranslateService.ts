import { getConfiguredApiClient, getConfiguredApiClientContext } from '@/services/api/apiClient';
import { logService } from '@/services/logService';
import { DEFAULT_THOUGHT_TRANSLATION_MODEL_ID } from '@/constants/modelConfiguration';
import type { SubtitleCue } from './subtitleFormatter';

export interface TranslateSubtitlesOptions {
  targetLanguage?: string; // e.g. 'Chinese' | 'English'
  modelId?: string; // default: DEFAULT_THOUGHT_TRANSLATION_MODEL_ID ('gemini-3.5-flash-lite')
  signal?: AbortSignal;
  onProgress?: (progressPercent: number) => void;
}

interface TranslationItem {
  id: number;
  translation: string;
}

/**
 * Strips markdown code fences from JSON text if present.
 */
function cleanJsonText(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('```')) {
    return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  }
  return trimmed;
}

/**
 * Translates a list of SubtitleCues into the target language using Gemini.
 */
export async function translateSubtitlesWithGemini(
  apiKey: string,
  cues: SubtitleCue[],
  options?: TranslateSubtitlesOptions,
): Promise<SubtitleCue[]> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API key is required for subtitle translation.');
  }

  if (!cues || cues.length === 0) {
    return [];
  }

  const targetLanguage = options?.targetLanguage || 'Chinese';
  const modelId = options?.modelId || DEFAULT_THOUGHT_TRANSLATION_MODEL_ID;
  const signal = options?.signal;

  if (signal?.aborted) {
    throw new DOMException('Translation was aborted by user.', 'AbortError');
  }

  // Batch cues into chunks of 80 to prevent output length cutoffs on long transcripts
  const BATCH_SIZE = 80;
  const translationMap = new Map<number, string>();

  for (let i = 0; i < cues.length; i += BATCH_SIZE) {
    if (signal?.aborted) {
      throw new DOMException('Translation was aborted by user.', 'AbortError');
    }

    const batch = cues.slice(i, i + BATCH_SIZE);
    const inputItems = batch.map((c) => ({ id: c.id, text: c.text }));

    const prompt = `You are a professional audiovisual and video subtitle translator.
Translate the following video subtitle cues accurately and naturally into ${targetLanguage}.
Guidelines:
1. Translate line-by-line faithfully and idiomatically for spoken subtitle dialogue.
2. Keep the translation natural and concise so that it fits well on a video screen.
3. Return a JSON array matching each item's id and its translation:
[
  { "id": 1, "translation": "..." }
]

Cues to translate:
${JSON.stringify(inputItems, null, 2)}`;

    let responseText: string | null = null;

    // Try SDK generateContent first
    try {
      const ai = await getConfiguredApiClient(apiKey);
      if (ai?.models?.generateContent) {
        const res = await ai.models.generateContent({
          model: modelId,
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'ARRAY' as any,
              items: {
                type: 'OBJECT' as any,
                properties: {
                  id: { type: 'INTEGER' as any },
                  translation: { type: 'STRING' as any },
                },
                required: ['id', 'translation'],
              },
            },
            abortSignal: signal,
          } as any,
        });

        responseText = res?.text || null;
      }
    } catch (sdkError) {
      if (signal?.aborted) {
        throw new DOMException('Translation was aborted by user.', 'AbortError');
      }
      logService.warn('[VideoSubtitles] SDK translation failed, attempting REST generateContent:', sdkError);
    }

    // Fallback: direct REST call
    if (!responseText) {
      const clientContext = await getConfiguredApiClientContext(apiKey);
      const apiBaseUrl = clientContext?.apiBaseUrl;
      const proxyBaseUrl = clientContext?.proxyBaseUrl;
      const baseUrl = (proxyBaseUrl || apiBaseUrl || 'https://generativelanguage.googleapis.com').replace(/\/+$/, '');
      const url = `${baseUrl}/v1beta/models/${modelId}:generateContent`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
        signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        throw new Error(`Gemini translation API call failed (${response.status}): ${errText}`);
      }

      const resData = await response.json();
      responseText = resData?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    if (responseText) {
      try {
        const cleaned = cleanJsonText(responseText);
        const parsedItems: TranslationItem[] = JSON.parse(cleaned);
        if (Array.isArray(parsedItems)) {
          for (const item of parsedItems) {
            if (typeof item.id === 'number' && typeof item.translation === 'string') {
              translationMap.set(item.id, item.translation.trim());
            }
          }
        }
      } catch (parseErr) {
        logService.warn('[VideoSubtitles] Failed to parse translation JSON batch:', parseErr, responseText);
      }
    }

    if (options?.onProgress) {
      const currentDone = Math.min(cues.length, i + BATCH_SIZE);
      options.onProgress(Math.round((currentDone / cues.length) * 100));
    }
  }

  // Attach translations to cues
  return cues.map((cue) => {
    const translatedText = translationMap.get(cue.id);
    return {
      ...cue,
      translation: translatedText || cue.translation,
    };
  });
}
