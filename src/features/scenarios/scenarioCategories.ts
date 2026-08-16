import { type ScenarioCategory } from '@/types';
import { Brain, Heart, Sparkles, Shield, MessageSquare } from 'lucide-react';

export const CATEGORY_META = {
  assistant: {
    icon: Brain,
    labelKey: 'scenariosCategoryAssistant',
  },
  roleplay: {
    icon: Heart,
    labelKey: 'scenariosCategoryRoleplay',
  },
  creative: {
    icon: Sparkles,
    labelKey: 'scenariosCategoryCreative',
  },
  system: {
    icon: Shield,
    labelKey: 'scenariosCategorySystem',
  },
  custom: {
    icon: MessageSquare,
    labelKey: 'scenariosCategoryCustom',
  },
};

export const DEFAULT_CATEGORY: ScenarioCategory = 'custom';

export const getCategory = (category?: ScenarioCategory): ScenarioCategory => category ?? DEFAULT_CATEGORY;

export const CATEGORY_ORDER: ScenarioCategory[] = ['assistant', 'roleplay', 'creative', 'system', 'custom'];
