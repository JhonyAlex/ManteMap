/**
 * ItemList — Client Component for displaying items in a dynamic table.
 *
 * Renders columns derived from showInList DynamicFields using buildColumns.
 * Uses TanStack Query (useItems) for data fetching with search and pagination.
 *
 * Spec: openspec/changes/phase-4-items-ui/specs/items-ui/spec.md
 *   "Items list page with dynamic columns"
 * Design: openspec/changes/phase-4-items-ui/design.md
 *   "Client Component with Table, search, pagination"
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
} from '@mantemap/ui';
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

  const { data: items, isLoading, error } = useItems({
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

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading items...</p>
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
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={handleSearchChange}
          className="h-9 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <div className="flex items-center gap-2">
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
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-3 text-muted-foreground">No items found.</p>
          <Link
            href={`/projects/${projectId}/items/new?itemTypeId=${itemTypeId}`}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Create First Item
          </Link>
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Link
                      href={`/projects/${projectId}/items/${item.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {item.name}
                    </Link>
                  </TableCell>
                  {columns.slice(1).map((col) => {
                    // For list view, we render name as a link above;
                    // remaining columns show a dash (field values require detail API)
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
              <button
                onClick={handlePrevPage}
                disabled={page <= 1}
                className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={handleNextPage}
                disabled={items.length < pageSize}
                className="inline-flex h-8 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
