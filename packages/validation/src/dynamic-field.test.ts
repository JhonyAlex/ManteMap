import { describe, it, expect } from 'vitest';
import {
  createDynamicFieldSchema,
  updateDynamicFieldSchema,
  reorderFieldsSchema,
  dynamicFieldTypeEnum,
  createFieldValueSchema,
} from './dynamic-field';

// Minimal field-definition type matching DynamicFieldDefinition from shared types.
// Used only in tests — avoids a cross-package type import that the validation
// package's tsconfig does not resolve.
interface TestFieldDef {
  id: string;
  key: string;
  type: string;
  required: boolean;
  defaultValue?: unknown;
  order: number;
  visible: boolean;
  active: boolean;
  showInList: boolean;
  showInSearch: boolean;
  options?: { label: string; value: string; color?: string }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    minDate?: string;
    maxDate?: string;
    customMessage?: string;
  };
}

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

// ---------------------------------------------------------------------------
// createFieldValueSchema
// ---------------------------------------------------------------------------

/**
 * Minimal field def builder for tests — only the fields needed by the factory.
 */
function fieldDef(
  overrides: Partial<TestFieldDef> & { key: string; type: string }
): TestFieldDef {
  const { key, type, ...rest } = overrides;
  return {
    id: `id-${key}`,
    key,
    type,
    required: false,
    order: 0,
    visible: true,
    active: true,
    showInList: false,
    showInSearch: false,
    ...rest,
  } as TestFieldDef;
}

