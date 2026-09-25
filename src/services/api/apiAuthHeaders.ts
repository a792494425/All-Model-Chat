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
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'x-access-token': trimmed,
        authorization: `Bearer ${trimmed}`,
      },
    });
    if (response.status === 200) {
      return { ok: true };
    }
    if (response.status === 401) {
      return { ok: false, message: 'Invalid access password' };
    }
    return { ok: false, message: `Server returned status ${response.status}` };
  } catch (verifyError) {
    const connectionErrorMessage = verifyError instanceof Error ? verifyError.message : String(verifyError);
    return { ok: false, message: `Connection failed: ${connectionErrorMessage}` };
  }
};

export const checkServerAuthRequired = async (
  customBaseUrl?: string,
): Promise<{ authRequired: boolean; ok: boolean }> => {
  const base = customBaseUrl?.replace(/\/+$/, '') || '';
  const url = `${base}/health`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { authRequired: false, ok: false };
    }
    const data = (await response.json()) as { authRequired?: boolean };
    return { authRequired: Boolean(data.authRequired), ok: true };
  } catch {
    return { authRequired: false, ok: false };
  }
};
