import { getConfiguredApiClient } from '@/services/api/apiClient';
import { dbService } from '@/services/db/dbService';
import { blobToBase64 } from '@/utils/file/fileEncoding';

export const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-2';
export const EMBEDDING_DIMENSION = 768;

const resolveApiKey = async (apiKeyOverride?: string): Promise<string> => {
  if (apiKeyOverride && apiKeyOverride.trim().length > 0) {
    return apiKeyOverride.trim();
  }
  const settings = await dbService.getAppSettings();
  if (settings?.apiKey && settings.apiKey.trim().length > 0) {
    return settings.apiKey.trim();
  }
  throw new Error('API key is required for generating embeddings. Please configure it in settings.');
};

/**
 * Calculates cosine similarity between two numeric vectors.
 * Gemini Embedding 2 output dimensionality (e.g. 768) is auto-renormalized,
 * but calculating full cosine similarity ensures safety for any dimension or model.
 */
export const computeCosineSimilarity = (a: number[], b: number[]): number => {
  if (!a || !b || a.length === 0 || b.length === 0 || a.length !== b.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const valA = a[i];
    const valB = b[i];
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
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
  const apiKey = await resolveApiKey(apiKeyOverride);
  const client = await getConfiguredApiClient(apiKey);

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
  const apiKey = await resolveApiKey(apiKeyOverride);
  const client = await getConfiguredApiClient(apiKey);
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
  const apiKey = await resolveApiKey(apiKeyOverride);
  const client = await getConfiguredApiClient(apiKey);

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
