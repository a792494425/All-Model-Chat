import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProviderAvatar } from './ProviderAvatar';
import { generateColorFromChar, getFirstCharacter } from '@/utils/third-party/thirdPartyApiProviders';

describe('ProviderAvatar', () => {
  it('generates consistent color and first character', () => {
    expect(getFirstCharacter('Muse')).toBe('M');
    expect(getFirstCharacter('  openCode ')).toBe('O');
    expect(getFirstCharacter('')).toBe('?');

    const color1 = generateColorFromChar('Muse');
    const color2 = generateColorFromChar('Muse');
    expect(color1).toBe(color2);
    expect(color1).toContain('hsl(');
  });

  it('renders initial letter avatar for custom providers without icon', () => {
    const { container } = render(<ProviderAvatar name="Muse" templateId="custom-openai" size={32} />);
    expect(container.textContent).toBe('M');
  });

  it('renders template image for official template', () => {
    render(<ProviderAvatar name="DeepSeek" templateId="deepseek" size={32} />);
    const img = screen.queryByRole('img');
    if (img) {
      expect(img.getAttribute('alt')).toBe('DeepSeek');
    }
  });

  it('renders model logo when modelId matches a known model under custom provider', () => {
    render(
      <ProviderAvatar
        name="DeepSeek-V4-Flash-0731"
        modelId="deepseek-v4-flash-0731"
        templateId="custom-openai"
        size={24}
      />,
    );
    const img = screen.queryByRole('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('DeepSeek-V4-Flash-0731');
  });

  it('renders model logo when modelName matches a known model under custom provider', () => {
    render(
      <ProviderAvatar
        name="Qwen3.8-Flash (Alias)"
        modelId="custom-id"
        modelName="Qwen3.8-Flash (Alias)"
        templateId="custom-openai"
        size={24}
      />,
    );
    const img = screen.queryByRole('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('alt')).toBe('Qwen3.8-Flash (Alias)');
  });

  it('renders emoji avatar when icon is an emoji', () => {
    const { container } = render(<ProviderAvatar name="My Proxy" icon="🚀" size={32} />);
    expect(container.textContent).toContain('🚀');
  });

  it('renders image avatar when icon is an external URL', () => {
    render(<ProviderAvatar name="Custom Service" icon="https://example.com/logo.png" size={32} />);
    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/logo.png');
    expect(img.getAttribute('alt')).toBe('Custom Service');
  });

  it('renders data URL image avatar correctly', () => {
    const dataUrl =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    render(<ProviderAvatar name="Custom Service" icon={dataUrl} size={32} />);
    const img = screen.getByRole('img');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe(dataUrl);
  });
});
