/**
 * Tests for column-builder utility.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Items list page with dynamic columns" — columns derived from showInList fields
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "Dynamic column builder from showInList fields"
 *
 * Acceptance criteria:
 *   - Filters fields where showInList === true
 *   - Sorts by order ascending
 *   - Maps to ItemColumn { key, label, type, order }
 *   - Returns empty array when no fields have showInList
 */

import { describe, it, expect } from 'vitest';
import { buildColumns } from '../column-builder';
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
// Tests
// ---------------------------------------------------------------------------

describe('buildColumns', () => {
  it('returns only fields where showInList is true', () => {
    const fields = [
      makeField({ id: 'f1', name: 'Name', key: 'name', type: 'SHORT_TEXT', showInList: true, order: 0 }),
      makeField({ id: 'f2', name: 'Notes', key: 'notes', type: 'LONG_TEXT', showInList: false, order: 1 }),
      makeField({ id: 'f3', name: 'Serial', key: 'serial', type: 'SHORT_TEXT', showInList: true, order: 2 }),
    ];

    const columns = buildColumns(fields);

    expect(columns).toHaveLength(2);
    expect(columns[0].key).toBe('name');
    expect(columns[1].key).toBe('serial');
  });

  it('sorts columns by order ascending', () => {
    const fields = [
      makeField({ id: 'f1', name: 'Third', key: 'third', type: 'SHORT_TEXT', showInList: true, order: 30 }),
      makeField({ id: 'f2', name: 'First', key: 'first', type: 'SHORT_TEXT', showInList: true, order: 10 }),
      makeField({ id: 'f3', name: 'Second', key: 'second', type: 'NUMBER', showInList: true, order: 20 }),
    ];

    const columns = buildColumns(fields);

    expect(columns[0].label).toBe('First');
    expect(columns[1].label).toBe('Second');
    expect(columns[2].label).toBe('Third');
  });

  it('maps fields to ItemColumn shape with key, label, type, order', () => {
    const fields = [
      makeField({ id: 'f1', name: 'Quantity', key: 'quantity', type: 'NUMBER', showInList: true, order: 5 }),
    ];

    const columns = buildColumns(fields);

    expect(columns[0]).toEqual({
      key: 'quantity',
      label: 'Quantity',
      type: 'NUMBER',
      order: 5,
    });
  });

  it('returns empty array when no fields have showInList', () => {
    const fields = [
      makeField({ id: 'f1', name: 'Hidden', key: 'hidden', type: 'SHORT_TEXT', showInList: false }),
    ];

    const columns = buildColumns(fields);

    expect(columns).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    const columns = buildColumns([]);
    expect(columns).toEqual([]);
  });

  it('handles multiple field types correctly', () => {
    const fields = [
      makeField({ id: 'f1', name: 'Name', key: 'name', type: 'SHORT_TEXT', showInList: true, order: 0 }),
      makeField({ id: 'f2', name: 'Amount', key: 'amount', type: 'CURRENCY', showInList: true, order: 1 }),
      makeField({ id: 'f3', name: 'Active', key: 'active', type: 'BOOLEAN', showInList: true, order: 2 }),
      makeField({ id: 'f4', name: 'Due Date', key: 'dueDate', type: 'DATE', showInList: true, order: 3 }),
    ];

    const columns = buildColumns(fields);

    expect(columns).toHaveLength(4);
    expect(columns.map((c) => c.type)).toEqual(['SHORT_TEXT', 'CURRENCY', 'BOOLEAN', 'DATE']);
  });
});
