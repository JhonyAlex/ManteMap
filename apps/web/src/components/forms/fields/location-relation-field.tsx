/**
 * LocationRelationField — Form input for LOCATION_RELATION dynamic fields.
 *
 * Renders a LocationPicker for use in DynamicForm.
 * The LocationPicker provides a searchable tree-select for assigning locations.
 *
 * Spec: openspec/changes/phase-7-locations/specs/form-generation/spec.md
 *   "LOCATION_RELATION renders LocationPicker" — not a disabled placeholder
 */

'use client';

import React from 'react';
import { LocationPicker } from '@/components/locations/location-picker';
import type { FieldInputProps } from './text-field';

/**
 * Extracts projectId from the page URL pattern: /projects/[projectId]/...
 */
function useProjectIdFromPath(): string {
  if (typeof window === 'undefined') return '';
  const match = window.location.pathname.match(/\/projects\/([^/]+)/);
  return match?.[1] ?? '';
}

export function LocationRelationField({ field, definition: _definition }: FieldInputProps) {
  const projectId = useProjectIdFromPath();

  return (
    <LocationPicker
      projectId={projectId}
      value={(field.value as string) ?? null}
      onChange={(locationId) => field.onChange(locationId ?? '')}
    />
  );
}
