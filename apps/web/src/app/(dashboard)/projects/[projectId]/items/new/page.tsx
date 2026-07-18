/**
 * New item page — Server Component.
 *
 * Fetches item types and dynamic fields for the selected item type.
 * Renders the CreateItemForm client component.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Create and edit item forms" — create page wrapping DynamicForm
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "Server Component + DynamicForm — create item"
 */

import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { DynamicFieldDefinition } from '@mantemap/shared';
import { getCurrentUser } from '@/lib/auth/session';
import { listItemTypes } from '@/lib/services/item-type-service';
import { listFields } from '@/lib/services/dynamic-field-service';
import { NotFoundError } from '@mantemap/shared';
import { CreateItemForm } from '@/components/items/create-item-form';

export default async function NewItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ itemTypeId?: string }>;
}) {
  const { projectId } = await params;
  const { itemTypeId: itemTypeIdParam } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  // Fetch item types for the project
  let itemTypes;
  try {
    const result = await listItemTypes(projectId, user.id);
    itemTypes = result.itemTypes;
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  if (itemTypes.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Item</h1>
        <p className="mt-2 text-muted-foreground">
          No item types configured for this project.{' '}
          <Link
            href={`/projects/${projectId}/item-types`}
            className="text-primary hover:underline"
          >
            Create an item type first.
          </Link>
        </p>
      </div>
    );
  }

  // Select item type from query param or default to first
  const selectedItemTypeId = itemTypeIdParam ?? itemTypes[0]!.id;
  const selectedItemType = itemTypes.find((t) => t.id === selectedItemTypeId) ?? itemTypes[0]!;

  // Fetch dynamic fields for the selected item type
  let dynamicFields: DynamicFieldDefinition[] = [];
  try {
    const rawFields = await listFields(projectId, selectedItemType.id, user.id);
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">New Item</h1>
        <p className="mt-1 text-muted-foreground">
          Create a new item for{' '}
          <span className="font-medium">{selectedItemType.name}</span>
        </p>
      </div>

      <CreateItemForm
        projectId={projectId}
        itemTypeId={selectedItemType.id}
        fields={dynamicFields}
      />
    </div>
  );
}
