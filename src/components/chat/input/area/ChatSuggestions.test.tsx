import fs from 'fs';
import path from 'path';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SUGGESTION_CHIP_ACTIVE_CLASS, SUGGESTION_CHIP_CLASS } from '@/constants/designTokens';
import { setupProviderTestRenderer as setupTestRenderer } from '@/test/render/providerRenderer';
import { ChatSuggestions } from './ChatSuggestions';

const chatSuggestionsPath = path.resolve(__dirname, './ChatSuggestions.tsx');
const suggestionIconPath = path.resolve(__dirname, './SuggestionIcon.tsx');

describe('ChatSuggestions button sizing', () => {
  it('uses shared design-token chip padding on the 4px grid', () => {
    const source = fs.readFileSync(chatSuggestionsPath, 'utf8');

    expect(source).toContain('SUGGESTION_CHIP_CLASS');
    expect(SUGGESTION_CHIP_CLASS).toContain('gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-2.5 sm:py-2');
    // Mobile chips grow to a comfortable touch target (py-2.5 → 38px tall).
    expect(SUGGESTION_CHIP_CLASS).not.toContain('py-[0.4rem]');
    expect(SUGGESTION_CHIP_CLASS).not.toContain('gap-[0.3rem]');
    expect(SUGGESTION_CHIP_CLASS).not.toContain('shadow-sm');
  });

  it('uses twenty-percent smaller suggestion icons', () => {
    const source = fs.readFileSync(suggestionIconPath, 'utf8');

    expect(source).toContain('const size = 13;');
    expect(source).not.toContain('const size = 16;');
  });

  it('gives chips the app-standard keyboard focus ring', () => {
    const focusRing =
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--theme-border-focus)]';
    expect(SUGGESTION_CHIP_CLASS).toContain(focusRing);
    expect(SUGGESTION_CHIP_ACTIVE_CLASS).toContain(focusRing);
  });

  it('strengthens the idle hover affordance with a focus-colored border', () => {
    expect(SUGGESTION_CHIP_CLASS).toContain('hover:border-[var(--theme-border-focus)]');
  });

  it('uses a balanced light tint and focus border for active suggestion chips', () => {
    expect(SUGGESTION_CHIP_ACTIVE_CLASS).toContain('bg-[var(--theme-bg-accent)]/15');
    expect(SUGGESTION_CHIP_ACTIVE_CLASS).toContain('border-[var(--theme-border-focus)]');
    expect(SUGGESTION_CHIP_ACTIVE_CLASS).toContain('text-[var(--theme-text-primary)]');
  });

  it('keeps scroll arrows reachable and visible for keyboard focus', () => {
    const source = fs.readFileSync(chatSuggestionsPath, 'utf8');

    expect(source).toContain('focus-visible:opacity-100');
    expect(source).toContain('focus-visible:pointer-events-auto');
  });

  it('routes the Guide icon through SuggestionIcon like every other chip', () => {
    const source = fs.readFileSync(chatSuggestionsPath, 'utf8');
    const iconSource = fs.readFileSync(suggestionIconPath, 'utf8');

    expect(source).not.toContain('MousePointer2 size');
    expect(source).toContain('iconName="MousePointer2"');
    expect(iconSource).toContain("case 'MousePointer2'");
  });
});

