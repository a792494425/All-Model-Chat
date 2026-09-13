/**
 * Strips the Gemini API `models/` prefix and lowercases the model ID.
 * For general multi-provider catalog normalization, see `knownModelsCatalog.ts`.
 */
export const normalizeModelId = (modelId: string): string => modelId.toLowerCase().replace(/^models\//, '');
