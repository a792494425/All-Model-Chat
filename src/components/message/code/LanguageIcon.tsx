import React from 'react';
import { Braces, FileCode2, Workflow } from 'lucide-react';
import { MaterialIcon } from './MaterialIcon';
import {
  getLanguageBadgeConfig,
  LANGUAGE_ICON_SIZE,
  MATERIAL_ICON_NAMES,
  type LanguageBadgeConfig,
} from './languageBadges';

export { MATERIAL_ICON_NAMES };

const renderIcon = (config: LanguageBadgeConfig): React.ReactNode => {
  if (config.materialIcon) {
    return <MaterialIcon name={config.materialIcon} size={LANGUAGE_ICON_SIZE} />;
  }

  if (config.iconId === 'generic') {
    return <FileCode2 size={LANGUAGE_ICON_SIZE} strokeWidth={2.1} className="text-gray-400" />;
  }

  if (config.fallbackIcon === 'workflow') {
    return <Workflow size={LANGUAGE_ICON_SIZE} strokeWidth={2.1} className="text-pink-400" />;
  }

  return <Braces size={LANGUAGE_ICON_SIZE} strokeWidth={2.1} className="text-violet-400" />;
};

export const LanguageIcon: React.FC<{ language: string }> = ({ language }) => {
  const config = getLanguageBadgeConfig(language || 'text');

  return (
    <div
      data-language-badge={config.badgeId}
      className="inline-flex max-w-full items-center gap-1.5 select-none"
      title={config.displayName}
    >
      <span
        data-language-icon={config.iconId}
        className="inline-flex h-5 flex-shrink-0 items-center justify-center"
        aria-hidden="true"
      >
        {renderIcon(config)}
      </span>
      <span data-language-meta className="inline-flex min-w-0 items-center gap-1.5">
        <span className="truncate text-xs font-bold uppercase leading-none tracking-wider text-[var(--theme-text-secondary)]">
          {config.displayName}
        </span>
        {config.compactLabel && (
          <span className="truncate text-xs font-mono font-semibold uppercase leading-none tracking-[0.12em] text-[var(--theme-text-tertiary)]">
            {config.compactLabel}
          </span>
        )}
      </span>
    </div>
  );
};
