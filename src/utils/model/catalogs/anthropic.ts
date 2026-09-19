import type { CatalogModelSpec } from './types';

export const ANTHROPIC_MODELS: Record<string, CatalogModelSpec> = {
  'claude-3-7-sonnet': {
    id: 'claude-3-7-sonnet',
    name: 'Claude 3.7 Sonnet',
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    capabilities: { vision: true, thinking: true, tools: true },
    ownedBy: 'anthropic',
  },
  'claude-3-5-sonnet': {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    capabilities: { vision: true, thinking: false, tools: true },
    ownedBy: 'anthropic',
  },
  'claude-3-5-haiku': {
    id: 'claude-3-5-haiku',
    name: 'Claude 3.5 Haiku',
    contextWindow: 200_000,
    maxOutputTokens: 8_192,
    capabilities: { vision: false, thinking: false, tools: true },
    ownedBy: 'anthropic',
  },
  'claude-3-opus': {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus',
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    capabilities: { vision: true, thinking: false, tools: true },
    ownedBy: 'anthropic',
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    contextWindow: 200_000,
    maxOutputTokens: 4_096,
    capabilities: { vision: true, thinking: false, tools: true },
    ownedBy: 'anthropic',
  },
};