describe('createFieldValueSchema', () => {
  // --- Basic shape ---
  it('returns a ZodObject with the correct shape keys', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'name', type: 'SHORT_TEXT', required: true }),
      fieldDef({ key: 'age', type: 'NUMBER' }),
    ]);
    const result = schema.safeParse({ name: 'Alice', age: 30 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Alice');
      expect(result.data.age).toBe(30);
    }
  });

  // --- Required field enforcement ---
  it('rejects a required SHORT_TEXT field when missing', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'title', type: 'SHORT_TEXT', required: true }),
    ]);
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects a required SHORT_TEXT field when empty string', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'title', type: 'SHORT_TEXT', required: true }),
    ]);
    const result = schema.safeParse({ title: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a required NUMBER field when missing', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'quantity', type: 'NUMBER', required: true }),
    ]);
    const result = schema.safeParse({});
    expect(result.success).toBe(false);
  });

  // --- Optional fields ---
  it('accepts an optional field when undefined', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'notes', type: 'LONG_TEXT', required: false }),
    ]);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeUndefined();
    }
  });

  // --- Default value ---
  it('applies default value when field is not provided', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'status', type: 'SHORT_TEXT', required: false, defaultValue: 'draft' }),
    ]);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('draft');
    }
  });

  it('overrides default value when explicitly provided', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'status', type: 'SHORT_TEXT', required: false, defaultValue: 'draft' }),
    ]);
    const result = schema.safeParse({ status: 'published' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('published');
    }
  });

  // --- NUMBER min/max ---
  it('rejects NUMBER below min', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'score', type: 'NUMBER', validation: { min: 0, max: 100 } }),
    ]);
    const result = schema.safeParse({ score: -5 });
    expect(result.success).toBe(false);
  });

  it('rejects NUMBER above max', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'score', type: 'NUMBER', validation: { min: 0, max: 100 } }),
    ]);
    const result = schema.safeParse({ score: 150 });
    expect(result.success).toBe(false);
  });

  it('accepts NUMBER in range', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'score', type: 'NUMBER', validation: { min: 0, max: 100 } }),
    ]);
    const result = schema.safeParse({ score: 50 });
    expect(result.success).toBe(true);
  });

  // --- NUMBER string coercion ---
  it('coerces string numbers to number for NUMBER type', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'count', type: 'NUMBER' }),
    ]);
    const result = schema.safeParse({ count: '42' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(42);
    }
  });

  // --- DECIMAL ---
  it('accepts DECIMAL with decimal value', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'weight', type: 'DECIMAL', validation: { min: 0, max: 1000 } }),
    ]);
    const result = schema.safeParse({ weight: 45.5 });
    expect(result.success).toBe(true);
  });

  // --- CURRENCY ---
  it('accepts CURRENCY with valid value', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'price', type: 'CURRENCY', validation: { min: 0 } }),
    ]);
    const result = schema.safeParse({ price: 99.99 });
    expect(result.success).toBe(true);
  });

  // --- SHORT_TEXT minLength/maxLength ---
  it('rejects SHORT_TEXT below minLength', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'code', type: 'SHORT_TEXT', validation: { minLength: 3, maxLength: 10 } }),
    ]);
    const result = schema.safeParse({ code: 'ab' });
    expect(result.success).toBe(false);
  });

  it('rejects SHORT_TEXT above maxLength', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'code', type: 'SHORT_TEXT', validation: { minLength: 3, maxLength: 10 } }),
    ]);
    const result = schema.safeParse({ code: 'abcdefghijklmno' });
    expect(result.success).toBe(false);
  });

  it('accepts SHORT_TEXT within length range', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'code', type: 'SHORT_TEXT', validation: { minLength: 3, maxLength: 10 } }),
    ]);
    const result = schema.safeParse({ code: 'abc123' });
    expect(result.success).toBe(true);
  });

  // --- SHORT_TEXT pattern ---
  it('rejects SHORT_TEXT that does not match pattern', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'partCode', type: 'SHORT_TEXT', validation: { pattern: '^[A-Z]{3}-\\d{4}$' } }),
    ]);
    const result = schema.safeParse({ partCode: 'abc1234' });
    expect(result.success).toBe(false);
  });

  it('accepts SHORT_TEXT that matches pattern', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'partCode', type: 'SHORT_TEXT', validation: { pattern: '^[A-Z]{3}-\\d{4}$' } }),
    ]);
    const result = schema.safeParse({ partCode: 'ABC-1234' });
    expect(result.success).toBe(true);
  });

  // --- BOOLEAN ---
  it('accepts BOOLEAN true', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'isActive', type: 'BOOLEAN' }),
    ]);
    const result = schema.safeParse({ isActive: true });
    expect(result.success).toBe(true);
  });

  it('rejects non-boolean value for BOOLEAN type', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'isActive', type: 'BOOLEAN' }),
    ]);
    const result = schema.safeParse({ isActive: 'yes' });
    expect(result.success).toBe(false);
  });

  // --- SELECT ---
  it('rejects value not in SELECT options', () => {
    const schema = createFieldValueSchema([
      fieldDef({
        key: 'category',
        type: 'SELECT',
        options: [
          { label: 'Electronics', value: 'electronics' },
          { label: 'Furniture', value: 'furniture' },
        ],
      }),
    ]);
    const result = schema.safeParse({ category: 'clothing' });
    expect(result.success).toBe(false);
  });

  it('accepts value in SELECT options', () => {
    const schema = createFieldValueSchema([
      fieldDef({
        key: 'category',
        type: 'SELECT',
        options: [
          { label: 'Electronics', value: 'electronics' },
          { label: 'Furniture', value: 'furniture' },
        ],
      }),
    ]);
    const result = schema.safeParse({ category: 'electronics' });
    expect(result.success).toBe(true);
  });

  // --- MULTI_SELECT ---
  it('accepts MULTI_SELECT with valid option values', () => {
    const schema = createFieldValueSchema([
      fieldDef({
        key: 'tags',
        type: 'MULTI_SELECT',
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
          { label: 'C', value: 'c' },
        ],
      }),
    ]);
    const result = schema.safeParse({ tags: ['a', 'c'] });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(['a', 'c']);
    }
  });

  it('rejects MULTI_SELECT with invalid option value', () => {
    const schema = createFieldValueSchema([
      fieldDef({
        key: 'tags',
        type: 'MULTI_SELECT',
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ],
      }),
    ]);
    const result = schema.safeParse({ tags: ['a', 'x'] });
    expect(result.success).toBe(false);
  });

  // --- URL ---
  it('accepts a valid URL', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'website', type: 'URL' }),
    ]);
    const result = schema.safeParse({ website: 'https://example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid URL', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'website', type: 'URL' }),
    ]);
    const result = schema.safeParse({ website: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  // --- EMAIL ---
  it('accepts a valid email', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'contactEmail', type: 'EMAIL' }),
    ]);
    const result = schema.safeParse({ contactEmail: 'test@example.com' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'contactEmail', type: 'EMAIL' }),
    ]);
    const result = schema.safeParse({ contactEmail: 'not-email' });
    expect(result.success).toBe(false);
  });

  // --- DATE ---
  it('accepts a valid date string (ISO)', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'installDate', type: 'DATE' }),
    ]);
    const result = schema.safeParse({ installDate: '2024-06-15' });
    expect(result.success).toBe(true);
  });

  it('accepts a valid datetime string (ISO)', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'lastCheck', type: 'DATETIME' }),
    ]);
    const result = schema.safeParse({ lastCheck: '2024-06-15T10:30:00.000Z' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid date format', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'eventDate', type: 'DATE' }),
    ]);
    const result = schema.safeParse({ eventDate: 'next Tuesday' });
    expect(result.success).toBe(false);
  });

  it('rejects DATE below minDate', () => {
    const schema = createFieldValueSchema([
      fieldDef({
        key: 'startDate',
        type: 'DATE',
        validation: { minDate: '2024-01-01', maxDate: '2024-12-31' },
      }),
    ]);
    const result = schema.safeParse({ startDate: '2023-06-15' });
    expect(result.success).toBe(false);
  });

  it('rejects DATE above maxDate', () => {
    const schema = createFieldValueSchema([
      fieldDef({
        key: 'startDate',
        type: 'DATE',
        validation: { minDate: '2024-01-01', maxDate: '2024-12-31' },
      }),
    ]);
    const result = schema.safeParse({ startDate: '2025-06-15' });
    expect(result.success).toBe(false);
  });

  it('accepts DATE within minDate/maxDate range', () => {
    const schema = createFieldValueSchema([
      fieldDef({
        key: 'startDate',
        type: 'DATE',
        validation: { minDate: '2024-01-01', maxDate: '2024-12-31' },
      }),
    ]);
    const result = schema.safeParse({ startDate: '2024-06-15' });
    expect(result.success).toBe(true);
  });

  // --- PHONE ---
  it('accepts a phone string', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'phone', type: 'PHONE' }),
    ]);
    const result = schema.safeParse({ phone: '+54 11 5555-1234' });
    expect(result.success).toBe(true);
  });

  // --- Multiple fields combined ---
  it('validates multiple fields together and returns typed data', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'name', type: 'SHORT_TEXT', required: true }),
      fieldDef({ key: 'quantity', type: 'NUMBER', required: true }),
      fieldDef({ key: 'active', type: 'BOOLEAN' }),
    ]);
    const result = schema.safeParse({ name: 'Widget', quantity: 5, active: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Widget');
      expect(result.data.quantity).toBe(5);
      expect(result.data.active).toBe(true);
    }
  });

  it('rejects multiple fields when one is invalid', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'name', type: 'SHORT_TEXT', required: true }),
      fieldDef({ key: 'email', type: 'EMAIL', required: true }),
    ]);
    const result = schema.safeParse({ name: 'Alice', email: 'not-email' });
    expect(result.success).toBe(false);
  });

  // --- Deferred types ---
  it('makes FILE type optional regardless of required flag', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'attachment', type: 'FILE', required: true }),
      fieldDef({ key: 'name', type: 'SHORT_TEXT', required: true }),
    ]);
    const result = schema.safeParse({ name: 'Doc' });
    expect(result.success).toBe(true);
  });

  it('makes IMAGE type optional', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'photo', type: 'IMAGE' }),
    ]);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('makes ITEM_RELATION type optional string', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'parentItem', type: 'ITEM_RELATION' }),
    ]);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('makes LOCATION_RELATION type optional string', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'location', type: 'LOCATION_RELATION' }),
    ]);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('makes USER_RELATION type optional string', () => {
    const schema = createFieldValueSchema([
      fieldDef({ key: 'assignedTo', type: 'USER_RELATION' }),
    ]);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
  });

  // --- All 18 types produce valid schemas ---
  const all18Types: string[] = [
    'SHORT_TEXT', 'LONG_TEXT', 'NUMBER', 'DECIMAL', 'CURRENCY',
    'BOOLEAN', 'DATE', 'DATETIME', 'SELECT', 'MULTI_SELECT',
    'URL', 'EMAIL', 'PHONE', 'FILE', 'IMAGE',
    'ITEM_RELATION', 'LOCATION_RELATION', 'USER_RELATION',
  ];

  it('builds schema for all 18 field types without throwing', () => {
    const fields = all18Types.map((type, i) => {
      const f = fieldDef({ key: `field-${i}`, type });
      if (type === 'SELECT' || type === 'MULTI_SELECT') {
        f.options = [{ label: 'Option', value: 'opt' }];
      }
      return f;
    });
    const schema = createFieldValueSchema(fields);
    expect(schema).toBeDefined();
    expect(schema._def.typeName).toBe('ZodObject');
  });
});
