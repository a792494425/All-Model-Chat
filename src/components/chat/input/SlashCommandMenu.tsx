import React, { useRef, useEffect } from 'react';
import { CornerDownLeft } from 'lucide-react';
import { CommandIcon } from '@/components/icons/CommandIcon';
import type { SlashCommand as SlashMenuItem } from '@/types/slashCommands';
import { useI18n } from '@/contexts/I18nContext';
import {
  SETTINGS_KBD_KEY_CLASS,
  SETTINGS_NAV_ACTIVE_CLASS,
  SETTINGS_SECTION_LABEL_CLASS,
} from '@/constants/designTokens';

interface SlashCommandMenuProps {
  isOpen: boolean;
  commands: SlashMenuItem[];
  onSelect: (command: SlashMenuItem) => void;
  selectedIndex: number;
  className?: string;
}

const SlashCommandMenuComponent: React.FC<SlashCommandMenuProps> = ({
  isOpen,
  commands,
  onSelect,
  selectedIndex,
  className,
}) => {
  const { t } = useI18n();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (isOpen && selectedItemRef.current && scrollContainerRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: 'nearest',
        inline: 'start',
      });
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen || commands.length === 0) {
    return null;
  }

  const defaultClasses = 'absolute bottom-full left-0 right-0 mb-2 w-full max-w-3xl mx-auto px-2 sm:px-4 z-30';
  const finalClassName = className || defaultClasses;

  return (
    <div className={finalClassName} style={{ animation: 'fadeInUp 0.15s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
      <div
        data-slash-command-frame="true"
        className="flex max-h-80 flex-col overflow-hidden rounded-xl border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] shadow-premium"
      >
        <div
          ref={scrollContainerRef}
          data-slash-command-scroll="true"
          className="custom-scrollbar flex max-h-80 flex-col overflow-y-auto scroll-pt-10"
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--theme-border-secondary)] bg-[var(--theme-bg-secondary)] px-3 py-2">
            <span className={SETTINGS_SECTION_LABEL_CLASS}>{t('slashCommandsTitle')}</span>
            <div className="flex items-center gap-2">
              <kbd className={SETTINGS_KBD_KEY_CLASS}>{t('slashCommandsNavigateHint')}</kbd>
              <kbd className={SETTINGS_KBD_KEY_CLASS}>{t('slashCommandsSelectHint')}</kbd>
            </div>
          </div>

          <ul className="space-y-0.5 p-1.5">
            {commands.map((command, index) => {
              const isSelected = selectedIndex === index;
              return (
                <li key={command.name} ref={isSelected ? selectedItemRef : null}>
                  <button
                    type="button"
                    onClick={() => onSelect(command)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      isSelected ? SETTINGS_NAV_ACTIVE_CLASS : 'hover:bg-[var(--theme-bg-tertiary)]/50'
                    }`}
                    aria-selected={isSelected}
                    role="option"
                  >
                    <span className="flex-shrink-0 text-[var(--theme-text-tertiary)]">
                      <CommandIcon icon={command.icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-sm font-medium text-[var(--theme-text-primary)]">
                        /{command.name}
                      </span>
                      <span
                        className={`block truncate text-xs ${isSelected ? 'text-[var(--theme-text-secondary)]' : 'text-[var(--theme-text-tertiary)]'}`}
                      >
                        {command.description}
                      </span>
                    </span>
                    {isSelected ? (
                      <CornerDownLeft
                        size={12}
                        className="hidden flex-shrink-0 text-[var(--theme-text-tertiary)] sm:block"
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export const SlashCommandMenu = React.memo(SlashCommandMenuComponent);
