import React, { useCallback, useMemo, useState } from 'react';
import { Search, ListFilter, MoreHorizontal, Undo2 } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useI18n } from '@/contexts/I18nContext';
import { SHORTCUT_REGISTRY, DEFAULT_SHORTCUTS } from '@/constants/shortcuts';
import { SETTINGS_SECTION_CARD_CLASS } from '@/constants/designTokens';
import { type AppSettings, type ModelOption } from '@/types';
import { formatShortcut } from '@/utils/keyboardShortcuts';
import { ShortcutRecorder } from './shortcuts/ShortcutRecorder';
import { TabCycleModelsCard } from './TabCycleModelsCard';
import { Toggle } from '@/components/shared/Toggle';
import { usePortaledMenu } from '@/hooks/ui/usePortaledMenu';

interface ShortcutsSectionProps {
  currentSettings?: AppSettings;
  availableModels?: ModelOption[];
  onUpdateSettings?: (settings: Partial<AppSettings>) => void;
}

type CategoryFilter = 'all' | 'general' | 'input' | 'global';

export const ShortcutsSection: React.FC<ShortcutsSectionProps> = ({
  currentSettings,
  availableModels = [],
  onUpdateSettings,
}) => {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const { isOpen: isMoreOpen, menuPosition, containerRef, buttonRef, menuRef, targetWindow, toggleMenu, closeMenu } =
    usePortaledMenu();



  // Fallback when translation key missing (AMC may not have settingsShortcutsAll)
  const getCategoryLabel = (cat: string): string => {
    if (cat === 'all') return t('shortcutsGeneralTitle' as never) !== 'shortcutsGeneralTitle' ? 'All' : 'All';
    if (cat === 'general') return t('shortcutsGeneralTitle' as never) as string;
    if (cat === 'input') return t('shortcutsChatInputTitle' as never) as string;
    if (cat === 'global') return t('shortcutsGlobalTitle' as never) as string;
    return cat;
  };

  const handleShortcutChange = useCallback(
    (id: string, newKey: string) => {
      if (!currentSettings || !onUpdateSettings) return;
      const updatedShortcuts = { ...currentSettings.customShortcuts };
      if (newKey === DEFAULT_SHORTCUTS[id]) {
        delete updatedShortcuts[id];
      } else {
        updatedShortcuts[id] = newKey;
      }
      onUpdateSettings({ customShortcuts: updatedShortcuts });
    },
    [currentSettings, onUpdateSettings],
  );

  const handleToggleEnabled = useCallback(
    (id: string, enabled: boolean) => {
      if (!currentSettings || !onUpdateSettings) return;
      const defaultKey = DEFAULT_SHORTCUTS[id] ?? '';
      if (enabled) {
        // Re-enable: restore default if currently empty
        const current = currentSettings.customShortcuts?.[id];
        if (!current) handleShortcutChange(id, defaultKey);
      } else {
        handleShortcutChange(id, '');
      }
    },
    [currentSettings, onUpdateSettings, handleShortcutChange],
  );

  const handleResetSingle = useCallback(
    (id: string) => {
      handleShortcutChange(id, DEFAULT_SHORTCUTS[id] ?? '');
    },
    [handleShortcutChange],
  );

  const handleToggleVisible = useCallback(
    (enabled: boolean) => {
      if (!currentSettings || !onUpdateSettings) return;
      const visibleIds = filteredItems.map((i) => i.id);
      const updated = { ...currentSettings.customShortcuts };
      for (const id of visibleIds) {
        updated[id] = enabled ? DEFAULT_SHORTCUTS[id] ?? '' : '';
        if (enabled && updated[id] === DEFAULT_SHORTCUTS[id]) delete updated[id];
      }
      onUpdateSettings({ customShortcuts: updated });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentSettings, onUpdateSettings],
  );

  const handleResetAll = useCallback(() => {
    if (!currentSettings || !onUpdateSettings) return;
    onUpdateSettings({ customShortcuts: {} });
  }, [currentSettings, onUpdateSettings]);

  if (!currentSettings || !onUpdateSettings) {
    return <div className="p-4 text-center text-[var(--theme-text-secondary)]">{t('shortcutsUnavailable')}</div>;
  }

  // Build filtered list — Cherry: search by label or shortcut display, plus category
  const allItems = SHORTCUT_REGISTRY;
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allItems.filter((item) => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      if (!q) return true;
      const label = t(item.labelKey as never) as string;
      const customKey = currentSettings.customShortcuts?.[item.id];
      const effectiveKey = customKey !== undefined ? customKey : item.defaultKey;
      const display = effectiveKey ? formatShortcut(effectiveKey).join(' ').toLowerCase() : '';
      return label.toLowerCase().includes(q) || display.includes(q);
    });
  }, [allItems, activeCategory, searchQuery, currentSettings.customShortcuts, t]);

  const countByCategory = useMemo(() => {
    const map: Record<string, number> = { all: allItems.length };
    for (const cat of ['general', 'input', 'global'] as const) {
      map[cat] = allItems.filter((i) => i.category === cat).length;
    }
    return map;
  }, [allItems]);

  // Keep TabCycleModelsCard visible only when its shortcut is visible
  const showTabCycleCard = filteredItems.some((i) => i.id === 'input.cycleModels');

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header — 模仿 Cherry ShortcutSettings: 搜索 + 筛选 + 更多 */}
      <div className={`${SETTINGS_SECTION_CARD_CLASS} p-3 flex items-center justify-between gap-3`}>
        <h4 className="text-sm font-semibold text-[var(--theme-text-primary)] shrink-0">
          {t('shortcutsGeneralTitle' as never) !== 'shortcutsGeneralTitle' ? t('shortcutsGeneralTitle' as never) as string : 'Keyboard Shortcuts'}
          <span className="ml-2 text-xs font-normal text-[var(--theme-text-secondary)]">{filteredItems.length}/{allItems.length}</span>
        </h4>
        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          {/* Search — Cherry CollapsibleSearchBar 简化版 */}
          <div className="relative flex-1 max-w-[220px]">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-secondary)]" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('settingsSearchPlaceholder' as never) as string || 'Search shortcuts'}
              className="w-full h-8 pl-8 pr-3 rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] text-sm text-[var(--theme-text-primary)] placeholder:text-[var(--theme-text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-border-focus)]"
            />
          </div>
          {/* Category filter — Cherry ListFilter + DropdownRadioGroup 简化为 select */}
          <div className="relative flex items-center gap-1.5 rounded-lg border border-[var(--theme-border-secondary)] bg-[var(--theme-bg-primary)] px-2 h-8 text-xs">
            <ListFilter size={14} className="text-[var(--theme-text-secondary)]" />
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value as CategoryFilter)}
              className="bg-transparent text-xs font-medium text-[var(--theme-text-primary)] focus:outline-none pr-1"
            >
              <option value="all">All ({countByCategory.all})</option>
              <option value="general">{getCategoryLabel('general')} ({countByCategory.general})</option>
              <option value="input">{getCategoryLabel('input')} ({countByCategory.input})</option>
              <option value="global">{getCategoryLabel('global')} ({countByCategory.global})</option>
            </select>
          </div>
          {/* More — Cherry MoreHorizontal 批量操作 */}
          <div className="relative" ref={containerRef}>
            <button
              ref={buttonRef}
              onClick={toggleMenu}
              className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-transparent hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] transition-colors"
              aria-label="More"
            >
              <MoreHorizontal size={16} />
            </button>
            {isMoreOpen &&
              targetWindow &&
              createPortal(
                <div
                  ref={menuRef}
                  className="fixed min-w-40 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-secondary)] rounded-xl shadow-premium py-1.5"
                  style={menuPosition}
                  role="menu"
                >
                  <button onClick={() => { handleToggleVisible(true); closeMenu(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]" role="menuitem">Enable all visible</button>
                  <button onClick={() => { handleToggleVisible(false); closeMenu(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-primary)]" role="menuitem">Disable all visible</button>
                  <div className="my-1 border-t border-[var(--theme-border-secondary)]/60" />
                  <button onClick={() => { handleResetAll(); closeMenu(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-danger)]" role="menuitem">Reset all to defaults</button>
                </div>,
                targetWindow.document.body,
              )}
          </div>
        </div>
      </div>

      {/* List — Cherry grid: label | Kbd | switch, 按分类分组或扁平 */}
      <div className={`${SETTINGS_SECTION_CARD_CLASS} p-0 overflow-hidden`}>
        {filteredItems.length === 0 ? (
          <div className="py-10 text-center text-sm text-[var(--theme-text-secondary)]">{t('shortcutsEmpty' as never) || 'No shortcuts found'}</div>
        ) : (
          <div className="divide-y divide-[var(--theme-border-secondary)]/40">
            {filteredItems.map((item, index) => {
              const customKey = currentSettings.customShortcuts?.[item.id];
              const effectiveKey = customKey !== undefined ? customKey : item.defaultKey;
              const isEnabled = effectiveKey !== '';
              const isModified = customKey !== undefined && customKey !== item.defaultKey;
              const isLast = index === filteredItems.length - 1;
              return (
                <React.Fragment key={item.id}>
                  <div
                    data-settings-item={`shortcut-${item.id}`}
                    className={`grid grid-cols-[minmax(0,1fr)_14rem_2.5rem] items-center gap-3 px-4 py-2.5 ${!isEnabled ? 'opacity-60' : ''} ${!isLast ? 'border-b border-[var(--theme-border-secondary)]/40' : ''}`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="truncate text-[14px] font-medium text-[var(--theme-text-primary)]">{t(item.labelKey as never) as string}</div>
                      <div className="text-xs text-[var(--theme-text-secondary)] truncate">{item.id}</div>
                    </div>
                    <div className="flex min-h-9 items-center justify-end gap-2">
                      {isModified && (
                        <button
                          onClick={() => handleResetSingle(item.id)}
                          title={t('shortcutsResetDefault' as never) as string || 'Reset to default'}
                          className="p-1 rounded-md text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)] transition-colors"
                        >
                          <Undo2 size={14} />
                        </button>
                      )}
                      <ShortcutRecorder
                        value={effectiveKey}
                        defaultValue={item.defaultKey}
                        onChange={(shortcut) => handleShortcutChange(item.id, shortcut)}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Toggle
                        checked={isEnabled}
                        onChange={(v) => handleToggleEnabled(item.id, v)}
                        ariaLabel={t(item.labelKey as never) as string}
                      />
                    </div>
                  </div>
                  {item.id === 'input.cycleModels' && showTabCycleCard && (
                    <div className="px-4 pb-3 pt-1 bg-[var(--theme-bg-tertiary)]/10" data-settings-item="shortcuts-cycle-models">
                      <TabCycleModelsCard
                        availableModels={availableModels}
                        configuredIds={currentSettings.tabModelCycleIds}
                        onChange={(tabModelCycleIds) => onUpdateSettings({ tabModelCycleIds })}
                      />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
