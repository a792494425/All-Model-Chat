import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelConfigModal } from './ModelConfigModal';
import type { ModelOption } from '@/types';

const mockModel: ModelOption = {
  id: 'gpt-4o',
  name: 'GPT-4o Original',
  isPinned: false,
  contextWindow: 128000,
  capabilities: {
    vision: true,
    tools: true,
  },
  parameters: {
    temperature: 0.7,
  },
};

describe('ModelConfigModal', () => {
  it('renders info tab and allows editing name and toggling pin', () => {
    const handleSave = vi.fn();
    render(<ModelConfigModal isOpen={true} model={mockModel} onClose={vi.fn()} onSave={handleSave} />);

    expect(screen.getByDisplayValue('GPT-4o Original')).toBeInTheDocument();
    const nameInput = screen.getByDisplayValue('GPT-4o Original');
    fireEvent.change(nameInput, { target: { value: 'GPT-4o Renamed' } });

    // Click Save
    const saveBtn = screen.getByRole('button', { name: /save|保存/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'GPT-4o Renamed',
      }),
    );
  });

  it('switches to parameters tab and saves custom reasoningEffort', () => {
    const handleSave = vi.fn();
    render(
      <ModelConfigModal
        isOpen={true}
        model={mockModel}
        protocol="openai-compatible"
        onClose={vi.fn()}
        onSave={handleSave}
      />,
    );

    // Switch tab
    const paramTab = screen.getByRole('tab', { name: /generation|reasoning|parameters|参数|生成/i });
    fireEvent.click(paramTab);

    // Click high effort
    const highBtn = screen.getByText(/high|高/i);
    fireEvent.click(highBtn);

    const saveBtn = screen.getByRole('button', { name: /save|保存/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: expect.objectContaining({
          reasoningEffort: 'high',
        }),
      }),
    );
  });

  it('prevents saving when model ID conflicts with another existing model ID', () => {
    const handleSave = vi.fn();
    render(
      <ModelConfigModal
        isOpen={true}
        model={mockModel}
        existingModelIds={['gpt-4o', 'existing-model-2']}
        onClose={vi.fn()}
        onSave={handleSave}
      />,
    );

    const idInput = screen.getByDisplayValue('gpt-4o');
    fireEvent.change(idInput, { target: { value: 'existing-model-2' } });

    const saveBtn = screen.getByRole('button', { name: /save|保存/i });
    fireEvent.click(saveBtn);

    expect(handleSave).not.toHaveBeenCalled();
  });

  it('prevents saving when model ID is blank', () => {
    const handleSave = vi.fn();
    render(
      <ModelConfigModal
        isOpen={true}
        model={mockModel}
        existingModelIds={['gpt-4o']}
        onClose={vi.fn()}
        onSave={handleSave}
      />,
    );

    const idInput = screen.getByDisplayValue('gpt-4o');
    fireEvent.change(idInput, { target: { value: '   ' } });

    const saveBtn = screen.getByRole('button', { name: /save|保存/i });
    fireEvent.click(saveBtn);

    expect(handleSave).not.toHaveBeenCalled();
  });

  it('renders Gemini 3.x thinking level choices and does not save presence penalty for Gemini models', () => {
    const handleSave = vi.fn();
    const geminiModel: ModelOption = {
      id: 'gemini-3-flash-preview',
      name: 'Gemini 3 Flash Preview',
      parameters: {
        presencePenalty: 0.5,
      },
    };

    render(
      <ModelConfigModal isOpen={true} model={geminiModel} protocol="gemini" onClose={vi.fn()} onSave={handleSave} />,
    );

    // Switch tab
    const paramTab = screen.getByRole('tab', { name: /generation|reasoning|parameters|参数|生成/i });
    fireEvent.click(paramTab);

    // Click medium thinking level
    const mediumBtn = screen.getByText(/medium|中/i);
    fireEvent.click(mediumBtn);

    const saveBtn = screen.getByRole('button', { name: /save|保存/i });
    fireEvent.click(saveBtn);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        parameters: expect.objectContaining({
          thinkingLevel: 'MEDIUM',
        }),
      }),
    );
    // Presence penalty should not be included for Gemini native
    const lastCall = handleSave.mock.calls[0][0];
    expect(lastCall.parameters?.presencePenalty).toBeUndefined();
  });
});
