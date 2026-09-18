import { useState, useEffect, useRef, useCallback } from 'react';
import type { SavedChatSession, ChatGroup } from '@/types';
import { useWindowContext } from '@/contexts/WindowContext';

interface UseSidebarRenameAndMenuProps {
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onRenameGroup: (groupId: string, newTitle: string) => void;
}

export const useSidebarRenameAndMenu = ({ onRenameSession, onRenameGroup }: UseSidebarRenameAndMenuProps) => {
  const [editingItem, setEditingItem] = useState<{ type: 'session' | 'group'; id: string; title: string } | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const { document: targetDocument, window: targetWindow } = useWindowContext();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (
        target?.closest?.('[data-radix-menu-content]') ||
        target?.closest?.('[data-radix-popper-content-wrapper]') ||
        target?.closest?.('[role="menu"]') ||
        target?.closest?.('[role="menuitem"]')
      ) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    if (activeMenu) {
      targetDocument.addEventListener('mousedown', handleClickOutside);
    }
    return () => targetDocument.removeEventListener('mousedown', handleClickOutside);
  }, [activeMenu, targetDocument]);

  useEffect(() => {
    if (!editingItem) return undefined;
    const focusAndSelect = () => {
      if (editInputRef.current) {
        editInputRef.current.focus();
        editInputRef.current.select();
      }
    };
    focusAndSelect();
    const frameId = targetWindow.requestAnimationFrame(focusAndSelect);
    return () => targetWindow.cancelAnimationFrame(frameId);
  }, [editingItem, targetWindow]);

  const handleStartEdit = useCallback((type: 'session' | 'group', item: SavedChatSession | ChatGroup) => {
    const title = 'title' in item ? item.title : '';
    setEditingItem({ type, id: item.id, title });
    setActiveMenu(null);
  }, []);

  const handleRenameConfirm = useCallback(() => {
    if (!editingItem || !editingItem.title.trim()) {
      setEditingItem(null);
      return;
    }
    if (editingItem.type === 'session') {
      onRenameSession(editingItem.id, editingItem.title.trim());
    } else if (editingItem.type === 'group') {
      onRenameGroup(editingItem.id, editingItem.title.trim());
    }
    setEditingItem(null);
  }, [editingItem, onRenameGroup, onRenameSession]);

  const handleRenameCancel = useCallback(() => {
    setEditingItem(null);
  }, []);

  const handleRenameKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
        handleRenameConfirm();
      } else if (event.key === 'Escape') {
        handleRenameCancel();
      }
    },
    [handleRenameCancel, handleRenameConfirm],
  );

  const toggleMenu = useCallback((event: React.MouseEvent, id: string) => {
    event.stopPropagation();
    setActiveMenu((prev) => (prev === id ? null : id));
  }, []);

  return {
    editingItem,
    setEditingItem,
    activeMenu,
    setActiveMenu,
    menuRef,
    editInputRef,
    handleStartEdit,
    handleRenameConfirm,
    handleRenameCancel,
    handleRenameKeyDown,
    toggleMenu,
  };
};
