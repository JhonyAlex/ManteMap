/**
 * Items list page — Server Component.
 *
 * Fetches item types for the project, selects the first one,
 * and renders the ItemList client component with dynamic fields.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Items list page with dynamic columns"
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "Server Component fetches initial data and resolves auth"
 */

import React from 'react';
import { notFound } from 'next/navigation';
import type { DynamicFieldDefinition } from '@mantemap/shared';
import { getCurrentUser } from '@/lib/auth/session';
import { listItemTypes } from '@/lib/services/item-type-service';
import { listFields } from '@/lib/services/dynamic-field-service';
import { NotFoundError } from '@mantemap/shared';
import { ItemList } from '@/components/items/item-list';

export default async function ItemsPage({
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
        <h1 className="text-2xl font-bold tracking-tight">Items</h1>
        <p className="mt-2 text-muted-foreground">
          No item types configured for this project. Create an item type first.
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
        <h1 className="text-2xl font-bold tracking-tight">Items</h1>
        <p className="mt-1 text-muted-foreground">
          Manage items for <span className="font-medium">{selectedItemType.name}</span>
        </p>
      </div>

      {/* Item type selector */}
      {itemTypes.length > 1 && (
        <div className="mb-4 flex gap-2">
          {itemTypes.map((it) => (
            <a
              key={it.id}
              href={`/projects/${projectId}/items?itemTypeId=${it.id}`}
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                it.id === selectedItemTypeId
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {it.name}
            </a>
          ))}
        </div>
      )}

      <ItemList
        projectId={projectId}
        itemTypeId={selectedItemType.id}
        fields={dynamicFields}
      />
    </div>
  );
}
