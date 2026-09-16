import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, waitFor } from '@testing-library/react';
import { setupProviderTestRenderer } from '@/test/render/providerRenderer';
import { ProviderImageUpload } from './ProviderImageUpload';

describe('ProviderImageUpload', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'zh' } });

  it('renders upload button and empty URL input when no value is provided', () => {
    const onChange = vi.fn();
    act(() => {
      renderer.render(<ProviderImageUpload value="" onChange={onChange} name="TestProvider" />);
    });

    const uploadButton = renderer.container.querySelector('button');
    expect(uploadButton).not.toBeNull();
    expect(uploadButton?.textContent).toContain('上传图片');

    const input = renderer.container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input).not.toBeNull();
    expect(input?.value).toBe('');
    expect(input?.placeholder).toContain('https://…');
  });

  it('calls onChange when user types an image URL', () => {
    const onChange = vi.fn();
    act(() => {
      renderer.render(<ProviderImageUpload value="" onChange={onChange} name="TestProvider" />);
    });

    const input = renderer.container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input).not.toBeNull();

    act(() => {
      fireEvent.change(input!, { target: { value: 'https://example.com/logo.png' } });
    });

    expect(onChange).toHaveBeenCalledWith('https://example.com/logo.png');
  });

  it('renders remove button when value is set and clears on click', () => {
    const onChange = vi.fn();
    act(() => {
      renderer.render(
        <ProviderImageUpload value="https://example.com/logo.png" onChange={onChange} name="TestProvider" />,
      );
    });

    const buttons = Array.from(renderer.container.querySelectorAll('button'));
    const removeButton = buttons.find((btn) => btn.textContent?.includes('移除'));
    expect(removeButton).toBeDefined();

    act(() => {
      removeButton?.click();
    });

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('disables URL text input and shows local placeholder when value is a data URL', () => {
    const onChange = vi.fn();
    const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    act(() => {
      renderer.render(<ProviderImageUpload value={dataUrl} onChange={onChange} name="TestProvider" />);
    });

    const input = renderer.container.querySelector<HTMLInputElement>('input[type="text"]');
    expect(input).not.toBeNull();
    expect(input?.disabled).toBe(true);
    expect(input?.placeholder).toBe('已使用本地上传的图片');
  });

  it('handles SVG file upload directly via FileReader', async () => {
    const onChange = vi.fn();
    act(() => {
      renderer.render(<ProviderImageUpload value="" onChange={onChange} name="TestProvider" />);
    });

    const fileInput = renderer.container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();

    const svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10"/></svg>';
    const file = new File([svgContent], 'icon.svg', { type: 'image/svg+xml' });

    act(() => {
      fireEvent.change(fileInput!, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
      const arg = onChange.mock.calls[0][0];
      expect(arg).toContain('data:image/svg+xml');
    });
  });
});
