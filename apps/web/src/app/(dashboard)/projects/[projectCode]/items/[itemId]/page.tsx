/**
 * Item detail page — Server Component.
 *
 * Fetches item with field values, status, and item type.
 * Renders the ItemDetail client component.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Item detail page"
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "Server Component fetches item + fields"
 */

import React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { getItem } from '@/lib/services/item-service';
import { getItemType } from '@/lib/services/item-type-service';
import { NotFoundError } from '@mantemap/shared';
import { ItemDetail } from '@/components/items/item-detail';
import type { ItemDetail as ItemDetailType } from '@/hooks/use-items';
import type { StatusOption } from '@/components/items/status-transition';

export default async function ItemDetailPage({
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

  // Fetch item type with statuses for transition UI
  let availableStatuses: StatusOption[] = [];
  try {
    const { itemType } = await getItemType(projectId, item.itemTypeId as string, user.id);
    const rawStatuses = (itemType as unknown as { statuses?: Record<string, unknown>[] }).statuses ?? [];
    availableStatuses = rawStatuses.map((s) => ({
      id: s.id as string,
      name: s.name as string,
      key: s.key as string,
      color: s.color as string,
      isFinal: s.isFinal as boolean,
    }));
  } catch {
    // Item type fetch failed — status transitions won't be available
    availableStatuses = [];
  }

  // Transform to the shape expected by ItemDetail component
  const itemData: ItemDetailType = {
    id: item.id,
    name: item.name,
    slug: item.slug,
    itemTypeId: item.itemTypeId,
    statusId: item.statusId,
    locationId: item.locationId ?? null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    status: item.status
      ? {
          id: (item.status as { id: string }).id,
          name: (item.status as { name: string }).name,
          key: (item.status as { key: string }).key,
          color: (item.status as { color: string }).color,
          isFinal: (item.status as { isFinal: boolean }).isFinal,
        }
      : null,
    itemType: item.itemType
      ? {
          id: (item.itemType as { id: string }).id,
          name: (item.itemType as { name: string }).name,
          slug: (item.itemType as { slug: string }).slug,
        }
      : undefined,
    fieldValues: (item.fieldValues ?? []).map(
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
    ),
  };

  return (
    <div>
      <ItemDetail
        item={itemData}
        projectId={projectId}
        availableStatuses={availableStatuses}
        userId={user.id}
      />
    </div>
  );
}
