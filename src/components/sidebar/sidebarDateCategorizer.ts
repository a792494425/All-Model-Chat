import type { SavedChatSession } from '@/types';
import type { SupportedLanguage } from '@/i18n/languageRegistry';

export type HistoryTranslator = (key: string) => string;

// BCP-47 locales for month-name buckets in the sidebar date grouping.
const DATE_LOCALES: Record<SupportedLanguage, string> = {
  en: 'en-US',
  zh: 'zh-CN-u-nu-hanidec',
  ja: 'ja-JP',
  ko: 'ko-KR',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
};

export const categorizeSessionsByDate = (
  sessions: SavedChatSession[],
  language: SupportedLanguage,
  t: HistoryTranslator,
  now: Date = new Date(),
) => {
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);
  const sevenDaysAgoStart = new Date(todayStart);
  sevenDaysAgoStart.setDate(todayStart.getDate() - 8);
  const thirtyDaysAgoStart = new Date(todayStart);
  thirtyDaysAgoStart.setDate(todayStart.getDate() - 30);

  const categories: { [key: string]: SavedChatSession[] } = {};

  const categoryKeys = {
    today: t('historyToday'),
    yesterday: t('historyYesterday'),
    sevenDays: t('history7Days'),
    thirtyDays: t('history30Days'),
  };

  sessions.forEach((session) => {
    const sessionDate = new Date(session.timestamp);
    let categoryName: string;

    if (sessionDate >= todayStart) {
      categoryName = categoryKeys.today;
    } else if (sessionDate >= yesterdayStart) {
      categoryName = categoryKeys.yesterday;
    } else if (sessionDate >= sevenDaysAgoStart) {
      categoryName = categoryKeys.sevenDays;
    } else if (sessionDate >= thirtyDaysAgoStart) {
      categoryName = categoryKeys.thirtyDays;
    } else {
      categoryName = new Intl.DateTimeFormat(DATE_LOCALES[language] ?? 'en-US', {
        year: 'numeric',
        month: 'long',
      }).format(sessionDate);
    }

    if (!categories[categoryName]) {
      categories[categoryName] = [];
    }
    categories[categoryName].push(session);
  });

  const staticOrder = [categoryKeys.today, categoryKeys.yesterday, categoryKeys.sevenDays, categoryKeys.thirtyDays];
  const monthCategories = Object.keys(categories)
    .filter((name) => !staticOrder.includes(name))
    .sort((monthA, monthB) => {
      const dateA = new Date(categories[monthA][0].timestamp);
      const dateB = new Date(categories[monthB][0].timestamp);
      return dateB.getTime() - dateA.getTime();
    });

  const categoryOrder = [...staticOrder, ...monthCategories].filter(
    (name) => categories[name] && categories[name].length > 0,
  );

  return { categories, categoryOrder };
};
