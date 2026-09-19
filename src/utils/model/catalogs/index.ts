import type { CatalogModelSpec } from './types';
import { OPENAI_MODELS } from './openai';
import { ANTHROPIC_MODELS } from './anthropic';
import { DEEPSEEK_MODELS } from './deepseek';
import { DOMESTIC_MODELS } from './domestic';
import { OPENSOURCE_MODELS } from './opensource';
import { GOOGLE_MODELS } from './google';

export type { CatalogModelSpec };

export const KNOWN_MODELS_CATALOG: Record<string, CatalogModelSpec> = {
  ...OPENAI_MODELS,
  ...ANTHROPIC_MODELS,
  ...DEEPSEEK_MODELS,
  ...DOMESTIC_MODELS,
  ...OPENSOURCE_MODELS,
  ...GOOGLE_MODELS,
};
