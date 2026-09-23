export type SettingsTab =
  'gemini' | 'providers' | 'models' | 'interface' | 'mcp' | 'data' | 'shortcuts' | 'about' | 'api';
export type SettingsTabDescriptor = { id: SettingsTab; labelKey: string };

/** All settings tabs in sidebar order. */
export const SETTINGS_TABS: SettingsTab[] = [
  'gemini',
  'providers',
  'models',
  'mcp',
  'interface',
  'data',
  'shortcuts',
  'about',
];

/** Localized label key for each settings tab. */
export const SETTINGS_TAB_LABEL_KEYS: Record<SettingsTab, string> = {
  gemini: 'settingsTabGemini',
  providers: 'settingsTabProviders',
  models: 'settingsTabModels',
  interface: 'settingsTabInterface',
  api: 'settingsTabApi',
  mcp: 'settingsTabMcp',
  data: 'settingsTabData',
  shortcuts: 'settingsTabShortcuts',
  about: 'settingsTabAbout',
};
