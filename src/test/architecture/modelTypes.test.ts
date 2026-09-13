import { describe, it, expect } from 'vitest';
import type { ModelOption, ModelParameters } from '@/types';

describe('ModelOption & ModelParameters types', () => {
  it('supports advanced parameters and metadata', () => {
    const params: ModelParameters = {
      temperature: 0.7,
      maxOutputTokens: 4096,
      topP: 0.9,
      topK: 40,
      presencePenalty: 0.5,
      frequencyPenalty: 0.5,
      stopSequences: ['<|end|>'],
      seed: 42,
      reasoningEffort: 'high',
      thinkingBudget: 8192,
    };

    const model: ModelOption = {
      id: 'custom-model',
      name: 'Custom Model',
      isPinned: true,
      contextWindow: 128000,
      capabilities: {
        vision: true,
        tools: true,
        thinking: true,
      },
      parameters: params,
    };

    expect(model.isPinned).toBe(true);
    expect(model.contextWindow).toBe(128000);
    expect(model.parameters?.reasoningEffort).toBe('high');
    expect(model.parameters?.thinkingBudget).toBe(8192);
    expect(model.parameters?.topK).toBe(40);
    expect(model.parameters?.presencePenalty).toBe(0.5);
    expect(model.parameters?.frequencyPenalty).toBe(0.5);
    expect(model.parameters?.stopSequences).toEqual(['<|end|>']);
    expect(model.parameters?.seed).toBe(42);
  });
});
