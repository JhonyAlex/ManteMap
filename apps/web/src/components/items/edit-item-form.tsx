/**
 * EditItemForm — Client Component wrapping DynamicForm for item editing.
 *
 * Pre-populates DynamicForm with existing field values (converted from EAV).
 * Transforms form values from { [key]: value } to EAV format on submit,
 * then calls the updateItem mutation.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Create and edit item forms" — edit pre-populates from EAV
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "DynamicForm with field value transformation"
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { DynamicFieldDefinition } from '@mantemap/shared';
import { DynamicForm } from '@/components/forms/dynamic-form';
import { formValuesToEav, eavToFormValues } from './value-transform';
import { useUpdateItem } from '@/hooks/use-items';
import type { FieldValueSnapshot } from '@/hooks/use-items';

export interface EditItemFormProps {
  projectId: string;
  itemId: string;
  itemName: string;
  fields: DynamicFieldDefinition[];
  fieldValues: FieldValueSnapshot[];
}

export function EditItemForm({
  projectId,
  itemId,
  itemName,
  fields,
  fieldValues,
}: EditItemFormProps) {
  const router = useRouter();
  const updateMutation = useUpdateItem(projectId, itemId);
  const [name, setName] = useState(itemName);
  const [nameError, setNameError] = useState('');

  // Convert existing EAV values to form defaults
  const defaultValues = useMemo(
    () => eavToFormValues(fieldValues, fields),
    [fieldValues, fields]
  );

  const handleDynamicSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      // Validate name before submitting
      if (!name.trim()) {
        setNameError('Item name is required');
        return;
      }

      const eavFieldValues = formValuesToEav(data, fields);

      try {
        await updateMutation.mutateAsync({
          name: name.trim(),
          fieldValues: eavFieldValues,
        });
        router.push(`/projects/${projectId}/items/${itemId}`);
      } catch {
        // Error state handled by updateMutation.isError
      }
    },
    [updateMutation, fields, projectId, itemId, router, name]
  );

  return (
    <div className="space-y-6">
      {updateMutation.isError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {updateMutation.error?.message ?? 'Failed to update item'}
        </div>
      )}

      {/* Item name — required core field */}
      <div className="space-y-2">
        <label htmlFor="item-name" className="text-sm font-medium">
          Name <span className="text-destructive">*</span>
        </label>
        <input
          id="item-name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError('');
          }}
          placeholder="Item name"
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {nameError && (
          <p className="text-sm text-destructive">{nameError}</p>
        )}
      </div>

      {/* Dynamic fields pre-populated with existing values */}
      <DynamicForm
        fields={fields}
        onSubmit={handleDynamicSubmit}
        defaultValues={defaultValues}
      />

      {updateMutation.isPending && (
        <p className="text-sm text-muted-foreground">Saving changes...</p>
      )}
    </div>
  );
}
