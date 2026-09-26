import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render/providerRenderer';
import { FontFamilyControl } from './FontFamilyControl';
import type { AppSettings } from '@/types';

describe('FontFamilyControl', () => {
  it('renders sans and serif options with proper active state', () => {
    const onUpdate = vi.fn();
    const { getByRole } = renderWithProviders(
      <FontFamilyControl settings={{ readingFontFamily: 'sans' } as AppSettings} onUpdate={onUpdate} />,
      { language: 'en' },
    );

    const sansButton = getByRole('radio', { name: 'Sans-serif' });
    const serifButton = getByRole('radio', { name: 'Serif' });

    expect(sansButton).toHaveAttribute('aria-checked', 'true');
    expect(serifButton).toHaveAttribute('aria-checked', 'false');
  });

  it('triggers onUpdate with serif when clicking serif option', () => {
    const onUpdate = vi.fn();
    const { getByRole } = renderWithProviders(
      <FontFamilyControl settings={{ readingFontFamily: 'sans' } as AppSettings} onUpdate={onUpdate} />,
      { language: 'en' },
    );

    const serifButton = getByRole('radio', { name: 'Serif' });
    fireEvent.click(serifButton);

    expect(onUpdate).toHaveBeenCalledWith('readingFontFamily', 'serif');
  });

  it('triggers onUpdate with sans when clicking sans option', () => {
    const onUpdate = vi.fn();
    const { getByRole } = renderWithProviders(
      <FontFamilyControl settings={{ readingFontFamily: 'serif' } as AppSettings} onUpdate={onUpdate} />,
      { language: 'en' },
    );

    const sansButton = getByRole('radio', { name: 'Sans-serif' });
    fireEvent.click(sansButton);

    expect(onUpdate).toHaveBeenCalledWith('readingFontFamily', 'sans');
  });
});
