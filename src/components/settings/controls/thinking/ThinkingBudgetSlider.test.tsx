import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/render/providerRenderer';
import { ThinkingBudgetSlider } from './ThinkingBudgetSlider';

describe('ThinkingBudgetSlider', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });

  const renderSlider = async () => {
    await act(async () => {
      renderer.root.render(
        <ThinkingBudgetSlider minBudget={512} maxBudget={24576} value="4096" onChange={vi.fn()} />,
      );
    });
  };

  it('shows the token budget as a neutral badge instead of link-colored text', async () => {
    await renderSlider();

    const badge = renderer.container.querySelector('span.font-mono');
    expect(badge).not.toBeNull();
    expect(badge!.textContent).toContain('4,096');
    expect(badge!.className).not.toContain('text-[var(--theme-text-link)]');
    expect(badge!.className).toContain('tabular-nums');
  });
});
