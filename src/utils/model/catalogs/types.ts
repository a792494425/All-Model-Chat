import type { ModelCapabilities } from '@/types';

export interface CatalogModelSpec {
  id: string;
  name: string;
  contextWindow: number;
  maxOutputTokens: number;
  capabilities: ModelCapabilities;
  ownedBy: string;
}
