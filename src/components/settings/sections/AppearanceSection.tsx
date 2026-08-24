import React from 'react';
import { type AppSettings, type ModelOption } from '@/types';
import { ThemeLanguageSelector } from './appearance/ThemeLanguageSelector';
import { FontSizeControl } from './appearance/FontSizeControl';
import { LiveArtifactsFontSizeControl } from './appearance/LiveArtifactsFontSizeControl';
import { InterfaceToggles } from './appearance/InterfaceToggles';
import { SelectionAskModelSection } from './SelectionAskModelSection';

interface AppearanceSectionProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  availableModels?: ModelOption[];
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({ settings, onUpdate, availableModels = [] }) => {
  return (
    <div className="space-y-6">
      <ThemeLanguageSelector settings={settings} onUpdate={onUpdate} />

      <FontSizeControl settings={settings} onUpdate={onUpdate} />

      <LiveArtifactsFontSizeControl settings={settings} onUpdate={onUpdate} />

      <InterfaceToggles settings={settings} onUpdate={onUpdate} />

      <SelectionAskModelSection settings={settings} onUpdate={onUpdate} availableModels={availableModels} />
    </div>
  );
};
