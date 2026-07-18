/**
 * Column builder utility — derives table columns from DynamicField definitions.
 *
 * Filters fields where showInList === true, sorts by order ascending,
 * and maps to a lightweight ItemColumn shape for table rendering.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Items list page with dynamic columns"
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "Dynamic column builder from showInList fields"
 */

import type { DynamicFieldDefinition, ItemColumn } from '@mantemap/shared';
export type { ItemColumn } from '@mantemap/shared';

/**
 * Builds table columns from DynamicField definitions.
 *
 * Filters to only showInList fields and sorts by order ascending.
 *
 * @param fields — all DynamicFieldDefinitions for an ItemType
 * @returns ordered ItemColumn[] for table rendering
 */
export function buildColumns(fields: DynamicFieldDefinition[]): ItemColumn[] {
  return fields
    .filter((f) => f.showInList)
    .sort((a, b) => a.order - b.order)
    .map((f) => ({
      key: f.key,
      label: f.name,
      type: f.type,
      order: f.order,
    }));
}
