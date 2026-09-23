import { act } from 'react';
import { fireEvent } from '@testing-library/react';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/render/providerRenderer';
import { describe, expect, it, vi } from 'vitest';
import { setupStoreStateReset } from '@/test/stores/reset';
import { ModelSelector } from './ModelSelector';

describe('ModelSelector', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });
  setupStoreStateReset();

  const mockModels = [
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
    { id: 'gemma-4-31b-it', name: 'Gemma 4 31B IT' },
  ];

  it('renders the compact model card with the selected model details and closed dropdown by default', () => {
    act(() => {
      renderer.root.render(
        <ModelSelector
          availableModels={mockModels}
          selectedModelId="gemini-3-flash-preview"
          onSelectModel={vi.fn()}
          setAvailableModels={vi.fn()}
        />,
      );
    });

    const nameEl = renderer.container.querySelector('[data-testid="settings-default-model-name"]');
    expect(nameEl?.textContent).toBe('Gemini 3 Flash Preview');

    const badgeEl = renderer.container.querySelector('[data-testid="settings-default-model-badge"]');
    expect(badgeEl?.textContent).toContain('New chat default');

    expect(renderer.container.querySelector('[data-testid="settings-model-dropdown"]')).toBeNull();
  });

  it('opens and closes the floating dropdown when clicking the change model button', () => {
    act(() => {
      renderer.root.render(
        <ModelSelector
          availableModels={mockModels}
          selectedModelId="gemini-3-flash-preview"
          onSelectModel={vi.fn()}
          setAvailableModels={vi.fn()}
        />,
      );
    });

    const button = renderer.container.querySelector<HTMLButtonElement>('[data-testid="settings-change-model-button"]');
    expect(button).not.toBeNull();

    act(() => {
      fireEvent.click(button!);
    });

    expect(renderer.container.querySelector('[data-testid="settings-model-dropdown"]')).not.toBeNull();
    expect(renderer.container.querySelector('[data-testid="settings-model-list-container"]')).not.toBeNull();

    act(() => {
      fireEvent.click(button!);
    });

    expect(renderer.container.querySelector('[data-testid="settings-model-dropdown"]')).toBeNull();
  });

  it('selects a model from the dropdown, calls onSelectModel, and closes the dropdown', () => {
    const onSelectModel = vi.fn();

    act(() => {
      renderer.root.render(
        <ModelSelector
          availableModels={mockModels}
          selectedModelId="gemini-3-flash-preview"
          onSelectModel={onSelectModel}
          setAvailableModels={vi.fn()}
        />,
      );
    });

    act(() => {
      fireEvent.click(renderer.container.querySelector('[data-testid="settings-change-model-button"]')!);
    });

    const option = renderer.container.querySelector(
      '[data-testid="settings-model-option-gemini-native:gemma-4-31b-it"]',
    );
    expect(option).not.toBeNull();

    act(() => {
      fireEvent.click(option!);
    });

    expect(onSelectModel).toHaveBeenCalledWith('gemma-4-31b-it', undefined);
    expect(renderer.container.querySelector('[data-testid="settings-model-dropdown"]')).toBeNull();
  });

  it('closes the dropdown when clicking outside', () => {
    act(() => {
      renderer.root.render(
        <div>
          <button type="button" data-testid="outside-element">
            Outside
          </button>
          <ModelSelector
            availableModels={mockModels}
            selectedModelId="gemini-3-flash-preview"
            onSelectModel={vi.fn()}
            setAvailableModels={vi.fn()}
          />
        </div>,
      );
    });

    act(() => {
      fireEvent.click(renderer.container.querySelector('[data-testid="settings-change-model-button"]')!);
    });

    expect(renderer.container.querySelector('[data-testid="settings-model-dropdown"]')).not.toBeNull();

    act(() => {
      fireEvent.mouseDown(renderer.container.querySelector('[data-testid="outside-element"]')!);
    });

    expect(renderer.container.querySelector('[data-testid="settings-model-dropdown"]')).toBeNull();
  });

  it('switches to editor mode when edit model list is clicked', () => {
    act(() => {
      renderer.root.render(
        <ModelSelector
          availableModels={mockModels}
          selectedModelId="gemini-3-flash-preview"
          onSelectModel={vi.fn()}
          setAvailableModels={vi.fn()}
        />,
      );
    });

    const editBtn = renderer.container.querySelector('button:has(svg.lucide-pencil)');
    expect(editBtn).not.toBeNull();

    act(() => {
      fireEvent.click(editBtn!);
    });

    expect(renderer.container.querySelector('[data-testid="settings-selected-model-card"]')).toBeNull();
    expect(renderer.container.textContent).toContain('Save List');
  });
});
