/**
 * Edit item page — Server Component.
 *
 * Fetches item with field values and dynamic fields for the item type.
 * Renders the EditItemForm client component with pre-populated values.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Create and edit item forms" — edit pre-populates from EAV
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "Server Component + DynamicForm — edit item"
 */

import React from 'react';
import { notFound } from 'next/navigation';
import type { DynamicFieldDefinition } from '@mantemap/shared';
import { getCurrentUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { getItem } from '@/lib/services/item-service';
import { listFields } from '@/lib/services/dynamic-field-service';
import { NotFoundError } from '@mantemap/shared';
import { EditItemForm } from '@/components/items/edit-item-form';
import type { FieldValueSnapshot } from '@/hooks/use-items';

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ projectCode: string; itemId: string }>;
}) {
  const { projectCode, itemId } = await params;
  const projectId = await resolveProjectId(projectCode);
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  // Fetch item with field values
  let item;
  try {
    const result = await getItem(projectId, itemId, user.id);
    item = result.item;
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  // Fetch dynamic fields for the item's type
  let dynamicFields: DynamicFieldDefinition[] = [];
  try {
    const rawFields = await listFields(projectId, item.itemTypeId as string, user.id);
    dynamicFields = rawFields.map((f) => ({
      ...f,
      description: f.description ?? undefined,
      unit: f.unit ?? undefined,
      helpText: f.helpText ?? undefined,
      options: f.options as unknown as DynamicFieldDefinition['options'],
      validation: f.validation as unknown as DynamicFieldDefinition['validation'],
      defaultValue: f.defaultValue as unknown as DynamicFieldDefinition['defaultValue'],
    }));
  } catch {
    dynamicFields = [];
  }

  // Transform field values to the shape expected by EditItemForm
  const fieldValues: FieldValueSnapshot[] = (item.fieldValues ?? []).map(
    (fv: Record<string, unknown>) => ({
      id: fv.id as string,
      itemId: fv.itemId as string,
      dynamicFieldId: fv.dynamicFieldId as string,
      value: fv.value,
      dynamicField: fv.dynamicField
        ? {
            id: (fv.dynamicField as { id: string }).id,
            name: (fv.dynamicField as { name: string }).name,
            key: (fv.dynamicField as { key: string }).key,
            type: (fv.dynamicField as { type: string }).type,
          }
        : undefined,
    })
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Edit Item</h1>
        <p className="mt-1 text-muted-foreground">
          Editing <span className="font-medium">{item.name}</span>
        </p>
      </div>

      <EditItemForm
        projectId={projectId}
        itemId={itemId}
        itemName={item.name}
        fields={dynamicFields}
        fieldValues={fieldValues}
      />
    </div>
  );
}
