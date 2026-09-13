import { LOCAL_PYTHON_SYSTEM_PROMPT } from './localPython';
import type { LiveArtifactsPromptMode, TaskSuggestionMode } from '@/types';

import type { SupportedLanguage } from '@/i18n/languageRegistry';

type LiveArtifactsPromptModule = typeof import('./liveArtifacts');

export const LIVE_ARTIFACTS_PROMPT_MARKERS = [
  '[Live Artifacts Inline Protocol]',
  '[Live Artifacts Inline Protocol - zh]',
  '[Live Artifacts Inline Protocol - en]',
  '【Live Artifacts 现代化可视化排版指令】',
  '[Live Artifacts Modern Visual Layout Directive]',
  // Legacy Live Artifacts markers are recognized so old saved settings can still be toggled off.
  '[Live Artifacts Protocol]',
  '[Live Artifacts Protocol - zh]',
  '[Live Artifacts Protocol - en]',
  '[Live Artifacts Full HTML Protocol - zh]',
  '[Live Artifacts Full HTML Protocol - en]',
  // Legacy Canvas markers are recognized so old saved settings can still be toggled off.
  '[Canvas Artifact Protocol]',
  '[Canvas Artifact Protocol - zh]',
  '[Canvas Artifact Protocol - en]',
  '[Canvas Artifact Protocol v2]',
  '[Canvas Artifact Protocol v2 - zh]',
  '[Canvas Artifact Protocol v2 - en]',
  '<title>Canvas 助手：响应式视觉指南</title>',
  '<title>Canvas Assistant: Responsive Visual Guide</title>',
];
export const BBOX_PROMPT_MARKER = '**任务：** 请作为一位计算机视觉专家';
export const HD_GUIDE_PROMPT_MARKER = '### 系统提示词：高清引导标注专家';
export const TASK_SUGGESTION_PROMPT_MARKER = '[Task Directive';

export const isLiveArtifactsSystemInstruction = (instruction?: string | null) =>
  !!instruction && LIVE_ARTIFACTS_PROMPT_MARKERS.some((marker) => instruction.includes(marker));

export const isBboxSystemInstruction = (instruction?: string | null) =>
  !!instruction && instruction.includes(BBOX_PROMPT_MARKER);

export const isHdGuideSystemInstruction = (instruction?: string | null) =>
  !!instruction && instruction.includes(HD_GUIDE_PROMPT_MARKER);

export const isTaskSuggestionSystemInstruction = (instruction?: string | null) =>
  !!instruction && instruction.includes(TASK_SUGGESTION_PROMPT_MARKER);

const LIVE_ARTIFACT_PROMPT_EXPORT_BY_MODE: Record<
  LiveArtifactsPromptMode,
  { en: keyof LiveArtifactsPromptModule } & Partial<Record<SupportedLanguage, keyof LiveArtifactsPromptModule>>
> = {
  inline: {
    en: 'LIVE_ARTIFACTS_INLINE_SYSTEM_PROMPT',
    zh: 'LIVE_ARTIFACTS_INLINE_SYSTEM_PROMPT',
  },
};

export const loadLiveArtifactsSystemPrompt = async (
  language: SupportedLanguage = 'en',
  mode: LiveArtifactsPromptMode = 'inline',
): Promise<string> => {
  const prompts = await import('./liveArtifacts');
  const key = LIVE_ARTIFACT_PROMPT_EXPORT_BY_MODE[mode][language] ?? LIVE_ARTIFACT_PROMPT_EXPORT_BY_MODE[mode].en;
  return prompts[key] as string;
};

export const loadDeepSearchSystemPrompt = async () => (await import('./deepSearch')).DEEP_SEARCH_SYSTEM_PROMPT;

export const loadLocalPythonSystemPrompt = async () => LOCAL_PYTHON_SYSTEM_PROMPT;

export const loadBboxSystemPrompt = async () => (await import('./vision')).BBOX_SYSTEM_PROMPT;

export const loadHdGuideSystemPrompt = async () => (await import('./vision')).HD_GUIDE_SYSTEM_PROMPT;

export const loadTaskSuggestionSystemPrompt = async (
  mode: TaskSuggestionMode,
  language: SupportedLanguage = 'en',
): Promise<string> => {
  const { messagesTranslations } = await import('@/i18n/translations/messages');
  const descKeyMap: Record<TaskSuggestionMode, keyof typeof messagesTranslations> = {
    translate: 'suggestionTranslateDesc',
    ocr: 'suggestionOcrDesc',
    asr: 'suggestionAsrDesc',
    srt: 'suggestionSrtDesc',
    explain: 'suggestionExplainDesc',
    summarize: 'suggestionSummarizeDesc',
  };
  const titleKeyMap: Record<TaskSuggestionMode, keyof typeof messagesTranslations> = {
    translate: 'suggestionTranslateTitle',
    ocr: 'suggestionOcrTitle',
    asr: 'suggestionAsrTitle',
    srt: 'suggestionSrtTitle',
    explain: 'suggestionExplainTitle',
    summarize: 'suggestionSummarizeTitle',
  };
  const descTranslations = messagesTranslations[descKeyMap[mode]];
  const titleTranslations = messagesTranslations[titleKeyMap[mode]];
  const desc = (descTranslations as Record<string, string>)[language] ?? descTranslations.en;
  const title = (titleTranslations as Record<string, string>)[language] ?? titleTranslations.en;

  return `[Task Directive - ${mode}]\n### ${title}\n${desc}`;
};

export {
  getLiveArtifactsUserDirective,
  applyLiveArtifactsUserDirective,
  stripLiveArtifactsUserDirective,
} from './liveArtifacts';
