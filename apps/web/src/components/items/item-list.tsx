/**
 * ItemList — Client Component for displaying items in a dynamic table.
 *
 * Renders columns derived from showInList DynamicFields using buildColumns.
 * Uses TanStack Query (useItems) for data fetching with search and pagination.
 */

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import type { DynamicFieldDefinition } from '@mantemap/shared';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Input,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@mantemap/ui';
import { toast } from 'sonner';
import { FileText } from 'lucide-react';
import { buildColumns } from './column-builder';
import { renderCellValue } from './cell-renderer';
import { useItems } from '@/hooks/use-items';
import { QRSheet } from './qr-sheet';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ItemListProps {
  projectId: string;
  itemTypeId: string;
  fields: DynamicFieldDefinition[];
  initialSearch?: string;
  pageSize?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ItemList({
  projectId,
  itemTypeId,
  fields,
  initialSearch = '',
  pageSize = 20,
}: ItemListProps) {
  const [search, setSearch] = useState(initialSearch);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: items, isLoading, error, refetch } = useItems({
    projectId,
    itemTypeId,
    search: search || undefined,
    page,
    pageSize,
  });

  const columns = buildColumns(fields);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setPage(1);
    },
    []
  );

  const handlePrevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setPage((p) => p + 1);
  }, []);

  const toggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (!items) return;
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => item.id)));
    }
  }, [items, selectedIds.size]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleteOpen(true);
  }, [selectedIds]);

  const handleBatchDeleteConfirm = useCallback(async () => {
    setIsBatchDeleting(true);
    setDeleteOpen(false);

    let successCount = 0;
    let failedCount = 0;

    for (const id of selectedIds) {
      try {
        const res = await fetch(`/api/projects/${projectId}/items/${id}`, {
          method: 'DELETE',
        });
        if (res.ok || res.status === 204) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch {
        failedCount++;
      }
    }

    if (failedCount > 0) {
      toast.warning(`${successCount} deleted, ${failedCount} failed`);
    } else {
      toast.success(`${successCount} items deleted`);
    }

    setSelectedIds(new Set());
    setIsBatchDeleting(false);
    refetch();
  }, [selectedIds, projectId, refetch]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-destructive">
          Failed to load items: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Batch Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Selected Items</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{selectedIds.size}</strong> selected items? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBatchDeleteConfirm} disabled={isBatchDeleting}>
              {isBatchDeleting ? 'Deleting...' : `Delete ${selectedIds.size} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={handleSearchChange}
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              onClick={handleBatchDelete}
              disabled={isBatchDeleting}
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              {isBatchDeleting
                ? 'Deleting...'
                : `Delete Selected (${selectedIds.size})`}
            </Button>
          )}
          <Link
            href={`/projects/${projectId}/items/new?itemTypeId=${itemTypeId}`}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            New Item
          </Link>
          <QRSheet
            projectId={projectId}
            itemIds={items?.map((item) => item.id) ?? []}
            disabled={!items || items.length === 0}
          />
        </div>
      </div>

      {/* Table */}
      {!items || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No items found</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            {search ? 'Try adjusting your search.' : 'Create your first item to get started.'}
          </p>
          {!search && (
            <Link
              href={`/projects/${projectId}/items/new?itemTypeId=${itemTypeId}`}
              className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create First Item
            </Link>
          )}
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={items ? selectedIds.size === items.length && items.length > 0 : false}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </TableHead>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/projects/${projectId}/items/${item.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                  {columns.slice(1).map((col) => {
                    const itemRecord = item as unknown as Record<string, unknown>;
                    return (
                      <TableCell key={col.key}>
                        {renderCellValue(col.type, itemRecord[col.key])}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} &middot; {items.length} item{items.length !== 1 ? 's' : ''}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevPage}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextPage}
                disabled={items.length < pageSize}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
