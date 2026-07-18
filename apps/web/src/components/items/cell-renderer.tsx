/**
 * Cell renderer utility — renders field values by type for table display.
 *
 * Maps DynamicFieldType to a display representation (not input).
 * Handles null/undefined with a dash fallback.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Items list page with dynamic columns" — renders field values by type
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "type-to-cell renderer (mirrors field-registry pattern for display)"
 */

import React from 'react';
import type { DynamicFieldType } from '@mantemap/shared';

/** Dash fallback for empty/null values */
const DASH = '—';

/**
 * Renders a field value for table cell display based on its DynamicFieldType.
 *
 * @param type — the DynamicFieldType of the field
 * @param value — the raw field value
 * @returns React node for table cell rendering
 */
export function renderCellValue(type: DynamicFieldType, value: unknown): React.ReactNode {
  // Null/undefined → dash for all types
  if (value === null || value === undefined) {
    return DASH;
  }

  switch (type) {
    case 'SHORT_TEXT':
    case 'LONG_TEXT':
    case 'SELECT':
    case 'PHONE':
      return renderText(value);

    case 'NUMBER':
    case 'DECIMAL':
    case 'CURRENCY':
      return renderNumber(value);

    case 'BOOLEAN':
      return renderBoolean(value);

    case 'DATE':
      return renderDate(value);

    case 'DATETIME':
      return renderDateTime(value);

    case 'URL':
      return renderUrl(value);

    case 'EMAIL':
      return renderEmail(value);

    case 'MULTI_SELECT':
      return renderMultiSelect(value);

    // Deferred types — render as text fallback
    case 'FILE':
    case 'IMAGE':
    case 'ITEM_RELATION':
    case 'LOCATION_RELATION':
    case 'USER_RELATION':
    default:
      return renderText(value);
  }
}

// ---------------------------------------------------------------------------
// Type-specific renderers
// ---------------------------------------------------------------------------

function renderText(value: unknown): React.ReactNode {
  const str = String(value);
  return str === '' ? DASH : str;
}

function renderNumber(value: unknown): React.ReactNode {
  const num = Number(value);
  if (isNaN(num)) return DASH;
  return num.toLocaleString();
}

function renderBoolean(value: unknown): React.ReactNode {
  return value ? 'Yes' : 'No';
}

function renderDate(value: unknown): React.ReactNode {
  const str = String(value);
  if (!str) return DASH;
  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) return str;
    return date.toLocaleDateString();
  } catch {
    return str;
  }
}

function renderDateTime(value: unknown): React.ReactNode {
  const str = String(value);
  if (!str) return DASH;
  try {
    const date = new Date(str);
    if (isNaN(date.getTime())) return str;
    return date.toLocaleString();
  } catch {
    return str;
  }
}

function renderUrl(value: unknown): React.ReactNode {
  const str = String(value);
  if (!str) return DASH;
  return (
    <a href={str} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      {str}
    </a>
  );
}

function renderEmail(value: unknown): React.ReactNode {
  const str = String(value);
  if (!str) return DASH;
  return (
    <a href={`mailto:${str}`} className="text-blue-600 hover:underline">
      {str}
    </a>
  );
}

function renderMultiSelect(value: unknown): React.ReactNode {
  if (!Array.isArray(value)) return String(value);
  if (value.length === 0) return DASH;
  return value.join(', ');
}
