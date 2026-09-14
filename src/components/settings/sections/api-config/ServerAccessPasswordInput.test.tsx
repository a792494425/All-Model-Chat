import { act } from 'react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { setupProviderTestRenderer } from '@/test/render/providerRenderer';
import { ServerAccessPasswordInput } from './ServerAccessPasswordInput';
import * as apiAuthHeaders from '@/services/api/apiAuthHeaders';

describe('ServerAccessPasswordInput', () => {
  const renderer = setupProviderTestRenderer({ providers: { language: 'en' } });

  it('renders password input and allows toggling mask/unmask', () => {
    const onUpdate = vi.fn();
    act(() => {
      renderer.render(<ServerAccessPasswordInput serverAccessPassword="my-secret-token" onUpdate={onUpdate} />);
    });

    const input = renderer.container.querySelector<HTMLInputElement>('[data-testid="server-access-password-input"]');
    expect(input).not.toBeNull();
    expect(input?.type).toBe('password');
    expect(input?.value).toBe('my-secret-token');

    // Toggle show password
    const toggleBtn = renderer.container.querySelector('button[data-testid="toggle-show-password-button"]');
    act(() => {
      toggleBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(input?.type).toBe('text');
  });

  it('calls verifyServerAccessPassword and shows success on valid token', async () => {
    vi.spyOn(apiAuthHeaders, 'verifyServerAccessPassword').mockResolvedValueOnce({ ok: true });
    const onUpdate = vi.fn();

    act(() => {
      renderer.render(<ServerAccessPasswordInput serverAccessPassword="valid-token" onUpdate={onUpdate} />);
    });

    const testBtn = renderer.container.querySelector<HTMLButtonElement>(
      '[data-testid="verify-server-password-button"]',
    );
    expect(testBtn).not.toBeNull();

    await act(async () => {
      testBtn?.click();
    });

    expect(apiAuthHeaders.verifyServerAccessPassword).toHaveBeenCalledWith('valid-token', undefined);
    expect(renderer.container.querySelector('[data-testid="server-access-password-success"]')).toBeInTheDocument();
  });

  it('calls verifyServerAccessPassword and shows error message on failure', async () => {
    vi.spyOn(apiAuthHeaders, 'verifyServerAccessPassword').mockResolvedValueOnce({
      ok: false,
      message: 'Invalid access password',
    });
    const onUpdate = vi.fn();

    act(() => {
      renderer.render(<ServerAccessPasswordInput serverAccessPassword="wrong-token" onUpdate={onUpdate} />);
    });

    const testBtn = renderer.container.querySelector<HTMLButtonElement>(
      '[data-testid="verify-server-password-button"]',
    );
    expect(testBtn).not.toBeNull();

    await act(async () => {
      testBtn?.click();
    });

    const errorEl = renderer.container.querySelector('[data-testid="server-access-password-error"]');
    expect(errorEl).toBeInTheDocument();
    expect(errorEl?.textContent).toContain('Invalid access password');
  });

  it('handles input changes and calls onUpdate', () => {
    const onUpdate = vi.fn();
    act(() => {
      renderer.render(<ServerAccessPasswordInput serverAccessPassword="" onUpdate={onUpdate} />);
    });

    const input = renderer.container.querySelector<HTMLInputElement>('[data-testid="server-access-password-input"]');
    expect(input).not.toBeNull();

    act(() => {
      fireEvent.change(input!, { target: { value: 'new-password' } });
    });

    expect(onUpdate).toHaveBeenCalledWith('new-password');
  });
});
