import type { CatalogModelSpec } from './types';

export const DEEPSEEK_MODELS: Record<string, CatalogModelSpec> = {
  'deepseek-chat': {
    id: 'deepseek-chat',
    name: 'DeepSeek V3',
    contextWindow: 64_000,
    maxOutputTokens: 8_192,
    capabilities: { vision: false, thinking: false, tools: true },
    ownedBy: 'deepseek',
  },
  'deepseek-v3': {
    id: 'deepseek-v3',
    name: 'DeepSeek V3',
    contextWindow: 64_000,
    maxOutputTokens: 8_192,
    capabilities: { vision: false, thinking: false, tools: true },
    ownedBy: 'deepseek',
  },
  'deepseek-reasoner': {
    id: 'deepseek-reasoner',
    name: 'DeepSeek R1',
    contextWindow: 64_000,
    maxOutputTokens: 8_192,
    capabilities: { vision: false, thinking: true, tools: false },
    ownedBy: 'deepseek',
  },
  'deepseek-r1': {
    id: 'deepseek-r1',
    name: 'DeepSeek R1',
    contextWindow: 64_000,
    maxOutputTokens: 8_192,
    capabilities: { vision: false, thinking: true, tools: false },
    ownedBy: 'deepseek',
  },
};
