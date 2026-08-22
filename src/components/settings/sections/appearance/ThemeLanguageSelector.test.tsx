import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render/providerRenderer';
import { ThemeLanguageSelector } from './ThemeLanguageSelector';
import type { AppSettings } from '@/types';

describe('ThemeLanguageSelector', () => {
  it('renders language dropdown with all registry options', async () => {
    const onUpdate = vi.fn();
    const settings = { language: 'en', themeId: 'pearl' } as AppSettings;
    const { getByLabelText, getByRole } = renderWithProviders(
      <ThemeLanguageSelector settings={settings} onUpdate={onUpdate} />,
      { language: 'en' },
    );

    const select = getByLabelText('Language');
    expect(select).toBeInTheDocument();
    expect(getByRole('option', { name: 'System Default' })).toBeInTheDocument();
    expect(getByRole('option', { name: 'English' })).toBeInTheDocument();
    expect(getByRole('option', { name: '中文' })).toBeInTheDocument();
    expect(getByRole('option', { name: '日本語' })).toBeInTheDocument();
    expect((select as HTMLSelectElement).value).toBe('en');
  });

  it('switches to ja on select change', async () => {
    const onUpdate = vi.fn();
    const settings = { language: 'en', themeId: 'pearl' } as AppSettings;
    const { getByLabelText } = renderWithProviders(<ThemeLanguageSelector settings={settings} onUpdate={onUpdate} />, {
      language: 'en',
    });

    fireEvent.change(getByLabelText('Language'), { target: { value: 'ja' } });
    expect(onUpdate).toHaveBeenCalledWith('language', 'ja');
  });
});