describe('ChatSuggestions rendering', () => {
  const renderer = setupTestRenderer({ providers: { language: 'en' } });

  const renderSuggestions = async () => {
    await act(async () => {
      renderer.root.render(
        <ChatSuggestions
          show
          isFullscreen={false}
          onSuggestionClick={vi.fn()}
          onOrganizeInfoClick={vi.fn()}
          onToggleBBox={vi.fn()}
          isBBoxModeActive={false}
          onToggleGuide={vi.fn()}
          isGuideModeActive={false}
        />,
      );
    });
  };

  it('applies the fade mask only while the row actually overflows', async () => {
    await renderSuggestions();

    const row = renderer.container.querySelector('div.no-scrollbar');
    expect(row).not.toBeNull();
    expect(row?.className).not.toContain('fade-mask-x');

    Object.defineProperty(row, 'scrollWidth', { value: 1200, configurable: true });
    Object.defineProperty(row, 'clientWidth', { value: 300, configurable: true });
    await act(async () => {
      window.dispatchEvent(new Event('resize'));
    });

    // Only the trailing edge hides chips at scroll position 0 — leading edge stays crisp.
    expect(row?.className).toContain('fade-mask-x-r');
    expect(row?.className).not.toContain('fade-mask-x-l');
  });

  it('marks toggle chips (BBox / Guide) with a trailing state dot', async () => {
    await renderSuggestions();

    const buttons = Array.from(renderer.container.querySelectorAll('button')).filter(
      (button) =>
        button.getAttribute('aria-label') !==
        renderer.container.querySelector('button[aria-label*="scroll" i]')?.getAttribute('aria-label'),
    );
    const toggles = buttons.filter((button) => button.hasAttribute('aria-pressed'));
    const actions = buttons.filter((button) => !button.hasAttribute('aria-pressed'));

    expect(toggles.length).toBe(2);
    for (const toggle of toggles) {
      expect(toggle.querySelector('span.rounded-full.bg-current')).not.toBeNull();
    }
    for (const action of actions) {
      expect(action.querySelector('span.rounded-full.bg-current')).toBeNull();
    }
  });

  it('renders media navigation chips only when the respective toggle handlers are provided', async () => {
    await act(async () => {
      renderer.root.render(
        <ChatSuggestions
          show
          isFullscreen={false}
          onSuggestionClick={vi.fn()}
          onOrganizeInfoClick={vi.fn()}
          onToggleBBox={vi.fn()}
          isBBoxModeActive={false}
          onToggleGuide={vi.fn()}
          isGuideModeActive={false}
          onTogglePdfNav={vi.fn()}
        />,
      );
    });

    expect(renderer.container.querySelector('[data-testid="image-nav-chip"]')).toBeNull();
    expect(renderer.container.querySelector('[data-testid="pdf-nav-chip"]')).not.toBeNull();
    expect(renderer.container.querySelector('[data-testid="video-nav-chip"]')).toBeNull();
    expect(renderer.container.querySelector('[data-testid="audio-nav-chip"]')).toBeNull();
  });

  it('renders image nav chip and hides legacy bbox/guide buttons when onToggleImageNav is provided', async () => {
    const handleToggleImageNav = vi.fn();
    await act(async () => {
      renderer.root.render(
        <ChatSuggestions
          show
          isFullscreen={false}
          onSuggestionClick={vi.fn()}
          onOrganizeInfoClick={vi.fn()}
          onToggleBBox={vi.fn()}
          isBBoxModeActive={false}
          onToggleGuide={vi.fn()}
          isGuideModeActive={false}
          onToggleImageNav={handleToggleImageNav}
        />,
      );
    });

    const imageChip = renderer.container.querySelector('[data-testid="image-nav-chip"]');
    expect(imageChip).not.toBeNull();
    // Legacy bbox and guide buttons should not be rendered
    expect(renderer.container.querySelector('button[aria-label*="BBox" i]')).toBeNull();
    expect(renderer.container.querySelector('button[aria-label*="Guide" i]')).toBeNull();
  });

  it('renders organize chip without aria-pressed when isLiveArtifactsPromptActive is undefined', async () => {
    await act(async () => {
      renderer.root.render(
        <ChatSuggestions show isFullscreen={false} onSuggestionClick={vi.fn()} onOrganizeInfoClick={vi.fn()} />,
      );
    });

    const organizeChip = renderer.container.querySelector('[data-testid="organize-info-chip"]');
    expect(organizeChip).not.toBeNull();
    expect(organizeChip?.className).toContain(SUGGESTION_CHIP_CLASS);
    expect(organizeChip?.hasAttribute('aria-pressed')).toBe(false);
    expect(organizeChip?.querySelector('span.rounded-full.bg-current')).toBeNull();
  });

  it('renders organize chip as an active toggle chip when isLiveArtifactsPromptActive is true', async () => {
    await act(async () => {
      renderer.root.render(
        <ChatSuggestions
          show
          isFullscreen={false}
          onSuggestionClick={vi.fn()}
          onOrganizeInfoClick={vi.fn()}
          isLiveArtifactsPromptActive={true}
        />,
      );
    });

    const organizeChip = renderer.container.querySelector('[data-testid="organize-info-chip"]');
    expect(organizeChip).not.toBeNull();
    expect(organizeChip?.className).toContain(SUGGESTION_CHIP_ACTIVE_CLASS);
    expect(organizeChip?.getAttribute('aria-pressed')).toBe('true');
    expect(organizeChip?.querySelector('[data-testid="chip-dismiss-icon"]')).toBeNull();
  });

  it('renders organize chip as an inactive toggle chip when isLiveArtifactsPromptActive is false', async () => {
    await act(async () => {
      renderer.root.render(
        <ChatSuggestions
          show
          isFullscreen={false}
          onSuggestionClick={vi.fn()}
          onOrganizeInfoClick={vi.fn()}
          isLiveArtifactsPromptActive={false}
        />,
      );
    });

    const organizeChip = renderer.container.querySelector('[data-testid="organize-info-chip"]');
    expect(organizeChip).not.toBeNull();
    expect(organizeChip?.className).toContain(SUGGESTION_CHIP_CLASS);
    expect(organizeChip?.getAttribute('aria-pressed')).toBe('false');
    expect(organizeChip?.querySelector('[data-testid="chip-dismiss-icon"]')).toBeNull();
  });

  it('renders task suggestion chips as toggle chips with active state when activeTaskSuggestion matches', async () => {
    await act(async () => {
      renderer.root.render(
        <ChatSuggestions show isFullscreen={false} activeTaskSuggestion="translate" onToggleTaskSuggestion={vi.fn()} />,
      );
    });

    const translateChip = renderer.container.querySelector('[data-testid="suggestion-chip-translate"]');
    expect(translateChip).not.toBeNull();
    expect(translateChip?.className).toContain(SUGGESTION_CHIP_ACTIVE_CLASS);
    expect(translateChip?.getAttribute('aria-pressed')).toBe('true');
    expect(translateChip?.getAttribute('title')).toContain('Bilingual translation active');

    const ocrChip = renderer.container.querySelector('[data-testid="suggestion-chip-ocr"]');
    expect(ocrChip).not.toBeNull();
    expect(ocrChip?.className).toContain(SUGGESTION_CHIP_CLASS);
    expect(ocrChip?.getAttribute('aria-pressed')).toBe('false');
    expect(ocrChip?.getAttribute('title')).toContain('Enable OCR');
  });

  it('calls onToggleTaskSuggestion when clicking a task suggestion chip without calling onSuggestionClick', async () => {
    const onToggleTaskSuggestion = vi.fn();
    const onSuggestionClick = vi.fn();

    await act(async () => {
      renderer.root.render(
        <ChatSuggestions
          show
          isFullscreen={false}
          activeTaskSuggestion={null}
          onToggleTaskSuggestion={onToggleTaskSuggestion}
          onSuggestionClick={onSuggestionClick}
        />,
      );
    });

    const translateChip = renderer.container.querySelector(
      '[data-testid="suggestion-chip-translate"]',
    ) as HTMLButtonElement;
    expect(translateChip).not.toBeNull();

    await act(async () => {
      translateChip.click();
    });

    expect(onToggleTaskSuggestion).toHaveBeenCalledWith('translate');
    expect(onSuggestionClick).not.toHaveBeenCalled();
  });

  it('allows Live Artifacts presentation chip and task suggestion chip to be active simultaneously', async () => {
    await act(async () => {
      renderer.root.render(
        <ChatSuggestions
          show
          isFullscreen={false}
          isLiveArtifactsPromptActive={true}
          activeTaskSuggestion="summarize"
          onToggleTaskSuggestion={vi.fn()}
          onToggleLiveArtifactsPrompt={vi.fn()}
        />,
      );
    });

    const organizeChip = renderer.container.querySelector('[data-testid="organize-info-chip"]');
    const summarizeChip = renderer.container.querySelector('[data-testid="suggestion-chip-summarize"]');

    expect(organizeChip?.className).toContain(SUGGESTION_CHIP_ACTIVE_CLASS);
    expect(organizeChip?.getAttribute('aria-pressed')).toBe('true');

    expect(summarizeChip?.className).toContain(SUGGESTION_CHIP_ACTIVE_CLASS);
    expect(summarizeChip?.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders both core toggle chips and text suggestion chips when isSessionEmpty is true', async () => {
    await act(async () => {
      renderer.root.render(
        <ChatSuggestions
          show
          isFullscreen={false}
          isSessionEmpty={true}
          onSuggestionClick={vi.fn()}
          onOrganizeInfoClick={vi.fn()}
          onTogglePdfNav={vi.fn()}
        />,
      );
    });

    expect(renderer.container.querySelector('[data-testid="organize-info-chip"]')).not.toBeNull();
    expect(renderer.container.querySelector('[data-testid="pdf-nav-chip"]')).not.toBeNull();
    expect(renderer.container.querySelector('[data-testid="suggestion-chip-translate"]')).not.toBeNull();
    expect(renderer.container.querySelector('[data-testid="suggestion-chip-summarize"]')).not.toBeNull();
  });

  it('renders only core toggle chips and hides text suggestion chips when isSessionEmpty is false', async () => {
    await act(async () => {
      renderer.root.render(
        <ChatSuggestions
          show
          isFullscreen={false}
          isSessionEmpty={false}
          onSuggestionClick={vi.fn()}
          onOrganizeInfoClick={vi.fn()}
          onTogglePdfNav={vi.fn()}
        />,
      );
    });

    expect(renderer.container.querySelector('[data-testid="organize-info-chip"]')).not.toBeNull();
    expect(renderer.container.querySelector('[data-testid="pdf-nav-chip"]')).not.toBeNull();
    expect(renderer.container.querySelector('[data-testid="suggestion-chip-translate"]')).toBeNull();
    expect(renderer.container.querySelector('[data-testid="suggestion-chip-summarize"]')).toBeNull();
  });
});
