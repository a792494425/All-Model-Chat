import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GeminiProviderDetail } from './GeminiProviderDetail';
import { useModelPreferencesStore } from '@/stores/modelPreferencesStore';
import { useProviderUiStore } from '@/stores/providerUiStore';

describe('GeminiProviderDetail', () => {
  beforeEach(() => {
    useProviderUiStore.getState().resetProviderUiState();
    useModelPreferencesStore.getState().setCustomModels([
      { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', visibleInSelector: true },
      { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', visibleInSelector: true },
    ]);
  });

  it('renders ApiConfigSection at top and model list at bottom', () => {
    render(
      <GeminiProviderDetail
        settings={{ apiKey: 'test-key', useCustomApiConfig: true } as any}
        onUpdateSettings={vi.fn()}
      />,
    );

    // Header title
    expect(screen.getByText(/Google Gemini/i)).toBeInTheDocument();
    // Models header
    expect(screen.getByText(/Models|模型/i)).toBeInTheDocument();
    // Model items
    expect(screen.getByText('Gemini 2.5 Flash')).toBeInTheDocument();
    expect(screen.getByText('Gemini 2.5 Pro')).toBeInTheDocument();
  });

  it('updates model preferences when toggling visibility in model list', () => {
    render(
      <GeminiProviderDetail
        settings={{ apiKey: 'test-key', useCustomApiConfig: true } as any}
        onUpdateSettings={vi.fn()}
      />,
    );

    const eyeButtons = screen.getAllByTitle(/visible|hidden|隐藏|显示/i);
    fireEvent.click(eyeButtons[0]);

    const updated = useModelPreferencesStore.getState().customModels;
    expect(updated).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'gemini-2.5-flash', visibleInSelector: false })]),
    );
  });
});
