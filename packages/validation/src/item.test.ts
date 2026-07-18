import { describe, expect, it } from 'vitest';
import {
  createItemSchema,
  updateItemSchema,
  transitionStatusSchema,
} from './item';

// ---------------------------------------------------------------------------
// createItemSchema
// ---------------------------------------------------------------------------
describe('createItemSchema', () => {
  const validInput = {
    name: 'Industrial Pump A',
    itemTypeId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
    fieldValues: [
      { dynamicFieldId: 'clfieldxxxxxxxxxxxxxxxxx', value: 'Widget' },
    ],
  };

  it('accepts valid input with required fields only', () => {
    const result = createItemSchema.safeParse({
      name: 'Pump',
      itemTypeId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Pump');
      expect(result.data.itemTypeId).toBe('clxxxxxxxxxxxxxxxxxxxxxxxx');
      expect(result.data.slug).toBeUndefined();
      expect(result.data.statusId).toBeUndefined();
      expect(result.data.fieldValues).toBeUndefined();
    }
  });

  it('accepts valid input with all optional fields', () => {
    const result = createItemSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fieldValues).toHaveLength(1);
      expect(result.data.fieldValues![0].dynamicFieldId).toBe('clfieldxxxxxxxxxxxxxxxxx');
      expect(result.data.fieldValues![0].value).toBe('Widget');
    }
  });

  it('accepts explicit slug', () => {
    const result = createItemSchema.safeParse({
      name: 'Pump',
      slug: 'custom-pump',
      itemTypeId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe('custom-pump');
    }
  });

  it('accepts explicit statusId', () => {
    const result = createItemSchema.safeParse({
      name: 'Pump',
      itemTypeId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
      statusId: 'clstatusxxxxxxxxxxxxxxxxx',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.statusId).toBe('clstatusxxxxxxxxxxxxxxxxx');
    }
  });

  it('rejects empty name', () => {
    const result = createItemSchema.safeParse({
      name: '',
      itemTypeId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = createItemSchema.safeParse({
      itemTypeId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 200 characters', () => {
    const result = createItemSchema.safeParse({
      name: 'A'.repeat(201),
      itemTypeId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
    });
    expect(result.success).toBe(false);
  });

  it('trims name whitespace', () => {
    const result = createItemSchema.safeParse({
      name: '  Pump  ',
      itemTypeId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Pump');
    }
  });

  it('rejects missing itemTypeId', () => {
    const result = createItemSchema.safeParse({
      name: 'Pump',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid slug format', () => {
    const result = createItemSchema.safeParse({
      name: 'Pump',
      slug: 'Invalid Slug!',
      itemTypeId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty fieldValues array', () => {
    const result = createItemSchema.safeParse({
      name: 'Pump',
      itemTypeId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
      fieldValues: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fieldValues).toEqual([]);
    }
  });

  it('accepts fieldValues with null value', () => {
    const result = createItemSchema.safeParse({
      name: 'Pump',
      itemTypeId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
      fieldValues: [
        { dynamicFieldId: 'clfieldxxxxxxxxxxxxxxxxx', value: null },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fieldValues![0].value).toBeNull();
    }
  });

  it('rejects fieldValues with missing dynamicFieldId', () => {
    const result = createItemSchema.safeParse({
      name: 'Pump',
      itemTypeId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
      fieldValues: [
        { value: 'Widget' },
      ],
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateItemSchema
// ---------------------------------------------------------------------------
describe('updateItemSchema', () => {
  it('accepts partial update with name only', () => {
    const result = updateItemSchema.safeParse({ name: 'Updated Pump' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Updated Pump');
    }
  });

  it('accepts partial update with statusId only', () => {
    const result = updateItemSchema.safeParse({ statusId: 'clstatusxxxxxxxxxxxxxxxxx' });
    expect(result.success).toBe(true);
  });

  it('accepts partial update with fieldValues only', () => {
    const result = updateItemSchema.safeParse({
      fieldValues: [
        { dynamicFieldId: 'clfieldxxxxxxxxxxxxxxxxx', value: 42 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts update with all fields', () => {
    const result = updateItemSchema.safeParse({
      name: 'Updated',
      statusId: 'clstatusxxxxxxxxxxxxxxxxx',
      fieldValues: [
        { dynamicFieldId: 'clfieldxxxxxxxxxxxxxxxxx', value: 'New' },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty update (no fields provided)', () => {
    const result = updateItemSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 200 characters', () => {
    const result = updateItemSchema.safeParse({ name: 'A'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('trims name whitespace', () => {
    const result = updateItemSchema.safeParse({ name: '  Updated  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Updated');
    }
  });
});

// ---------------------------------------------------------------------------
// transitionStatusSchema
// ---------------------------------------------------------------------------
describe('transitionStatusSchema', () => {
  it('accepts valid statusId', () => {
    const result = transitionStatusSchema.safeParse({
      statusId: 'clstatusxxxxxxxxxxxxxxxxx',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.statusId).toBe('clstatusxxxxxxxxxxxxxxxxx');
    }
  });

  it('rejects missing statusId', () => {
    const result = transitionStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty statusId', () => {
    const result = transitionStatusSchema.safeParse({ statusId: '' });
    expect(result.success).toBe(false);
  });
});
