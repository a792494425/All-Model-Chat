import { describe, expect, it } from 'vitest';
import { getModelSpecification } from './modelSpecifications';
import type { ModelOption } from '@/types';

describe('modelSpecifications', () => {
  it('resolves specifications for Gemini 3.1 Pro text model', () => {
    const model: ModelOption = {
      id: 'gemini-3.1-pro-preview',
      name: 'Gemini 3.1 Pro Preview',
    };

    const spec = getModelSpecification(model);
    expect(spec.providerDisplayName).toBe('Google Gemini');
    expect(spec.contextWindow).toContain('2M');
    expect(spec.maxOutput).toContain('64K');
    expect(spec.isReasoning).toBe(true);
    expect(spec.isMultimodalVision).toBe(true);
    expect(spec.isToolSupported).toBe(true);
    expect(spec.capabilities.some((c) => c.id === 'reasoning')).toBe(true);
    expect(spec.capabilities.some((c) => c.id === 'vision')).toBe(true);
    expect(spec.capabilities.some((c) => c.id === 'tools')).toBe(true);
  });

  it('resolves specifications for Gemini 3.8 Flash', () => {
    const model: ModelOption = {
      id: 'gemini-3.8-flash',
      name: 'Gemini 3.8 Flash',
    };

    const spec = getModelSpecification(model);
    expect(spec.contextWindow).toContain('1M');
    expect(spec.isReasoning).toBe(true);
    expect(spec.capabilities.some((c) => c.id === 'reasoning')).toBe(true);
  });

  it('resolves specifications for Claude 3.7 Sonnet', () => {
    const model: ModelOption = {
      id: 'claude-3-7-sonnet-20250219',
      name: 'Claude 3.7 Sonnet',
      templateId: 'anthropic',
    };

    const spec = getModelSpecification(model);
    expect(spec.providerDisplayName).toBe('Anthropic');
    expect(spec.contextWindow).toContain('200K');
    expect(spec.isReasoning).toBe(true);
    expect(spec.isMultimodalVision).toBe(true);
  });

  it('resolves specifications for DeepSeek R1', () => {
    const model: ModelOption = {
      id: 'deepseek-reasoner',
      name: 'DeepSeek R1',
      templateId: 'deepseek',
    };

    const spec = getModelSpecification(model);
    expect(spec.providerDisplayName).toBe('DeepSeek');
    expect(spec.isReasoning).toBe(true);
    expect(spec.capabilities.some((c) => c.id === 'reasoning')).toBe(true);
  });

  it('resolves custom provider connection names', () => {
    const model: ModelOption = {
      id: 'custom-gpt-4o',
      name: 'Company GPT-4o',
      connectionName: 'Enterprise Gateway',
    };

    const spec = getModelSpecification(model);
    expect(spec.providerDisplayName).toBe('Enterprise Gateway');
  });
});
