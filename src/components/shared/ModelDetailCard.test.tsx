import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModelDetailCard } from './ModelDetailCard';
import type { ModelOption } from '@/types';
import { I18nProvider } from '@/contexts/I18nContext';

describe('ModelDetailCard', () => {
  it('renders model details, specs, and capabilities for Gemini 3.1 Pro', () => {
    const model: ModelOption = {
      id: 'gemini-3.1-pro-preview',
      name: 'Gemini 3.1 Pro Preview',
    };

    render(
      <I18nProvider>
        <ModelDetailCard model={model} />
      </I18nProvider>,
    );

    expect(screen.getByText('Gemini 3.1 Pro Preview')).toBeInTheDocument();
    expect(screen.getByText('gemini-3.1-pro-preview')).toBeInTheDocument();
    expect(screen.getByText('Google Gemini')).toBeInTheDocument();
    expect(screen.getByText(/2M/)).toBeInTheDocument();
  });

  it('renders capabilities badges', () => {
    const model: ModelOption = {
      id: 'deepseek-reasoner',
      name: 'DeepSeek R1',
      templateId: 'deepseek',
    };

    render(
      <I18nProvider>
        <ModelDetailCard model={model} />
      </I18nProvider>,
    );

    expect(screen.getByText('DeepSeek R1')).toBeInTheDocument();
    expect(screen.getByText('DeepSeek')).toBeInTheDocument();
  });
});
