import { describe, it, expect } from 'vitest';
import {
  createDynamicFieldSchema,
  updateDynamicFieldSchema,
  reorderFieldsSchema,
  dynamicFieldTypeEnum,
} from './dynamic-field';

// ---------------------------------------------------------------------------
// Enum completeness — must match shared DynamicFieldType union
// ---------------------------------------------------------------------------
describe('dynamicFieldTypeEnum', () => {
  const sharedTypes = [
    'SHORT_TEXT',
    'LONG_TEXT',
    'NUMBER',
    'DECIMAL',
    'CURRENCY',
    'BOOLEAN',
    'DATE',
    'DATETIME',
    'SELECT',
    'MULTI_SELECT',
    'URL',
    'EMAIL',
    'PHONE',
    'FILE',
    'IMAGE',
    'ITEM_RELATION',
    'LOCATION_RELATION',
    'USER_RELATION',
  ] as const;

  it('contains exactly 18 field types matching the shared union', () => {
    const enumValues = dynamicFieldTypeEnum.options;
    expect(enumValues).toHaveLength(18);
    for (const t of sharedTypes) {
      expect(enumValues).toContain(t);
    }
  });

  it('rejects an unknown field type', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Serial Number',
      key: 'serial-number',
      type: 'CUSTOM_TYPE',
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createDynamicFieldSchema
// ---------------------------------------------------------------------------
describe('createDynamicFieldSchema', () => {
  it('accepts a valid field definition with all optional fields', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Serial Number',
      key: 'serial-number',
      type: 'SHORT_TEXT',
      description: 'The asset serial number',
      required: true,
      defaultValue: '',
      order: 1,
      visible: true,
      unit: 'mm',
      validation: { minLength: 5, maxLength: 20 },
      showInList: true,
      showInSearch: true,
      helpText: 'Enter the serial number printed on the label',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Serial Number');
      expect(result.data.key).toBe('serial-number');
      expect(result.data.type).toBe('SHORT_TEXT');
      expect(result.data.required).toBe(true);
      expect(result.data.order).toBe(1);
      expect(result.data.showInList).toBe(true);
      expect(result.data.showInSearch).toBe(true);
    }
  });

  it('accepts a minimal valid field definition (only required fields)', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Notes',
      key: 'notes',
      type: 'LONG_TEXT',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.required).toBe(false);
      expect(result.data.order).toBe(0);
      expect(result.data.visible).toBe(true);
      expect(result.data.showInList).toBe(false);
      expect(result.data.showInSearch).toBe(false);
    }
  });

  // --- Key validation ---
  it('rejects a key with uppercase letters', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Serial',
      key: 'Serial-Number',
      type: 'SHORT_TEXT',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a key with spaces', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Serial',
      key: 'serial number',
      type: 'SHORT_TEXT',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a key with special characters', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Serial',
      key: 'serial_number',
      type: 'SHORT_TEXT',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty key', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Serial',
      key: '',
      type: 'SHORT_TEXT',
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid kebab-case key', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Serial Number',
      key: 'serial-number',
      type: 'SHORT_TEXT',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a key that starts with a hyphen', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Serial',
      key: '-serial',
      type: 'SHORT_TEXT',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a key that ends with a hyphen', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Serial',
      key: 'serial-',
      type: 'SHORT_TEXT',
    });
    expect(result.success).toBe(false);
  });

  // --- Name validation ---
  it('rejects an empty name', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: '',
      key: 'serial',
      type: 'SHORT_TEXT',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name exceeding 100 characters', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'A'.repeat(101),
      key: 'serial',
      type: 'SHORT_TEXT',
    });
    expect(result.success).toBe(false);
  });

  // --- Type-aware validation: SELECT / MULTI_SELECT must have options ---
  it('rejects SELECT type without options', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Category',
      key: 'category',
      type: 'SELECT',
    });
    expect(result.success).toBe(false);
  });

  it('rejects MULTI_SELECT type without options', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Tags',
      key: 'tags',
      type: 'MULTI_SELECT',
    });
    expect(result.success).toBe(false);
  });

  it('accepts SELECT type with valid options', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Category',
      key: 'category',
      type: 'SELECT',
      options: [
        { label: 'Electronics', value: 'electronics' },
        { label: 'Furniture', value: 'furniture', color: '#FF5733' },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.options).toHaveLength(2);
    }
  });

  it('accepts MULTI_SELECT type with valid options', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Tags',
      key: 'tags',
      type: 'MULTI_SELECT',
      options: [{ label: 'Critical', value: 'critical' }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects SELECT with empty options array', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Category',
      key: 'category',
      type: 'SELECT',
      options: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects options where a value is missing', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Category',
      key: 'category',
      type: 'SELECT',
      options: [{ label: 'Solo Label' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects options where a label is missing', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Category',
      key: 'category',
      type: 'SELECT',
      options: [{ value: 'solo-value' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts NUMBER type without options (options only required for SELECT types)', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Quantity',
      key: 'quantity',
      type: 'NUMBER',
      validation: { min: 0, max: 999 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts BOOLEAN type', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Active',
      key: 'active',
      type: 'BOOLEAN',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a negative order value', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Notes',
      key: 'notes',
      type: 'LONG_TEXT',
      order: -1,
    });
    expect(result.success).toBe(false);
  });

  // --- Validation JSON rules ---
  it('accepts a NUMBER field with min/max validation', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Temperature',
      key: 'temperature',
      type: 'NUMBER',
      validation: { min: -20, max: 100 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a SHORT_TEXT field with pattern validation', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Part Code',
      key: 'part-code',
      type: 'SHORT_TEXT',
      validation: { pattern: '^[A-Z]{3}-\\d{4}$' },
    });
    expect(result.success).toBe(true);
  });

  // --- Type-aware validation: NUMBER rejects text rules ---
  it('rejects NUMBER type with text-only validation rules', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Quantity',
      key: 'quantity',
      type: 'NUMBER',
      validation: { minLength: 5, maxLength: 20, pattern: '^\\d+$' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('not valid for field type'))).toBe(true);
    }
  });

  // --- Type-aware validation: TEXT rejects number rules ---
  it('rejects SHORT_TEXT type with number-only validation rules', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Code',
      key: 'code',
      type: 'SHORT_TEXT',
      validation: { min: 0, max: 999 },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('not valid for field type'))).toBe(true);
    }
  });

  // --- Type-aware validation: DATE accepts date rules ---
  it('accepts DATE type with minDate/maxDate validation', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Install Date',
      key: 'install-date',
      type: 'DATE',
      validation: { minDate: '2020-01-01', maxDate: '2030-12-31' },
    });
    expect(result.success).toBe(true);
  });

  // --- Type-aware validation: DATETIME accepts date rules ---
  it('accepts DATETIME type with date validation', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Last Check',
      key: 'last-check',
      type: 'DATETIME',
      validation: { minDate: '2024-01-01T00:00:00Z' },
    });
    expect(result.success).toBe(true);
  });

  // --- Type-aware validation: BOOLEAN rejects validation rules ---
  it('rejects BOOLEAN type with validation rules', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Active',
      key: 'active',
      type: 'BOOLEAN',
      validation: { min: 0 },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('does not support validation rules'))).toBe(true);
    }
  });

  // --- Type-aware validation: URL rejects validation rules ---
  it('rejects URL type with validation rules', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Website',
      key: 'website',
      type: 'URL',
      validation: { pattern: 'https?://.*' },
    });
    expect(result.success).toBe(false);
  });

  // --- Type-aware validation: SELECT allows validation (handled by options) ---
  it('accepts SELECT type with optional validation (no-op for SELECT)', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Category',
      key: 'category',
      type: 'SELECT',
      options: [{ label: 'A', value: 'a' }],
      validation: { customMessage: 'Pick one' },
    });
    expect(result.success).toBe(true);
  });

  // --- Type-aware validation: Text with mix of valid and invalid rules ---
  it('rejects SHORT_TEXT with mixed valid and invalid rules', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Code',
      key: 'code',
      type: 'SHORT_TEXT',
      validation: { minLength: 3, min: 0 },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes('not valid for field type'))).toBe(true);
    }
  });

  // --- Currency & Decimal types ---
  it('accepts CURRENCY type with unit', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Price',
      key: 'price',
      type: 'CURRENCY',
      unit: 'USD',
    });
    expect(result.success).toBe(true);
  });

  it('accepts DECIMAL type', () => {
    const result = createDynamicFieldSchema.safeParse({
      name: 'Weight',
      key: 'weight',
      type: 'DECIMAL',
    });
    expect(result.success).toBe(true);
  });

  // --- All 18 types are valid ---
  const allTypes = [
    'SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'DECIMAL', 'CURRENCY',
    'BOOLEAN', 'DATE', 'DATETIME', 'SELECT', 'MULTI_SELECT',
    'URL', 'EMAIL', 'PHONE', 'FILE', 'IMAGE',
    'ITEM_RELATION', 'LOCATION_RELATION', 'USER_RELATION',
  ] as const;

  for (const fieldType of allTypes) {
    const label = fieldType === 'SELECT' || fieldType === 'MULTI_SELECT'
      ? `${fieldType} with options`
      : fieldType;

    it(`accepts type ${fieldType}`, () => {
      const base: Record<string, unknown> = {
        name: `Field ${fieldType}`,
        key: `field-${fieldType.toLowerCase().replace(/_/g, '-')}`,
        type: fieldType,
      };
      if (fieldType === 'SELECT' || fieldType === 'MULTI_SELECT') {
        base.options = [{ label: 'Option A', value: 'a' }];
      }
      const result = createDynamicFieldSchema.safeParse(base);
      expect(result.success).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// updateDynamicFieldSchema
// ---------------------------------------------------------------------------
describe('updateDynamicFieldSchema', () => {
  it('accepts a full update payload', () => {
    const result = updateDynamicFieldSchema.safeParse({
      name: 'Updated Name',
      description: 'Updated description',
      required: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Updated Name');
    }
  });

  it('accepts a partial update with a single field', () => {
    const result = updateDynamicFieldSchema.safeParse({
      name: 'Renamed Field',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Renamed Field');
      // Only name should be present
      expect(Object.keys(result.data)).toHaveLength(1);
    }
  });

  it('rejects an empty object (at least one field required)', () => {
    const result = updateDynamicFieldSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects an unknown field type in update', () => {
    const result = updateDynamicFieldSchema.safeParse({
      type: 'INVALID_TYPE',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid key format in update', () => {
    const result = updateDynamicFieldSchema.safeParse({
      key: 'Invalid Key',
    });
    expect(result.success).toBe(false);
  });

  it('accepts only order update', () => {
    const result = updateDynamicFieldSchema.safeParse({ order: 5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(5);
    }
  });

  // --- Type-aware validation in update ---
  it('rejects update with type NUMBER but text validation rules', () => {
    const result = updateDynamicFieldSchema.safeParse({
      type: 'NUMBER',
      validation: { minLength: 5, maxLength: 20 },
    });
    expect(result.success).toBe(false);
  });

  it('accepts update with type NUMBER and valid numeric rules', () => {
    const result = updateDynamicFieldSchema.safeParse({
      type: 'NUMBER',
      validation: { min: 0, max: 100 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts update with validation only (no type change — skip cross-check)', () => {
    const result = updateDynamicFieldSchema.safeParse({
      validation: { min: 5 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts update with type only (no validation — skip cross-check)', () => {
    const result = updateDynamicFieldSchema.safeParse({
      type: 'BOOLEAN',
    });
    expect(result.success).toBe(true);
  });

  it('rejects update with type BOOLEAN and validation rules', () => {
    const result = updateDynamicFieldSchema.safeParse({
      type: 'BOOLEAN',
      validation: { min: 0 },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// reorderFieldsSchema
// ---------------------------------------------------------------------------
describe('reorderFieldsSchema', () => {
  it('accepts a valid array of field IDs', () => {
    const result = reorderFieldsSchema.safeParse({
      fieldIds: ['abc123', 'def456', 'ghi789'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.fieldIds).toHaveLength(3);
    }
  });

  it('accepts a single field ID array', () => {
    const result = reorderFieldsSchema.safeParse({
      fieldIds: ['abc123'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty fieldIds array', () => {
    const result = reorderFieldsSchema.safeParse({ fieldIds: [] });
    expect(result.success).toBe(false);
  });

  it('rejects when fieldIds is missing entirely', () => {
    const result = reorderFieldsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects fieldIds containing an empty string', () => {
    const result = reorderFieldsSchema.safeParse({
      fieldIds: ['abc123', '', 'def456'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects when fieldIds is not an array', () => {
    const result = reorderFieldsSchema.safeParse({ fieldIds: 'not-an-array' });
    expect(result.success).toBe(false);
  });
});
