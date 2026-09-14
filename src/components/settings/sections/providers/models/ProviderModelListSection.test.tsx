import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ProviderModelListSection } from './ProviderModelListSection';
import { useProviderUiStore } from '@/stores/providerUiStore';
import type { ModelOption } from '@/types';

const mockModels: ModelOption[] = [
  { id: 'm1', name: 'Model One', visibleInSelector: true },
  { id: 'm2', name: 'Model Two', visibleInSelector: false },
];

describe('ProviderModelListSection', () => {
  beforeEach(() => {
    useProviderUiStore.getState().resetProviderUiState();
  });

  it('renders model list and handles visible toggle', () => {
    const handleUpdate = vi.fn();
    render(
      <ProviderModelListSection
        providerId="test-provider"
        providerName="Test Provider"
        models={mockModels}
        onUpdateModels={handleUpdate}
        onProbeSingleModel={vi.fn()}
        onProbeBatchModels={vi.fn()}
      />,
    );

    expect(screen.getByText('Model One')).toBeInTheDocument();
    expect(screen.getByText('Model Two')).toBeInTheDocument();

    // Toggle visibility for m1
    const eyeButtons = screen.getAllByTitle(/visible|hidden|隐藏|显示/i);
    fireEvent.click(eyeButtons[0]);

    expect(handleUpdate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'm1', visibleInSelector: false })]),
    );
  });

  it('filters models via search input', () => {
    render(
      <ProviderModelListSection
        providerId="test-provider"
        providerName="Test Provider"
        models={mockModels}
        onUpdateModels={vi.fn()}
        onProbeSingleModel={vi.fn()}
        onProbeBatchModels={vi.fn()}
      />,
    );

    // Open search
    const searchBtn = screen.getByTitle(/search models|thirdpartysearchmodels/i);
    fireEvent.click(searchBtn);

    const searchInput = screen.getByPlaceholderText(/filter model/i);
    fireEvent.change(searchInput, { target: { value: 'Model Two' } });

    expect(screen.queryByText('Model One')).not.toBeInTheDocument();
    expect(screen.getByText('Model Two')).toBeInTheDocument();
  });

  it('opens ModelConfigModal when clicking model settings button', () => {
    render(
      <ProviderModelListSection
        providerId="test-provider"
        providerName="Test Provider"
        models={mockModels}
        onUpdateModels={vi.fn()}
        onProbeSingleModel={vi.fn()}
        onProbeBatchModels={vi.fn()}
      />,
    );

    const configBtns = screen.getAllByTitle(/model configuration|settingsmodelconfigtitle/i);
    fireEvent.click(configBtns[0]);

    // Modal should be open with model name
    expect(screen.getByDisplayValue('Model One')).toBeInTheDocument();
  });

  it('renders callout card when no models are configured and triggers fetch models', () => {
    const handleSync = vi.fn();
    render(
      <ProviderModelListSection
        providerId="empty-provider"
        providerName="Empty Provider"
        models={[]}
        onUpdateModels={vi.fn()}
        onProbeSingleModel={vi.fn()}
        onProbeBatchModels={vi.fn()}
        onSyncRemoteModels={handleSync}
      />,
    );

    const emptyCard = screen.getByTestId('provider-no-models-card');
    expect(emptyCard).toBeInTheDocument();

    const fetchBtn = within(emptyCard).getByRole('button', { name: /fetch models|拉取模型/i });
    expect(fetchBtn).toBeInTheDocument();

    fireEvent.click(fetchBtn);
    expect(handleSync).toHaveBeenCalledTimes(1);
  });
});
