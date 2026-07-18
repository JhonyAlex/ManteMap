/**
 * ItemDetail — Client Component for displaying item details.
 *
 * Renders all field values by type using renderCellValue.
 * Displays current status as a Badge with status color.
 * Provides edit and delete actions with confirmation dialog.
 * Shows attached documents with upload capability.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Item detail page"
 * Spec: openspec/changes/phase-5-documents/specs/document-management/spec.md
 *   "Document CRUD" — list documents on item detail
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "field value renderer, status badge, actions"
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DynamicFieldType } from '@mantemap/shared';
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@mantemap/ui';
import { renderCellValue } from './cell-renderer';
import { StatusTransition } from './status-transition';
import type { StatusOption } from './status-transition';
import { useDeleteItem } from '@/hooks/use-items';
import type { ItemDetail as ItemDetailType } from '@/hooks/use-items';
import { DocumentList } from './documents/document-list';
import { UploadDialog } from './documents/upload-dialog';
import { QRCodeDisplay } from './qr-code-display';
import { InspectionForm } from './inspection-form';
import { ExportPDFButton } from './export-pdf-button';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ItemDetailProps {
  item: ItemDetailType;
  projectId: string;
  availableStatuses?: StatusOption[];
  /** Current user ID for inspection logging. */
  userId?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ItemDetail({ item, projectId, availableStatuses = [], userId }: ItemDetailProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const deleteMutation = useDeleteItem(projectId, item.id);

  const handleDelete = useCallback(() => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => {
        router.push(`/projects/${projectId}/items`);
      },
    });
  }, [deleteMutation, router, projectId]);

  return (
    <div className="space-y-6">
      {/* Header — stacked on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{item.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {item.itemType && (
              <span className="text-sm text-muted-foreground">
                {item.itemType.name}
              </span>
            )}
            {item.status ? (
              <Badge
                style={{ backgroundColor: item.status.color }}
                className="text-white min-h-[24px]"
              >
                {item.status.name}
              </Badge>
            ) : (
              <Badge variant="outline">No status</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {availableStatuses.length > 0 && (
            <StatusTransition
              projectId={projectId}
              itemId={item.id}
              currentStatusId={item.statusId}
              availableStatuses={availableStatuses}
            />
          )}
          <Link
            href={`/projects/${projectId}/items/${item.id}/edit`}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Edit
          </Link>
          <button
            onClick={() => setQrOpen(true)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Show QR
          </button>
          <ExportPDFButton
            projectId={projectId}
            itemId={item.id}
            itemName={item.name}
          />
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-destructive bg-background px-4 text-sm font-medium text-destructive shadow-sm transition-colors hover:bg-destructive/10"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Field values */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Fields</h2>
        </div>
        {/* Location */}
        {item.location && (
          <div className="flex items-start justify-between px-4 py-3 border-b">
            <span className="text-sm font-medium text-muted-foreground">
              Location
            </span>
            <span className="text-sm">
              {item.location.name}
            </span>
          </div>
        )}
        {!item.fieldValues || item.fieldValues.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No fields configured.
          </div>
        ) : (
          <div className="divide-y">
            {item.fieldValues.map((fv) => (
              <div key={fv.id} className="flex items-start justify-between px-4 py-3 min-h-[44px]">
                <span className="text-sm font-medium text-muted-foreground">
                  {fv.dynamicField?.name ?? fv.dynamicFieldId}
                </span>
                <span className="text-sm">
                  {renderCellValue(
                    (fv.dynamicField?.type as DynamicFieldType) ?? 'SHORT_TEXT',
                    fv.value
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Documents</h2>
          <Button onClick={() => setUploadOpen(true)} size="sm">
            Upload Document
          </Button>
        </div>
        <DocumentList projectId={projectId} itemId={item.id} />
      </div>

      {/* Inspection log section */}
      {userId && (
        <div className="rounded-lg border p-4">
          <InspectionForm
            projectId={projectId}
            itemId={item.id}
            userId={userId}
            currentStatusId={item.statusId ?? undefined}
            onSubmit={async (data) => {
              const res = await fetch(`/api/projects/${projectId}/inspections`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  itemId: item.id,
                  statusId: data.statusId,
                  notes: data.notes,
                  photoPath: data.photoPath,
                }),
              });
              if (!res.ok) {
                throw new Error('Failed to log inspection');
              }
            }}
          />
        </div>
      )}

      {/* Upload dialog */}
      <UploadDialog
        projectId={projectId}
        itemId={item.id}
        open={uploadOpen}
        onOpenChange={setUploadOpen}
      />

      {/* QR code dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code — {item.name}</DialogTitle>
            <DialogDescription>
              Scan this QR code to open the item detail page.
            </DialogDescription>
          </DialogHeader>
          <QRCodeDisplay projectId={projectId} itemId={item.id} />
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{item.name}</strong>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              onClick={() => setDeleteOpen(false)}
              className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="inline-flex h-9 items-center justify-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground shadow transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
