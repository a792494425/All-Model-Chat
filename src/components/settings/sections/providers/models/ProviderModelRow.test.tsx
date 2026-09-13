import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProviderModelRow } from './ProviderModelRow';
import { useSettingsStore } from '@/stores/settingsStore';
import type { ModelOption } from '@/types';

const mockModel: ModelOption = {
  id: 'gpt-4o',
  name: 'GPT-4o',
  capabilities: {
    free: true,
    thinking: true,
    vision: true,
    image: true,
    audio: true,
  },
};

describe('ProviderModelRow', () => {
  it('renders capability badges in English when language is en', () => {
    useSettingsStore.setState({ language: 'en' });

    render(
      <ProviderModelRow
        model={mockModel}
        isSelected={false}
        isBatchMode={false}
        onToggleSelect={vi.fn()}
        onToggleVisible={vi.fn()}
        onToggleThinking={vi.fn()}
        onToggleTools={vi.fn()}
        onProbeSingle={vi.fn()}
        isProbing={false}
        onOpenConfig={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Thinking')).toBeInTheDocument();
    expect(screen.getByText('Vision')).toBeInTheDocument();
    expect(screen.getByText('Image')).toBeInTheDocument();
    expect(screen.getByText('Audio')).toBeInTheDocument();
  });

  it('renders capability badges in Chinese when language is zh', () => {
    useSettingsStore.setState({ language: 'zh' });

    render(
      <ProviderModelRow
        model={mockModel}
        isSelected={false}
        isBatchMode={false}
        onToggleSelect={vi.fn()}
        onToggleVisible={vi.fn()}
        onToggleThinking={vi.fn()}
        onToggleTools={vi.fn()}
        onProbeSingle={vi.fn()}
        isProbing={false}
        onOpenConfig={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('免费')).toBeInTheDocument();
    expect(screen.getByText('思考')).toBeInTheDocument();
    expect(screen.getByText('视觉')).toBeInTheDocument();
    expect(screen.getByText('生图')).toBeInTheDocument();
    expect(screen.getByText('语音')).toBeInTheDocument();
  });
});
