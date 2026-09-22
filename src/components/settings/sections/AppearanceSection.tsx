import React from 'react';
import { type AppSettings } from '@/types';
import { AppearanceLivePreview } from './appearance/AppearanceLivePreview';
import { ThemeLanguageSelector } from './appearance/ThemeLanguageSelector';
import { FontSizeControl } from './appearance/FontSizeControl';
import { LiveUiFontSizeControl } from './appearance/LiveUiFontSizeControl';
import { InterfaceToggles } from './appearance/InterfaceToggles';

interface AppearanceSectionProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({ settings, onUpdate }) => {
  return (
    <div className="space-y-6">
      <AppearanceLivePreview settings={settings} />

      <ThemeLanguageSelector settings={settings} onUpdate={onUpdate} />

      <FontSizeControl settings={settings} onUpdate={onUpdate} />

      <LiveUiFontSizeControl settings={settings} onUpdate={onUpdate} />

      <InterfaceToggles settings={settings} onUpdate={onUpdate} />
    </div>
  );
};
