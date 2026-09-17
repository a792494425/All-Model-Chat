import { describe, expect, it } from 'vitest';
import {
  migrateRemovedModelId,
  ROBOTICS_MODEL,
  THINKING_BUDGET_RANGES,
} from './modelConfiguration';

describe('migrateRemovedModelId', () => {
  it('migrates legacy robotics-er-1.6-preview to ROBOTICS_MODEL (er-2)', () => {
    expect(migrateRemovedModelId('gemini-robotics-er-1.6-preview')).toBe(ROBOTICS_MODEL);
    expect(migrateRemovedModelId('models/gemini-robotics-er-1.6-preview')).toBe(ROBOTICS_MODEL);
  });

  it('migrates flash-lite and 3.5-flash legacy ids', () => {
    expect(migrateRemovedModelId('gemini-3.1-flash-lite')).toBe('gemini-3.5-flash-lite');
    expect(migrateRemovedModelId('models/gemini-3.1-flash-lite')).toBe('gemini-3.5-flash-lite');
    expect(migrateRemovedModelId('gemini-3.5-flash')).toBe('gemini-3.7-flash');
    expect(migrateRemovedModelId('models/gemini-3.5-flash')).toBe('gemini-3.7-flash');
  });

  it('preserves current supported models without modifying them', () => {
    expect(migrateRemovedModelId(ROBOTICS_MODEL)).toBe(ROBOTICS_MODEL);
    expect(migrateRemovedModelId('gemini-3.8-flash')).toBe('gemini-3.8-flash');
    expect(migrateRemovedModelId('custom-provider/custom-model')).toBe('custom-provider/custom-model');
  });

  it('handles null and undefined gracefully', () => {
    expect(migrateRemovedModelId(undefined)).toBeUndefined();
    expect(migrateRemovedModelId(null)).toBeUndefined();
    expect(migrateRemovedModelId('')).toBe('');
  });
});

describe('THINKING_BUDGET_RANGES', () => {
  it('defines thinking budget for ROBOTICS_MODEL', () => {
    expect(THINKING_BUDGET_RANGES[ROBOTICS_MODEL]).toEqual({ min: 128, max: 24576 });
    expect(THINKING_BUDGET_RANGES[`models/${ROBOTICS_MODEL}`]).toEqual({ min: 128, max: 24576 });
  });

  it('removes deprecated gemini-robotics-er-1.6-preview from budget ranges', () => {
    expect(THINKING_BUDGET_RANGES['gemini-robotics-er-1.6-preview']).toBeUndefined();
    expect(THINKING_BUDGET_RANGES['models/gemini-robotics-er-1.6-preview']).toBeUndefined();
  });
});
