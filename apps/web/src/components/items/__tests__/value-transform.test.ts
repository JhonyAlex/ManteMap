/**
 * Tests for value transformation utility.
 *
 * Transforms between form values { [fieldKey]: value } and
 * API EAV format [{ dynamicFieldId, value }].
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Create and edit item forms" — form submission transforms to EAV format
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "DynamicForm with field value transformation"
 *
 * Acceptance criteria:
 *   - formValuesToEav converts { [key]: value } to [{ dynamicFieldId, value }]
 *   - eavToFormValues converts [{ dynamicFieldId, value }] to { [key]: value }
 *   - Handles empty/null/undefined values
 *   - Skips fields with no matching definition
 */

import { describe, it, expect } from 'vitest';
import { formValuesToEav, eavToFormValues } from '../value-transform';
import type { DynamicFieldDefinition } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeField(overrides: Partial<DynamicFieldDefinition> = {}): DynamicFieldDefinition {
  return {
    id: 'field-1',
    name: 'Test Field',
    key: 'testField',
    type: 'SHORT_TEXT',
    description: '',
    required: false,
    defaultValue: undefined,
    order: 0,
    visible: true,
    active: true,
    options: undefined,
    unit: undefined,
    validation: undefined,
    showInList: false,
    showInSearch: false,
    helpText: undefined,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// formValuesToEav
// ---------------------------------------------------------------------------

describe('formValuesToEav', () => {
  it('converts form values to EAV format using field definitions', () => {
    const fields = [
      makeField({ id: 'f1', key: 'name', type: 'SHORT_TEXT' }),
      makeField({ id: 'f2', key: 'quantity', type: 'NUMBER' }),
    ];
    const formValues = { name: 'Widget', quantity: 42 };

    const result = formValuesToEav(formValues, fields);

    expect(result).toEqual([
      { dynamicFieldId: 'f1', value: 'Widget' },
      { dynamicFieldId: 'f2', value: 42 },
    ]);
  });

  it('skips fields with null or undefined values', () => {
    const fields = [
      makeField({ id: 'f1', key: 'name', type: 'SHORT_TEXT' }),
      makeField({ id: 'f2', key: 'notes', type: 'LONG_TEXT' }),
      makeField({ id: 'f3', key: 'quantity', type: 'NUMBER' }),
    ];
    const formValues = { name: 'Widget', notes: null, quantity: undefined };

    const result = formValuesToEav(formValues, fields);

    expect(result).toEqual([{ dynamicFieldId: 'f1', value: 'Widget' }]);
  });

  it('skips form keys that have no matching field definition', () => {
    const fields = [
      makeField({ id: 'f1', key: 'name', type: 'SHORT_TEXT' }),
    ];
    const formValues = { name: 'Widget', unknownField: 'ignored' };

    const result = formValuesToEav(formValues, fields);

    expect(result).toEqual([{ dynamicFieldId: 'f1', value: 'Widget' }]);
  });

  it('includes empty string values (user intentionally cleared a field)', () => {
    const fields = [
      makeField({ id: 'f1', key: 'name', type: 'SHORT_TEXT' }),
    ];
    const formValues = { name: '' };

    const result = formValuesToEav(formValues, fields);

    expect(result).toEqual([{ dynamicFieldId: 'f1', value: '' }]);
  });

  it('returns empty array for empty form values', () => {
    const fields = [
      makeField({ id: 'f1', key: 'name', type: 'SHORT_TEXT' }),
    ];

    const result = formValuesToEav({}, fields);

    expect(result).toEqual([]);
  });

  it('returns empty array for empty fields', () => {
    const formValues = { name: 'Widget' };

    const result = formValuesToEav(formValues, []);

    expect(result).toEqual([]);
  });

  it('preserves boolean false values', () => {
    const fields = [
      makeField({ id: 'f1', key: 'active', type: 'BOOLEAN' }),
    ];
    const formValues = { active: false };

    const result = formValuesToEav(formValues, fields);

    expect(result).toEqual([{ dynamicFieldId: 'f1', value: false }]);
  });

  it('preserves zero as a valid number value', () => {
    const fields = [
      makeField({ id: 'f1', key: 'quantity', type: 'NUMBER' }),
    ];
    const formValues = { quantity: 0 };

    const result = formValuesToEav(formValues, fields);

    expect(result).toEqual([{ dynamicFieldId: 'f1', value: 0 }]);
  });
});

// ---------------------------------------------------------------------------
// eavToFormValues
// ---------------------------------------------------------------------------

describe('eavToFormValues', () => {
  it('converts EAV array to form values using field definitions', () => {
    const fields = [
      makeField({ id: 'f1', key: 'name', type: 'SHORT_TEXT' }),
      makeField({ id: 'f2', key: 'quantity', type: 'NUMBER' }),
    ];
    const eav = [
      { dynamicFieldId: 'f1', value: 'Widget' },
      { dynamicFieldId: 'f2', value: 42 },
    ];

    const result = eavToFormValues(eav, fields);

    expect(result).toEqual({ name: 'Widget', quantity: 42 });
  });

  it('skips EAV entries with no matching field definition', () => {
    const fields = [
      makeField({ id: 'f1', key: 'name', type: 'SHORT_TEXT' }),
    ];
    const eav = [
      { dynamicFieldId: 'f1', value: 'Widget' },
      { dynamicFieldId: 'unknown', value: 'ignored' },
    ];

    const result = eavToFormValues(eav, fields);

    expect(result).toEqual({ name: 'Widget' });
  });

  it('returns empty object for empty EAV array', () => {
    const fields = [
      makeField({ id: 'f1', key: 'name', type: 'SHORT_TEXT' }),
    ];

    const result = eavToFormValues([], fields);

    expect(result).toEqual({});
  });

  it('returns empty object for empty fields', () => {
    const eav = [{ dynamicFieldId: 'f1', value: 'Widget' }];

    const result = eavToFormValues(eav, []);

    expect(result).toEqual({});
  });

  it('handles null values in EAV entries', () => {
    const fields = [
      makeField({ id: 'f1', key: 'name', type: 'SHORT_TEXT' }),
      makeField({ id: 'f2', key: 'notes', type: 'LONG_TEXT' }),
    ];
    const eav = [
      { dynamicFieldId: 'f1', value: 'Widget' },
      { dynamicFieldId: 'f2', value: null },
    ];

    const result = eavToFormValues(eav, fields);

    expect(result).toEqual({ name: 'Widget', notes: null });
  });

  it('overwrites duplicate field IDs (last wins)', () => {
    const fields = [
      makeField({ id: 'f1', key: 'name', type: 'SHORT_TEXT' }),
    ];
    const eav = [
      { dynamicFieldId: 'f1', value: 'First' },
      { dynamicFieldId: 'f1', value: 'Second' },
    ];

    const result = eavToFormValues(eav, fields);

    expect(result).toEqual({ name: 'Second' });
  });
});
