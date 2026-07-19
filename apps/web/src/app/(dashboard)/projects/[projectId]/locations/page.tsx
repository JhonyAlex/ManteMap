'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createLocationSchema,
  updateLocationSchema,
  reorderLocationsSchema,
  type CreateLocationInput,
  type UpdateLocationInput,
} from '@mantemap/validation';
import { ZodError } from 'zod';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LocationItem {
  id: string;
  name: string;
  level: number;
  order: number;
  parentId: string | null;
  active: boolean;
  children?: LocationItem[];
}

interface LocationTreeNode {
  id: string;
  name: string;
  level: number;
  children?: LocationTreeNode[];
}

interface FormErrors {
  name?: string;
  parentId?: string;
  level?: string;
  general?: string;
}

interface LocationsPageProps {
  params: Promise<{ projectId: string }>;
}

// ---------------------------------------------------------------------------
// Level labels
// ---------------------------------------------------------------------------

const LEVEL_LABELS: Record<number, string> = {
  0: 'Center',
  1: 'Building',
  2: 'Floor',
  3: 'Room',
  4: 'Zone',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LocationsPage({ params }: LocationsPageProps) {
  const { projectId } = React.use(params);
  const router = useRouter();

  const [tree, setTree] = useState<LocationTreeNode[]>([]);
  const [flatLocations, setFlatLocations] = useState<LocationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [level, setLevel] = useState<number>(0);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);

  // Edit state
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState<number>(0);
  const [editActive, setEditActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null);

  // Reorder state
  const [isReordering, setIsReordering] = useState(false);
  const [reorderError, setReorderError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchTree = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/locations/tree`);
      if (res.ok) {
        const body = await res.json();
        setTree(body.data ?? []);
      }
    } catch {
      // silent
    }
  }, [projectId]);

  const fetchFlat = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/locations`);
      if (res.ok) {
        const body = await res.json();
        setFlatLocations(body.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTree();
    fetchFlat();
  }, [fetchTree, fetchFlat]);

  // ---------------------------------------------------------------------------
  // Tree helpers
  // ---------------------------------------------------------------------------

  function toggleNode(id: string) {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function expandAll() {
    const allIds = new Set<string>();
    function collectIds(nodes: LocationTreeNode[]) {
      for (const n of nodes) {
        allIds.add(n.id);
        if (n.children) collectIds(n.children);
      }
    }
    collectIds(tree);
    setExpandedNodes(allIds);
  }

  function collapseAll() {
    setExpandedNodes(new Set());
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    let parsed: CreateLocationInput;
    try {
      parsed = createLocationSchema.parse({
        name,
        parentId: parentId || undefined,
        level,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: FormErrors = {};
        for (const issue of err.issues) {
          const f = issue.path[0] as keyof FormErrors;
          if (f === 'name' || f === 'parentId' || f === 'level') {
            fieldErrors[f] = issue.message;
          }
        }
        setErrors(fieldErrors);
      }
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/locations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (res.status === 201) {
        setName('');
        setParentId('');
        setLevel(0);
        setShowForm(false);
        fetchTree();
        fetchFlat();
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({}));
      setErrors({ general: body.message || 'Failed to create location.' });
    } catch {
      setErrors({ general: 'An unexpected error occurred.' });
    } finally {
      setIsCreating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Edit & Delete handlers
  // ---------------------------------------------------------------------------

  function startEditing(loc: LocationItem) {
    setEditingLocationId(loc.id);
    setEditName(loc.name);
    setEditOrder(loc.order);
    setEditActive(loc.active);
    setErrors({});
  }

  function cancelEditing() {
    setEditingLocationId(null);
    setEditName('');
    setEditOrder(0);
    setEditActive(true);
    setErrors({});
  }

  async function handleUpdate(locationId: string) {
    setErrors({});
    setIsSaving(true);

    const payload: UpdateLocationInput = {
      name: editName.trim(),
      order: editOrder,
      active: editActive,
    };

    try {
      updateLocationSchema.parse(payload);
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: FormErrors = {};
        for (const issue of err.issues) {
          const f = issue.path[0] as keyof FormErrors;
          if (f === 'name') fieldErrors[f] = issue.message;
        }
        setErrors(fieldErrors);
      }
      setIsSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/locations/${locationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        cancelEditing();
        fetchTree();
        fetchFlat();
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setErrors({ general: body.message || 'Failed to update location.' });
      }
    } catch {
      setErrors({ general: 'An unexpected error occurred.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(locationId: string) {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
      return;
    }

    setDeletingLocationId(locationId);
    try {
      const res = await fetch(`/api/projects/${projectId}/locations/${locationId}`, {
        method: 'DELETE',
      });

      if (res.status === 409) {
        alert('This location has sub-locations. Delete them first.');
      } else if (res.ok || res.status === 204) {
        fetchTree();
        fetchFlat();
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        alert(body.message || 'Failed to delete location.');
      }
    } catch {
      alert('An unexpected error occurred.');
    } finally {
      setDeletingLocationId(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Reorder handlers
  // ---------------------------------------------------------------------------

  async function handleReorder(newOrderedIds: string[]) {
    setReorderError(null);
    setIsReordering(true);
    try {
      const parsed = reorderLocationsSchema.safeParse({ locationIds: newOrderedIds });
      if (!parsed.success) {
        setReorderError(parsed.error.errors[0]?.message ?? 'Invalid reorder data');
        return;
      }

      const res = await fetch(`/api/projects/${projectId}/locations/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (res.ok) {
        fetchTree();
        fetchFlat();
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setReorderError(body.message || 'Failed to reorder locations.');
      }
    } catch {
      setReorderError('An unexpected error occurred.');
    } finally {
      setIsReordering(false);
    }
  }

  function handleMoveUp(locId: string) {
    const sorted = [...flatLocations].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((l) => l.id === locId);
    if (idx <= 0) return;
    const newOrder = [...sorted];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    handleReorder(newOrder.map((l) => l.id));
  }

  function handleMoveDown(locId: string) {
    const sorted = [...flatLocations].sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((l) => l.id === locId);
    if (idx < 0 || idx >= sorted.length - 1) return;
    const newOrder = [...sorted];
    [newOrder[idx], newOrder[idx + 1]] = [newOrder[idx + 1], newOrder[idx]];
    handleReorder(newOrder.map((l) => l.id));
  }

  // ---------------------------------------------------------------------------
  // Render tree node
  // ---------------------------------------------------------------------------

  function renderTreeNode(nodes: LocationTreeNode[], depth: number): React.ReactNode {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes.has(node.id);
      const isEditing = editingLocationId === node.id;
      const locData = flatLocations.find((l) => l.id === node.id);

      if (isEditing && locData) {
        return (
          <div key={node.id}>
            <div
              className="rounded-md border bg-accent/20 px-2 py-2"
              style={{ paddingLeft: `${depth * 20 + 8}px` }}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span
                  className="rounded px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground shrink-0"
                >
                  {LEVEL_LABELS[node.level] ?? `L${node.level}`}
                </span>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 rounded-md border px-2 py-1 text-sm"
                  maxLength={200}
                  autoFocus
                />
                <label className="flex items-center gap-1 text-xs shrink-0">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={(e) => setEditActive(e.target.checked)}
                    className="rounded"
                  />
                  Active
                </label>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleUpdate(node.id)}
                    disabled={isSaving}
                    className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={isSaving}
                    className="rounded border px-2.5 py-1 text-xs hover:bg-accent disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              {errors.general && (
                <p className="mt-1 text-xs text-destructive">{errors.general}</p>
              )}
              {errors.name && (
                <p className="mt-1 text-xs text-destructive">{errors.name}</p>
              )}
            </div>
            {hasChildren && isExpanded && (
              <div>{renderTreeNode(node.children!, depth + 1)}</div>
            )}
          </div>
        );
      }

      return (
        <div key={node.id}>
          <div
            className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50"
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
          >
            <button
              type="button"
              onClick={() => hasChildren && toggleNode(node.id)}
              className="w-4 text-center text-xs text-muted-foreground cursor-pointer"
            >
              {hasChildren ? (isExpanded ? '▾' : '▸') : ''}
            </button>
            <span
              className="rounded px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
            >
              {LEVEL_LABELS[node.level] ?? `L${node.level}`}
            </span>
            <span className="text-sm flex-1">{node.name}</span>
            <span className="hidden gap-1 group-hover:flex">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const loc = flatLocations.find((l) => l.id === node.id);
                  if (loc) startEditing(loc);
                }}
                className="rounded px-1.5 py-0.5 text-xs text-primary hover:bg-accent"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(node.id);
                }}
                disabled={deletingLocationId === node.id}
                className="rounded px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
              >
                {deletingLocationId === node.id ? 'Deleting...' : 'Delete'}
              </button>
            </span>
          </div>
          {hasChildren && isExpanded && (
            <div>{renderTreeNode(node.children!, depth + 1)}</div>
          )}
        </div>
      );
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Locations</h2>
          <p className="text-sm text-muted-foreground">
            Manage your location hierarchy: centers, buildings, floors, rooms, and zones.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Location
          </button>
        )}
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} noValidate className="mb-8 rounded-lg border p-4">
          <h3 className="mb-3 font-semibold">New Location</h3>

          {errors.general && (
            <div role="alert" className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="loc-name" className="mb-1 block text-sm font-medium">Name</label>
              <input
                id="loc-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="e.g. Main Building"
                maxLength={200}
              />
              {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="loc-level" className="mb-1 block text-sm font-medium">Level</label>
                <select
                  id="loc-level"
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value))}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  {Object.entries(LEVEL_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label} ({val})</option>
                  ))}
                </select>
                {errors.level && <p className="mt-1 text-sm text-destructive">{errors.level}</p>}
              </div>

              <div>
                <label htmlFor="loc-parent" className="mb-1 block text-sm font-medium">
                  Parent <span className="text-muted-foreground">(optional)</span>
                </label>
                <select
                  id="loc-parent"
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                >
                  <option value="">None (root level)</option>
                  {flatLocations
                    .filter((l) => l.active)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        [{LEVEL_LABELS[l.level] ?? `L${l.level}`}] {l.name}
                      </option>
                    ))}
                </select>
                {errors.parentId && <p className="mt-1 text-sm text-destructive">{errors.parentId}</p>}
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Location'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setErrors({}); }}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tree view */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : tree.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-3 text-muted-foreground">
            No locations configured yet. Create your first location to start building your hierarchy.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add First Location
          </button>
        </div>
      ) : (
        <div className="rounded-lg border">
          {/* Tree controls */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h3 className="text-sm font-medium">Hierarchy</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="text-xs text-primary hover:underline"
              >
                Expand All
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="text-xs text-primary hover:underline"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Tree nodes */}
          <div className="p-2">{renderTreeNode(tree, 0)}</div>
        </div>
      )}

      {/* Flat list for reference */}
      {flatLocations.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">All Locations ({flatLocations.length})</h3>
            {isReordering && (
              <span className="text-xs text-muted-foreground">Reordering...</span>
            )}
          </div>
          {reorderError && (
            <div role="alert" className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {reorderError}
            </div>
          )}
          <div className="space-y-1">
            {(() => {
              const sorted = [...flatLocations].sort((a, b) => a.order - b.order);
              const firstId = sorted[0]?.id;
              const lastId = sorted[sorted.length - 1]?.id;

              return flatLocations.map((loc) => {
                const isFirst = loc.id === firstId;
                const isLast = loc.id === lastId;
                const isEditing = editingLocationId === loc.id;

              if (isEditing) {
                return (
                  <div key={loc.id} className="rounded-md border bg-accent/20 px-3 py-2">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground shrink-0">
                        {LEVEL_LABELS[loc.level] ?? `L${loc.level}`}
                      </span>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 rounded-md border px-2 py-1 text-sm"
                        maxLength={200}
                        autoFocus
                      />
                      <label className="flex items-center gap-1 text-xs shrink-0">
                        <input
                          type="checkbox"
                          checked={editActive}
                          onChange={(e) => setEditActive(e.target.checked)}
                          className="rounded"
                        />
                        Active
                      </label>
                      <div className="flex gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleUpdate(loc.id)}
                          disabled={isSaving}
                          className="rounded bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          {isSaving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={isSaving}
                          className="rounded border px-2.5 py-1 text-xs hover:bg-accent disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                    {errors.general && (
                      <p className="mt-1 text-xs text-destructive">{errors.general}</p>
                    )}
                    {errors.name && (
                      <p className="mt-1 text-xs text-destructive">{errors.name}</p>
                    )}
                  </div>
                );
              }

              return (
                <div key={loc.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {LEVEL_LABELS[loc.level] ?? `L${loc.level}`}
                    </span>
                    <span>{loc.name}</span>
                    {!loc.active && (
                      <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs text-destructive">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {loc.parentId && (
                      <span className="text-xs text-muted-foreground">
                        child of{' '}
                        {flatLocations.find((l) => l.id === loc.parentId)?.name ?? loc.parentId}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleMoveUp(loc.id)}
                      disabled={isFirst || isReordering}
                      title={isFirst ? 'Already first' : 'Move up'}
                      className="rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(loc.id)}
                      disabled={isLast || isReordering}
                      title={isLast ? 'Already last' : 'Move down'}
                      className="rounded px-1 py-0.5 text-xs text-muted-foreground hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing(loc)}
                      className="rounded px-1.5 py-0.5 text-xs text-primary hover:bg-accent"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(loc.id)}
                      disabled={deletingLocationId === loc.id}
                      className="rounded px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                    >
                      {deletingLocationId === loc.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            });})()}
          </div>
        </div>
      )}
    </div>
  );
}
