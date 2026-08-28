import React, { useState } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Clock, SlidersHorizontal, Sparkles, Users } from 'lucide-react';
import {
  TOOLBAR_IMAGE_CLUSTER_CLASS,
  TOOLBAR_TOGGLE_ACTIVE_CLASS,
  TOOLBAR_TOGGLE_IDLE_CLASS,
} from '@/constants/designTokens';
import { type ChatSettings, type ChatSettingsUpdater } from '@/types';
import { TranscribeLanguageSelector } from './TranscribeLanguageSelector';
import { TranscribeSettingsModal } from './TranscribeSettingsModal';

interface TranscribeClusterProps {
  currentChatSettings: ChatSettings;
  setCurrentChatSettings: ChatSettingsUpdater;
}

export const TranscribeCluster: React.FC<TranscribeClusterProps> = ({
  currentChatSettings,
  setCurrentChatSettings,
}) => {
  const { t } = useI18n();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const language = currentChatSettings.transcriptionLanguage ?? '';
  const wordTimestamps = currentChatSettings.transcriptionWordTimestamps ?? false;
  const speakerLabels = currentChatSettings.transcriptionSpeakerLabels ?? false;
  const smartMode = currentChatSettings.transcriptionSmartMode ?? false;
  const customVocabulary = currentChatSettings.transcriptionCustomVocabulary ?? '';
  const systemInstruction = currentChatSettings.transcriptionSystemInstruction ?? '';

  const hasAdvancedConfig = Boolean(customVocabulary.trim() || systemInstruction.trim());

  const handleLanguageChange = (newLang: string) => {
    setCurrentChatSettings((prev) => ({ ...prev, transcriptionLanguage: newLang }));
  };

  const handleToggleWordTimestamps = () => {
    setCurrentChatSettings((prev) => ({ ...prev, transcriptionWordTimestamps: !prev.transcriptionWordTimestamps }));
  };

  const handleToggleSpeakerLabels = () => {
    setCurrentChatSettings((prev) => ({ ...prev, transcriptionSpeakerLabels: !prev.transcriptionSpeakerLabels }));
  };

  const handleToggleSmartMode = () => {
    setCurrentChatSettings((prev) => ({ ...prev, transcriptionSmartMode: !prev.transcriptionSmartMode }));
  };

  const handleSaveModalSettings = (settings: { systemInstruction: string; customVocabulary: string }) => {
    setCurrentChatSettings((prev) => ({
      ...prev,
      transcriptionSystemInstruction: settings.systemInstruction,
      transcriptionCustomVocabulary: settings.customVocabulary,
    }));
  };

  return (
    <>
      <div className={TOOLBAR_IMAGE_CLUSTER_CLASS} data-testid="transcribe-settings-cluster">
        <TranscribeLanguageSelector language={language} setLanguage={handleLanguageChange} />

        <button
          type="button"
          onClick={handleToggleWordTimestamps}
          aria-pressed={wordTimestamps}
          className={wordTimestamps ? TOOLBAR_TOGGLE_ACTIVE_CLASS : TOOLBAR_TOGGLE_IDLE_CLASS}
          title={t('transcribeWordTimestampsHelp')}
        >
          <Clock size={14} strokeWidth={1.75} />
          <span>{t('transcribeWordTimestamps')}</span>
        </button>

        <button
          type="button"
          onClick={handleToggleSpeakerLabels}
          aria-pressed={speakerLabels}
          className={speakerLabels ? TOOLBAR_TOGGLE_ACTIVE_CLASS : TOOLBAR_TOGGLE_IDLE_CLASS}
          title={t('transcribeSpeakerLabelsHelp')}
        >
          <Users size={14} strokeWidth={1.75} />
          <span>{t('transcribeSpeakerLabels')}</span>
        </button>

        <button
          type="button"
          onClick={handleToggleSmartMode}
          aria-pressed={smartMode}
          className={smartMode ? TOOLBAR_TOGGLE_ACTIVE_CLASS : TOOLBAR_TOGGLE_IDLE_CLASS}
          title={t('transcribeSmartModeHelp')}
        >
          <Sparkles size={14} strokeWidth={1.75} />
          <span>{t('transcribeSmartMode')}</span>
        </button>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={hasAdvancedConfig ? TOOLBAR_TOGGLE_ACTIVE_CLASS : TOOLBAR_TOGGLE_IDLE_CLASS}
          title={t('transcribeModalTitle')}
        >
          <SlidersHorizontal size={14} strokeWidth={1.75} />
          <span>{t('transcribeVocabularyAndPrompt')}</span>
          {hasAdvancedConfig && <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-text-link)]" />}
        </button>
      </div>

      <TranscribeSettingsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        systemInstruction={systemInstruction}
        customVocabulary={customVocabulary}
        onSave={handleSaveModalSettings}
      />
    </>
  );
};
