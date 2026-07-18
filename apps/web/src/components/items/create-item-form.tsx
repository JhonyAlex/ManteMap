/**
 * CreateItemForm — Client Component wrapping DynamicForm for item creation.
 *
 * Renders an item name input plus DynamicForm for dynamic fields.
 * Transforms form values from { [key]: value } to EAV format on submit,
 * then calls the createItem mutation.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Create and edit item forms" — create via DynamicForm with EAV transform
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "DynamicForm with field value transformation"
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { DynamicFieldDefinition } from '@mantemap/shared';
import { DynamicForm } from '@/components/forms/dynamic-form';
import { formValuesToEav } from './value-transform';
import { useCreateItem } from '@/hooks/use-items';

export interface CreateItemFormProps {
  projectId: string;
  itemTypeId: string;
  fields: DynamicFieldDefinition[];
}

export function CreateItemForm({ projectId, itemTypeId, fields }: CreateItemFormProps) {
  const router = useRouter();
  const createMutation = useCreateItem(projectId);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');

  const handleDynamicSubmit = useCallback(
    async (data: Record<string, unknown>) => {
      // Validate name before submitting
      if (!name.trim()) {
        setNameError('Item name is required');
        return;
      }

      const fieldValues = formValuesToEav(data, fields);

      try {
        await createMutation.mutateAsync({
          name: name.trim(),
          itemTypeId,
          fieldValues,
        });
        router.push(`/projects/${projectId}/items`);
      } catch {
        // Error state handled by createMutation.isError
      }
    },
    [createMutation, fields, itemTypeId, projectId, router, name]
  );

  return (
    <div className="space-y-6">
      {createMutation.isError && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {createMutation.error?.message ?? 'Failed to create item'}
        </div>
      )}

      {/* Item name — required core field, not a dynamic field */}
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

      {/* Dynamic fields rendered by DynamicForm */}
      <DynamicForm
        fields={fields}
        onSubmit={handleDynamicSubmit}
      />

      {createMutation.isPending && (
        <p className="text-sm text-muted-foreground">Creating item...</p>
      )}
    </div>
  );
}
