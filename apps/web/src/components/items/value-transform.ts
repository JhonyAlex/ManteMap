/**
 * Value transformation utility — converts between form values and EAV format.
 *
 * Form values: { [fieldKey]: value } — keyed by DynamicField.key
 * EAV format: [{ dynamicFieldId, value }] — keyed by DynamicField.id
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Create and edit item forms" — form submission transforms to EAV format
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "DynamicForm with field value transformation"
 */

import type { DynamicFieldDefinition } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EavFieldValue {
  dynamicFieldId: string;
  value: unknown;
}

// ---------------------------------------------------------------------------
// Transform functions
// ---------------------------------------------------------------------------

/**
 * Converts form values { [fieldKey]: value } to EAV format [{ dynamicFieldId, value }].
 *
 * - Uses field definitions to map key → id
 * - Skips null/undefined values (user didn't fill those fields)
 * - Preserves empty strings (user intentionally cleared a field)
 * - Skips form keys that don't match any field definition
 */
export function formValuesToEav(
  formValues: Record<string, unknown>,
  fields: DynamicFieldDefinition[]
): EavFieldValue[] {
  if (fields.length === 0) return [];

  const keyToField = new Map<string, DynamicFieldDefinition>();
  for (const field of fields) {
    keyToField.set(field.key, field);
  }

  const result: EavFieldValue[] = [];

  for (const [key, value] of Object.entries(formValues)) {
    const field = keyToField.get(key);
    if (!field) continue;
    if (value === null || value === undefined) continue;

    result.push({ dynamicFieldId: field.id, value });
  }

  return result;
}

/**
 * Converts EAV format [{ dynamicFieldId, value }] to form values { [fieldKey]: value }.
 *
 * - Uses field definitions to map id → key
 * - Skips EAV entries that don't match any field definition
 * - Preserves null values
 * - Last value wins for duplicate field IDs
 */
export function eavToFormValues(
  eavValues: EavFieldValue[],
  fields: DynamicFieldDefinition[]
): Record<string, unknown> {
  if (fields.length === 0 || eavValues.length === 0) return {};

  const idToField = new Map<string, DynamicFieldDefinition>();
  for (const field of fields) {
    idToField.set(field.id, field);
  }

  const result: Record<string, unknown> = {};

  for (const { dynamicFieldId, value } of eavValues) {
    const field = idToField.get(dynamicFieldId);
    if (!field) continue;
    result[field.key] = value;
  }

  return result;
}
