import type { ModelOption } from '@/types';

export type FilterTab = 'all' | 'new' | 'stale' | 'existing';

export interface ModelSyncDisplayItem {
  model: ModelOption;
  status: 'new' | 'existing' | 'stale';
}
