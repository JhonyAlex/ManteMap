// @vitest-environment jsdom
/**
 * Tests for LOCATION_RELATION type in createFieldValueSchema.
 *
 * Spec: openspec/changes/phase-7-locations/specs/form-generation/spec.md
 *   "Dynamic Zod schema from field definitions" — LOCATION_RELATION validates
 *   as z.string().cuid() (required) or z.string().cuid().optional() (optional)
 */

import { describe, it, expect } from 'vitest';
import { createFieldValueSchema } from '@mantemap/validation';

describe('createFieldValueSchema with LOCATION_RELATION', () => {
  it('validates required LOCATION_RELATION as cuid string', () => {
    const schema = createFieldValueSchema([
      { key: 'location', type: 'LOCATION_RELATION', required: true },
    ]);

    // Valid cuid should pass
    const valid = schema.safeParse({ location: 'clx1234567890abcdef' });
    expect(valid.success).toBe(true);
  });

  it('rejects required LOCATION_RELATION with empty value', () => {
    const schema = createFieldValueSchema([
      { key: 'location', type: 'LOCATION_RELATION', required: true },
    ]);

    const result = schema.safeParse({ location: '' });
    expect(result.success).toBe(false);
  });

  it('rejects required LOCATION_RELATION with undefined', () => {
    const schema = createFieldValueSchema([
      { key: 'location', type: 'LOCATION_RELATION', required: true },
    ]);

    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts optional LOCATION_RELATION with undefined', () => {
    const schema = createFieldValueSchema([
      { key: 'location', type: 'LOCATION_RELATION', required: false },
    ]);

    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts optional LOCATION_RELATION with null', () => {
    const schema = createFieldValueSchema([
      { key: 'location', type: 'LOCATION_RELATION', required: false },
    ]);

    const result = schema.safeParse({ location: null });
    expect(result.success).toBe(true);
  });

  it('validates LOCATION_RELATION alongside other field types', () => {
    const schema = createFieldValueSchema([
      { key: 'name', type: 'SHORT_TEXT', required: true },
      { key: 'location', type: 'LOCATION_RELATION', required: false },
    ]);

    const valid = schema.safeParse({ name: 'Test Item', location: 'clx1234567890abcdef' });
    expect(valid.success).toBe(true);

    const withoutLocation = schema.safeParse({ name: 'Test Item' });
    expect(withoutLocation.success).toBe(true);

    const emptyName = schema.safeParse({ name: '', location: 'clx1234567890abcdef' });
    expect(emptyName.success).toBe(false);
  });

  it('rejects LOCATION_RELATION with invalid (non-cuid) string', () => {
    const schema = createFieldValueSchema([
      { key: 'location', type: 'LOCATION_RELATION', required: true },
    ]);

    const result = schema.safeParse({ location: 'not-a-valid-id' });
    expect(result.success).toBe(false);
  });
});
