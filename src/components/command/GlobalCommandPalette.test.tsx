import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GlobalCommandPalette } from './GlobalCommandPalette';
import { useUIStore } from '@/stores/uiStore';
import { useChatStore } from '@/stores/chatStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useModelPreferencesStore } from '@/stores/modelPreferencesStore';

describe('GlobalCommandPalette', () => {
  beforeEach(() => {
    useSettingsStore.setState({ language: 'en' });
    useModelPreferencesStore.setState({ customModels: null });
    useUIStore.setState({
      isCommandPaletteOpen: true,
      isSettingsModalOpen: false,
    });
    useChatStore.setState({
      savedSessions: [
        {
          id: 'session-1',
          title: 'Vue Migration Plan',
          timestamp: Date.now(),
          messages: [],
          settings: { modelId: 'claude-sonnet-5' } as never,
          isPinned: false,
          groupId: null,
        },
        {
          id: 'session-2',
          title: 'React 19 Hooks',
          timestamp: Date.now(),
          messages: [],
          settings: { modelId: 'gpt-6-sol' } as never,
          isPinned: true,
          groupId: null,
        },
      ],
      activeSessionId: 'session-1',
      setCurrentChatSettings: vi.fn((updater) => {
        useChatStore.setState((state) => ({
          savedSessions: state.savedSessions.map((s) =>
            s.id === state.activeSessionId
              ? { ...s, settings: typeof updater === 'function' ? updater(s.settings) : updater }
              : s,
          ),
        }));
      }) as never,
    });
  });

  it('renders command palette with search input and groups in English when language is en', () => {
    render(<GlobalCommandPalette />);

    expect(screen.getByPlaceholderText(/Search sessions/i)).toBeInTheDocument();
    expect(screen.getByText('Common Actions')).toBeInTheDocument();
    expect(screen.getByText('New Chat')).toBeInTheDocument();
    expect(screen.getByText('Vue Migration Plan')).toBeInTheDocument();
    expect(screen.getByText('React 19 Hooks')).toBeInTheDocument();
    expect(screen.getByText('Switch AI Model')).toBeInTheDocument();
    expect(screen.getByText('Claude Sonnet 5')).toBeInTheDocument();
    expect(screen.getByText('GPT-6 Sol')).toBeInTheDocument();
  });

  it('renders command palette in Chinese when language is zh', () => {
    useSettingsStore.setState({ language: 'zh' });
    render(<GlobalCommandPalette />);

    expect(screen.getByPlaceholderText(/搜索会话/)).toBeInTheDocument();
    expect(screen.getByText('常用操作')).toBeInTheDocument();
    expect(screen.getByText('新建聊天')).toBeInTheDocument();
    expect(screen.getByText('切换 AI 模型')).toBeInTheDocument();
    expect(screen.getByText('打开设置面板')).toBeInTheDocument();
  });

  it('dynamically loads custom models from modelPreferencesStore', () => {
    useModelPreferencesStore.setState({
      customModels: [
        {
          id: 'my-custom-model',
          name: 'Custom Gemma 27B',
          connectionName: 'Self-Hosted',
          provider: 'Self-Hosted',
          isPinned: true,
        },
      ] as any,
    });

    render(<GlobalCommandPalette />);

    expect(screen.getByText('Custom Gemma 27B')).toBeInTheDocument();
    expect(screen.getByText('(Self-Hosted)')).toBeInTheDocument();
  });

  it('allows clicking a session item to switch session and close palette', () => {
    render(<GlobalCommandPalette />);

    const sessionItem = screen.getByText('React 19 Hooks');
    fireEvent.click(sessionItem);

    expect(useChatStore.getState().activeSessionId).toBe('session-2');
    expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);
  });

  it('allows switching model by selecting a model item', () => {
    render(<GlobalCommandPalette />);

    const gptItem = screen.getByText('GPT-6 Sol');
    fireEvent.click(gptItem);

    const session = useChatStore.getState().savedSessions.find((s) => s.id === 'session-1');
    expect(session?.settings?.modelId).toBe('gpt-6-sol');
    expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);
  });

  it('opens settings when clicking open settings command', () => {
    render(<GlobalCommandPalette />);

    const settingsItem = screen.getByText('Open Settings Panel');
    fireEvent.click(settingsItem);

    expect(useUIStore.getState().isSettingsModalOpen).toBe(true);
    expect(useUIStore.getState().isCommandPaletteOpen).toBe(false);
  });
});
