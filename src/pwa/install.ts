import type { SupportedLanguage } from '@/i18n/languageRegistry';
import type { AppLanguage } from '@/types';

export type PwaInstallState = 'available' | 'manual' | 'installed';

interface PwaInstallSnapshot {
  state: PwaInstallState;
  canInstall: boolean;
}

const resolveLanguage = (language: AppLanguage, navigatorLanguage?: string): SupportedLanguage => {
  if (language === 'zh' || language === 'ja' || language === 'en') {
    return language;
  }

  const lower = navigatorLanguage?.toLowerCase() ?? '';
  if (lower.startsWith('zh')) return 'zh';
  if (lower.startsWith('ja')) return 'ja';
  return 'en';
};

const isStandaloneMode = (win: Window = window) => {
  const displayModeStandalone = win.matchMedia?.('(display-mode: standalone)').matches ?? false;
  const navigatorStandalone = Boolean((win.navigator as Navigator & { standalone?: boolean }).standalone);

  return displayModeStandalone || navigatorStandalone;
};

export const getPwaInstallState = ({
  installPromptEvent,
  win = window,
}: {
  installPromptEvent: BeforeInstallPromptEvent | null;
  win?: Window;
}): PwaInstallSnapshot => {
  if (isStandaloneMode(win)) {
    return {
      state: 'installed',
      canInstall: false,
    };
  }

  if (installPromptEvent) {
    return {
      state: 'available',
      canInstall: true,
    };
  }

  return {
    state: 'manual',
    canInstall: true,
  };
};

export const getManualInstallMessage = (
  language: AppLanguage = 'en',
  navigatorLanguage = typeof navigator !== 'undefined' ? navigator.language : 'en',
) => {
  const resolvedLanguage = resolveLanguage(language, navigatorLanguage);

  if (resolvedLanguage === 'zh') {
    return '请使用浏览器菜单将此应用安装到设备。';
  }
  if (resolvedLanguage === 'ja') {
    return 'ブラウザのメニューからこのアプリをインストールしてください。';
  }
  return 'Use your browser menu to install this app.';
};
