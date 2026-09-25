import { getConfiguredApiClient } from '@/services/api/apiClient';
import { dbService } from '@/services/db/dbService';
import { parseApiKeys } from '@/utils/api/apiKeySelection';
import { blobToBase64 } from '@/utils/file/fileEncoding';

export const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-2';
export const EMBEDDING_DIMENSION = 768;

interface ResolvedEmbeddingApiKey {
  apiKey: string;
  isDirectGoogleApi?: boolean;
}

const resolveApiKey = async (apiKeyOverride?: string): Promise<ResolvedEmbeddingApiKey> => {
  if (apiKeyOverride && apiKeyOverride.trim().length > 0) {
    return { apiKey: apiKeyOverride.trim() };
  }
  const settings = await dbService.getAppSettings();
  if (settings?.embeddingApiKey && settings.embeddingApiKey.trim().length > 0) {
    const keys = parseApiKeys(settings.embeddingApiKey);
    if (keys.length > 0) {
      return {
        apiKey: keys[0],
        isDirectGoogleApi: true,
      };
    }
  }
  if (settings?.apiKey && settings.apiKey.trim().length > 0) {
    const keys = parseApiKeys(settings.apiKey);
    if (keys.length > 0) {
      return { apiKey: keys[0] };
    }
  }
  throw new Error('API key is required for generating embeddings. Please configure it in settings.');
};

/**
 * Checks whether an API key for embedding generation is configured (either dedicated or standard).
 */
export const hasConfiguredApiKey = async (): Promise<boolean> => {
  try {
    const settings = await dbService.getAppSettings();
    if (settings?.embeddingApiKey && settings.embeddingApiKey.trim().length > 0) {
      return parseApiKeys(settings.embeddingApiKey).length > 0;
    }
    if (settings?.apiKey && settings.apiKey.trim().length > 0) {
      return parseApiKeys(settings.apiKey).length > 0;
    }
    return false;
  } catch {
    return false;
  }
};

const getEmbeddingClient = async (resolved: ResolvedEmbeddingApiKey) => {
  if (resolved.isDirectGoogleApi) {
    return getConfiguredApiClient(resolved.apiKey, undefined, { directGoogleApi: true });
  }
  return getConfiguredApiClient(resolved.apiKey);
};

/**
 * Calculates cosine similarity between two numeric vectors.
 * Gemini Embedding 2 output dimensionality (e.g. 768) is auto-renormalized,
 * but calculating full cosine similarity ensures safety for any dimension or model.
 */
export const computeCosineSimilarity = (vectorA: number[], vectorB: number[]): number => {
  if (!vectorA || !vectorB || vectorA.length === 0 || vectorB.length === 0 || vectorA.length !== vectorB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let index = 0; index < vectorA.length; index++) {
    const valueA = vectorA[index];
    const valueB = vectorB[index];
    dotProduct += valueA * valueB;
    normA += valueA * valueA;
    normB += valueB * valueB;
  }

  if (normA <= 0 || normB <= 0) {
    return 0;
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Clamp within [-1, 1] against precision artifacts
  return Math.max(-1, Math.min(1, similarity));
};

/**
 * Generates an asymmetric search query embedding for text retrieval using gemini-embedding-2.
 * Recommended structure: "task: search result | query: ${query}"
 */
export const generateQueryEmbedding = async (
  query: string,
  apiKeyOverride?: string,
  modelName: string = DEFAULT_EMBEDDING_MODEL,
): Promise<number[]> => {
  const resolvedKey = await resolveApiKey(apiKeyOverride);
  const client = await getEmbeddingClient(resolvedKey);

  const formattedQuery = `task: search result | query: ${query.trim()}`;
  const response = await client.models.embedContent({
    model: modelName,
    contents: formattedQuery,
    config: {
      outputDimensionality: EMBEDDING_DIMENSION,
    },
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error('No embedding returned from Gemini API for query.');
  }

  return embedding;
};

/**
 * Generates an embedding for multimodal media (image, audio, video, pdf).
 * For multimodal single media items, the Gemini docs recommend passing inlineData directly without task prefix.
 */
export const generateMediaEmbedding = async (
  blob: Blob,
  mimeType: string,
  apiKeyOverride?: string,
  modelName: string = DEFAULT_EMBEDDING_MODEL,
): Promise<number[]> => {
  const resolvedKey = await resolveApiKey(apiKeyOverride);
  const client = await getEmbeddingClient(resolvedKey);
  const base64Data = await blobToBase64(blob);

  const response = await client.models.embedContent({
    model: modelName,
    contents: [
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ],
    config: {
      outputDimensionality: EMBEDDING_DIMENSION,
    },
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error(`No embedding returned from Gemini API for media (${mimeType}).`);
  }

  return embedding;
};

/**
 * Generates an embedding for a document or text content.
 * Follows asymmetric retrieval format: "title: ${title} | text: ${text}"
 */
export const generateDocumentEmbedding = async (
  title: string,
  text: string,
  apiKeyOverride?: string,
  modelName: string = DEFAULT_EMBEDDING_MODEL,
): Promise<number[]> => {
  const resolvedKey = await resolveApiKey(apiKeyOverride);
  const client = await getEmbeddingClient(resolvedKey);

  const safeTitle = title?.trim() ? title.trim() : 'none';
  const formattedDoc = `title: ${safeTitle} | text: ${text}`;

  const response = await client.models.embedContent({
    model: modelName,
    contents: formattedDoc,
    config: {
      outputDimensionality: EMBEDDING_DIMENSION,
    },
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error('No embedding returned from Gemini API for document.');
  }

  return embedding;
};

/**
 * Generates an aggregated embedding for a multimodal query combining text and an image.
 * As per Gemini Embedding 2 specification, text combined with media should NOT have
 * task prefixes, and is passed in an aggregated contents array [text, inlineData].
 */
export const generateMultimodalQueryEmbedding = async (
  query: string,
  imageBlob: Blob,
  mimeType: string,
  apiKeyOverride?: string,
  modelName: string = DEFAULT_EMBEDDING_MODEL,
): Promise<number[]> => {
  const resolvedKey = await resolveApiKey(apiKeyOverride);
  const client = await getEmbeddingClient(resolvedKey);
  const base64Data = await blobToBase64(imageBlob);

  const response = await client.models.embedContent({
    model: modelName,
    contents: [
      query.trim(),
      {
        inlineData: {
          mimeType,
          data: base64Data,
        },
      },
    ],
    config: {
      outputDimensionality: EMBEDDING_DIMENSION,
    },
  });

  const embedding = response.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error('No embedding returned from Gemini API for multimodal query.');
  }

  return embedding;
};
