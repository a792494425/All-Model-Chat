import { useSettingsStore } from '@/stores/settingsStore';

export const getServerAccessPassword = (): string | null => {
  try {
    return useSettingsStore.getState().appSettings.serverAccessPassword?.trim() || null;
  } catch {
    return null;
  }
};

export const getServerAuthHeaders = (passwordOverride?: string | null): Record<string, string> => {
  const token = passwordOverride !== undefined ? passwordOverride?.trim() || null : getServerAccessPassword();
  if (!token) {
    return {};
  }
  return {
    'x-access-token': token,
    authorization: `Bearer ${token}`,
  };
};

export const verifyServerAccessPassword = async (
  password: string,
  customBaseUrl?: string,
): Promise<{ ok: boolean; message?: string }> => {
  const trimmed = password.trim();
  if (!trimmed) {
    return { ok: false, message: 'Password cannot be empty' };
  }
  const base = customBaseUrl?.replace(/\/+$/, '') || '';
  const url = `${base}/api/auth/verify`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-access-token': trimmed,
        authorization: `Bearer ${trimmed}`,
      },
    });
    if (res.status === 200) {
      return { ok: true };
    }
    if (res.status === 401) {
      return { ok: false, message: 'Invalid access password' };
    }
    return { ok: false, message: `Server returned status ${res.status}` };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { ok: false, message: `Connection failed: ${msg}` };
  }
};

export const checkServerAuthRequired = async (
  customBaseUrl?: string,
): Promise<{ authRequired: boolean; ok: boolean }> => {
  const base = customBaseUrl?.replace(/\/+$/, '') || '';
  const url = `${base}/health`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      return { authRequired: false, ok: false };
    }
    const data = (await res.json()) as { authRequired?: boolean };
    return { authRequired: Boolean(data.authRequired), ok: true };
  } catch {
    return { authRequired: false, ok: false };
  }
};
