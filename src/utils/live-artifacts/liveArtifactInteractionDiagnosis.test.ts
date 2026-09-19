import { describe, it, expect } from 'vitest';
import { diagnoseLiveArtifactInteraction } from './liveArtifactInteractionDiagnosis';
import {
  hasLiveArtifactInteractionShape,
  getLiveArtifactInteractionFields,
  getLiveArtifactInteractionDefaultValue,
  buildLiveArtifactInteractionPayload,
} from './liveArtifactInteraction';

describe('liveArtifactInteractionDiagnosis', () => {
  it('successfully diagnoses and normalizes a valid spec', () => {
    const raw = JSON.stringify({
      version: 1,
      title: 'Feedback Form',
      description: 'Please rate your experience',
      instruction: 'Submit user ratings',
      submitLabel: 'Send Ratings',
      schema: {
        type: 'object',
        required: ['rating', 'comment'],
        properties: {
          rating: {
            type: 'integer',
            title: 'Star Rating',
            minimum: 1,
            maximum: 5,
            default: 5,
          },
          comment: {
            type: 'string',
            title: 'Your Thoughts',
            format: 'textarea',
          },
          recommend: {
            type: 'boolean',
            default: true,
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['fast', 'helpful', 'accurate'],
            },
            default: ['fast'],
          },
        },
      },
    });

    const diagnosis = diagnoseLiveArtifactInteraction(raw);
    expect(diagnosis.errors).toEqual([]);
    expect(diagnosis.repairs).toEqual([]);
    expect(diagnosis.spec).not.toBeNull();
    expect(diagnosis.spec?.title).toBe('Feedback Form');
    expect(diagnosis.spec?.instruction).toBe('Submit user ratings');
    expect(diagnosis.spec?.schema.properties.rating.type).toBe('integer');
    expect(diagnosis.spec?.schema.required).toEqual(['rating', 'comment']);
  });

  it('handles invalid JSON string gracefully', () => {
    const diagnosis = diagnoseLiveArtifactInteraction('{ broken json');
    expect(diagnosis.spec).toBeNull();
    expect(diagnosis.errors.length).toBeGreaterThan(0);
    expect(diagnosis.errors[0].code).toBe('INVALID_JSON');
  });

  it('rejects non-object root JSON values', () => {
    const diagnosis = diagnoseLiveArtifactInteraction('[1, 2, 3]');
    expect(diagnosis.spec).toBeNull();
    expect(diagnosis.errors[0].code).toBe('NOT_OBJECT');
  });

  it('rejects specs missing required instruction field', () => {
    const raw = JSON.stringify({
      version: 1,
      schema: {
        type: 'object',
        properties: {
          field1: { type: 'string' },
        },
      },
    });

    const diagnosis = diagnoseLiveArtifactInteraction(raw);
    expect(diagnosis.spec).toBeNull();
    expect(diagnosis.errors.some((e) => e.code === 'INSTRUCTION_MISSING')).toBe(true);
  });

  it('truncates overlong title and description with repair records', () => {
    const overlongTitle = 'A'.repeat(600);
    const raw = JSON.stringify({
      version: 1,
      title: overlongTitle,
      instruction: 'Do something',
      schema: {
        type: 'object',
        properties: {
          note: { type: 'string' },
        },
      },
    });

    const diagnosis = diagnoseLiveArtifactInteraction(raw);
    expect(diagnosis.errors).toEqual([]);
    expect(diagnosis.repairs.some((r) => r.code === 'TITLE_TOO_LONG')).toBe(true);
    expect(diagnosis.spec?.title?.length).toBe(500);
  });

  it('detects incompatible format and type combinations', () => {
    const raw = JSON.stringify({
      version: 1,
      instruction: 'Fill out',
      schema: {
        type: 'object',
        properties: {
          badField: {
            type: 'number',
            format: 'textarea',
          },
        },
      },
    });

    const diagnosis = diagnoseLiveArtifactInteraction(raw);
    expect(diagnosis.spec).toBeNull();
    expect(diagnosis.errors.some((e) => e.code === 'FORMAT_TYPE_MISMATCH')).toBe(true);
  });

  it('coerces stringified numbers and records repair', () => {
    const raw = JSON.stringify({
      version: 1,
      instruction: 'Set amount',
      schema: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            default: '42.5',
          },
        },
      },
    });

    const diagnosis = diagnoseLiveArtifactInteraction(raw);
    expect(diagnosis.errors).toEqual([]);
    expect(diagnosis.repairs.some((r) => r.code === 'DEFAULT_TYPE_MISMATCH')).toBe(true);
    expect(diagnosis.spec?.schema.properties.amount.default).toBe(42.5);
  });

  it('rejects minimum greater than maximum', () => {
    const raw = JSON.stringify({
      version: 1,
      instruction: 'Set range',
      schema: {
        type: 'object',
        properties: {
          val: {
            type: 'integer',
            minimum: 10,
            maximum: 2,
          },
        },
      },
    });

    const diagnosis = diagnoseLiveArtifactInteraction(raw);
    expect(diagnosis.spec).toBeNull();
    expect(diagnosis.errors.some((e) => e.code === 'RANGE_MIN_GT_MAX')).toBe(true);
  });

  it('correctly reports quick shape check and default values', () => {
    expect(hasLiveArtifactInteractionShape('{"instruction": "x", "schema": {}}')).toBe(true);
    expect(hasLiveArtifactInteractionShape('plain text')).toBe(false);

    expect(getLiveArtifactInteractionDefaultValue({ type: 'boolean' })).toBe(false);
    expect(getLiveArtifactInteractionDefaultValue({ type: 'array', items: { type: 'string', enum: ['a'] } })).toEqual(
      [],
    );
    expect(getLiveArtifactInteractionDefaultValue({ type: 'string', enum: ['first', 'second'] })).toBe('first');
    expect(getLiveArtifactInteractionDefaultValue({ type: 'number', default: 99 })).toBe(99);
  });

  it('builds followup payload and extracts fields correctly', () => {
    const spec = {
      version: 1 as const,
      title: 'Quick Test',
      instruction: 'Proceed with args',
      schema: {
        type: 'object' as const,
        required: ['name'],
        properties: {
          name: { type: 'string' as const, title: 'User Name' },
        },
      },
    };

    const fields = getLiveArtifactInteractionFields(spec);
    expect(fields).toHaveLength(1);
    expect(fields[0].key).toBe('name');
    expect(fields[0].label).toBe('User Name');
    expect(fields[0].required).toBe(true);

    const payload = buildLiveArtifactInteractionPayload(spec, { name: 'Alice' });
    expect(payload.instruction).toBe('Proceed with args');
    expect(payload.title).toBe('Quick Test');
    expect(payload.state).toEqual({ name: 'Alice' });
  });
});
