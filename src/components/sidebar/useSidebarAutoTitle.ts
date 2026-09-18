import { useState, useEffect, useRef, useCallback } from 'react';
import type { SavedChatSession } from '@/types';
import type { SupportedLanguage } from '@/i18n/languageRegistry';
import { logService } from '@/services/logService';
import { dbService } from '@/services/db/dbService';
import { toastInfo, toastError } from '@/stores/toastStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useChatStore } from '@/stores/chatStore';
import { autoTitleSession } from '@/features/auto-titling/autoTitleSession';

const TITLE_UPDATE_FEEDBACK_MS = 1500;

interface UseSidebarAutoTitleProps {
  sessions: SavedChatSession[];
  generatingTitleSessionIds: Set<string>;
  language: SupportedLanguage;
  t: (key: string) => string;
  onRegenerateTitleSessionProp?: (sessionId: string) => void | Promise<void>;
}

export const useSidebarAutoTitle = ({
  sessions,
  generatingTitleSessionIds,
  language,
  t,
  onRegenerateTitleSessionProp,
}: UseSidebarAutoTitleProps) => {
  const [newlyTitledSessionIds, setNewlyTitledSessionIds] = useState<ReadonlySet<string>>(new Set());

  const prevGeneratingTitleSessionIdsRef = useRef<Set<string>>(new Set());
  const titleTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const prevIds = prevGeneratingTitleSessionIdsRef.current;
    const completedIds = new Set<string>();
    prevIds.forEach((id) => {
      if (!generatingTitleSessionIds.has(id)) completedIds.add(id);
    });

    prevGeneratingTitleSessionIdsRef.current = generatingTitleSessionIds;
    if (completedIds.size === 0) return;

    const timer = setTimeout(() => {
      setNewlyTitledSessionIds((prev) => {
        const next = new Set(prev);
        completedIds.forEach((id) => next.add(id));
        return next;
      });
      completedIds.forEach((completedId) => {
        const existing = titleTimersRef.current.get(completedId);
        if (existing) clearTimeout(existing);
        titleTimersRef.current.set(
          completedId,
          setTimeout(() => {
            titleTimersRef.current.delete(completedId);
            setNewlyTitledSessionIds((prev) => {
              const next = new Set(prev);
              next.delete(completedId);
              return next;
            });
          }, TITLE_UPDATE_FEEDBACK_MS),
        );
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [generatingTitleSessionIds]);

  // Clean up all pending title animation timers on unmount.
  useEffect(
    () => () => {
      titleTimersRef.current.forEach((timer) => clearTimeout(timer));
      titleTimersRef.current.clear();
    },
    [],
  );

  const handleRegenerateTitle = useCallback(
    async (sessionId: string) => {
      if (onRegenerateTitleSessionProp) {
        await onRegenerateTitleSessionProp(sessionId);
        return;
      }

      if (generatingTitleSessionIds.has(sessionId)) {
        return;
      }

      let session = sessions.find((item) => item.id === sessionId);
      if (!session || session.messages.length === 0) {
        try {
          const loaded = await dbService.getSession(sessionId);
          if (loaded) {
            session = loaded;
          }
        } catch (loadSessionError) {
          logService.warn('Failed to load session for regenerate title', { sessionId, loadSessionError });
        }
      }

      const { activeSessionId, activeMessages } = useChatStore.getState();
      if (activeSessionId === sessionId && activeMessages.length > 0 && session) {
        session = {
          ...session,
          messages: activeMessages,
        };
      }

      if (!session || session.messages.length === 0) {
        toastInfo(t('regenerateTitleEmpty'));
        return;
      }

      const hasCompletedExchange =
        session.messages.some((message) => message.role === 'user' && message.content.trim() !== '') &&
        session.messages.some(
          (message) => message.role === 'model' && message.content.trim() !== '' && !message.stoppedByUser,
        );

      if (!hasCompletedExchange) {
        toastInfo(t('regenerateTitleEmpty'));
        return;
      }

      useChatStore.getState().setGeneratingTitleSessionIds((prev) => new Set(prev).add(sessionId));
      try {
        const appSettings = useSettingsStore.getState().appSettings;
        const success = await autoTitleSession({
          session,
          appSettings,
          language,
          updateAndPersistSessions: useChatStore.getState().updateAndPersistSessions,
          force: true,
        });
        if (!success) {
          toastError(t('regenerateTitleFailed'));
        }
      } catch (regenerateTitleError) {
        logService.error('Failed to regenerate title', regenerateTitleError);
        toastError(t('regenerateTitleFailed'));
      } finally {
        useChatStore.getState().setGeneratingTitleSessionIds((prev) => {
          const next = new Set(prev);
          next.delete(sessionId);
          return next;
        });
      }
    },
    [generatingTitleSessionIds, language, onRegenerateTitleSessionProp, sessions, t],
  );

  return {
    newlyTitledSessionIds,
    handleRegenerateTitle,
  };
};
