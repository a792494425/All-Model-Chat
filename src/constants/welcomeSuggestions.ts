import type { TaskSuggestionMode } from '@/types';

export interface WelcomeSuggestionItem {
  id: 'organize' | TaskSuggestionMode;
  taskMode?: TaskSuggestionMode;
  titleKey: string;
  descKey: string;
  shortKey: string;
  tooltipActiveKey: string;
  tooltipInactiveKey: string;
  specialAction?: 'organize';
  icon: string;
}

export const SUGGESTIONS_KEYS: WelcomeSuggestionItem[] = [
  {
    id: 'organize',
    titleKey: 'suggestionHtmlTitle',
    descKey: 'suggestionHtmlDesc',
    shortKey: 'suggestionHtmlShort',
    tooltipActiveKey: 'suggestionHtmlTooltipActive',
    tooltipInactiveKey: 'suggestionHtmlTooltipInactive',
    specialAction: 'organize',
    icon: 'Palette',
  },
  {
    id: 'translate',
    taskMode: 'translate',
    titleKey: 'suggestionTranslateTitle',
    descKey: 'suggestionTranslateDesc',
    shortKey: 'suggestionTranslateShort',
    tooltipActiveKey: 'suggestionTranslateTooltipActive',
    tooltipInactiveKey: 'suggestionTranslateTooltipInactive',
    icon: 'Languages',
  },
  {
    id: 'ocr',
    taskMode: 'ocr',
    titleKey: 'suggestionOcrTitle',
    descKey: 'suggestionOcrDesc',
    shortKey: 'suggestionOcrShort',
    tooltipActiveKey: 'suggestionOcrTooltipActive',
    tooltipInactiveKey: 'suggestionOcrTooltipInactive',
    icon: 'ScanText',
  },
  {
    id: 'asr',
    taskMode: 'asr',
    titleKey: 'suggestionAsrTitle',
    descKey: 'suggestionAsrDesc',
    shortKey: 'suggestionAsrShort',
    tooltipActiveKey: 'suggestionAsrTooltipActive',
    tooltipInactiveKey: 'suggestionAsrTooltipInactive',
    icon: 'AudioWaveform',
  },
  {
    id: 'srt',
    taskMode: 'srt',
    titleKey: 'suggestionSrtTitle',
    descKey: 'suggestionSrtDesc',
    shortKey: 'suggestionSrtShort',
    tooltipActiveKey: 'suggestionSrtTooltipActive',
    tooltipInactiveKey: 'suggestionSrtTooltipInactive',
    icon: 'ClosedCaption',
  },
  {
    id: 'explain',
    taskMode: 'explain',
    titleKey: 'suggestionExplainTitle',
    descKey: 'suggestionExplainDesc',
    shortKey: 'suggestionExplainShort',
    tooltipActiveKey: 'suggestionExplainTooltipActive',
    tooltipInactiveKey: 'suggestionExplainTooltipInactive',
    icon: 'FileQuestion',
  },
  {
    id: 'summarize',
    taskMode: 'summarize',
    titleKey: 'suggestionSummarizeTitle',
    descKey: 'suggestionSummarizeDesc',
    shortKey: 'suggestionSummarizeShort',
    tooltipActiveKey: 'suggestionSummarizeTooltipActive',
    tooltipInactiveKey: 'suggestionSummarizeTooltipInactive',
    icon: 'FileText',
  },
];
