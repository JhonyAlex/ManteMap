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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Checkbox,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Skeleton,
} from '@mantemap/ui';
import { toast } from 'sonner';
import { Pencil, Trash2, GripVertical, Plus, MapPin } from 'lucide-react';

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

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [level, setLevel] = useState<number>(0);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editOrder, setEditOrder] = useState<number>(0);
  const [editActive, setEditActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [locationToDelete, setLocationToDelete] = useState<LocationItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
  // Create
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
        setCreateDialogOpen(false);
        fetchTree();
        fetchFlat();
        router.refresh();
        toast.success('Location created.');
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

  function openEditDialog(loc: LocationItem) {
    setEditingLocation(loc);
    setEditName(loc.name);
    setEditOrder(loc.order);
    setEditActive(loc.active);
    setErrors({});
    setEditDialogOpen(true);
  }

  function openDeleteDialog(loc: LocationItem) {
    setLocationToDelete(loc);
    setDeleteOpen(true);
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
        setEditDialogOpen(false);
        fetchTree();
        fetchFlat();
        router.refresh();
        toast.success('Location updated.');
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

  async function handleDeleteConfirm() {
    if (!locationToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/locations/${locationToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.status === 409) {
        toast.error('This location has sub-locations. Delete them first.');
        setDeleteOpen(false);
        setLocationToDelete(null);
      } else if (res.ok || res.status === 204) {
        setDeleteOpen(false);
        setLocationToDelete(null);
        fetchTree();
        fetchFlat();
        router.refresh();
        toast.success('Location deleted.');
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.message || 'Failed to delete location.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Reorder via drag & drop (flat list)
  // ---------------------------------------------------------------------------

  function handleDragReorder(draggedId: string, targetId: string) {
    const sorted = [...flatLocations].sort((a, b) => a.order - b.order);
    const draggedIdx = sorted.findIndex((l) => l.id === draggedId);
    const targetIdx = sorted.findIndex((l) => l.id === targetId);
    if (draggedIdx < 0 || targetIdx < 0 || draggedIdx === targetIdx) return;
    const newSorted = [...sorted];
    const [moved] = newSorted.splice(draggedIdx, 1);
    newSorted.splice(targetIdx, 0, moved!);
    handleReorder(newSorted.map((l) => l.id));
  }

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
        toast.success('Locations reordered.');
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

  // ---------------------------------------------------------------------------
  // Render tree node
  // ---------------------------------------------------------------------------

  function renderTreeNode(nodes: LocationTreeNode[], depth: number): React.ReactNode {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes.has(node.id);
      const locData = flatLocations.find((l) => l.id === node.id);

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
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const loc = flatLocations.find((l) => l.id === node.id);
                  if (loc) openEditDialog(loc);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  const loc = flatLocations.find((l) => l.id === node.id);
                  if (loc) openDeleteDialog(loc);
                }}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
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
        <Button onClick={() => { setCreateDialogOpen(true); setErrors({}); }}>
          <Plus className="mr-1 h-4 w-4" />
          Add Location
        </Button>
      </div>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) setCreateDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Location</DialogTitle>
            <DialogDescription>
              Create a new location in the hierarchy.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            {errors.general && (
              <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                {errors.general}
              </div>
            )}

            <div>
              <Label htmlFor="loc-name">Name</Label>
              <Input
                id="loc-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Main Building"
                maxLength={200}
                autoFocus
              />
              {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="loc-level">Level</Label>
                <Select value={String(level)} onValueChange={(v) => setLevel(Number(v))}>
                  <SelectTrigger id="loc-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LEVEL_LABELS).map(([val, label]) => (
                      <SelectItem key={val} value={val}>{label} ({val})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.level && <p className="mt-1 text-sm text-destructive">{errors.level}</p>}
              </div>

              <div>
                <Label htmlFor="loc-parent">
                  Parent <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Select value={parentId} onValueChange={(v) => setParentId(v === 'none' ? '' : v)}>
                  <SelectTrigger id="loc-parent">
                    <SelectValue placeholder="None (root level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (root level)</SelectItem>
                    {flatLocations
                      .filter((l) => l.active)
                      .map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          [{LEVEL_LABELS[l.level] ?? `L${l.level}`}] {l.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.parentId && <p className="mt-1 text-sm text-destructive">{errors.parentId}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Location'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update the location details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {errors.general && (
              <p className="text-sm text-destructive">{errors.general}</p>
            )}
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}

            <div>
              <Label htmlFor="edit-loc-name">Name</Label>
              <Input
                id="edit-loc-name"
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={200}
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="edit-loc-order">Order</Label>
              <Input
                id="edit-loc-order"
                type="number"
                value={editOrder}
                onChange={(e) => setEditOrder(Number(e.target.value))}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={editActive}
                onCheckedChange={(checked) => setEditActive(checked === true)}
              />
              Active
            </label>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => editingLocation && handleUpdate(editingLocation.id)} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {locationToDelete?.name}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{locationToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tree view */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
        </div>
      ) : tree.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No locations yet</h3>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            Create your first location to start building your hierarchy.
          </p>
          <Button onClick={() => { setCreateDialogOpen(true); setErrors({}); }}>
            <Plus className="mr-1 h-4 w-4" />
            Add First Location
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          {/* Tree controls */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h3 className="text-sm font-medium">Hierarchy</h3>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="ghost" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
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
            {[...flatLocations]
              .sort((a, b) => a.order - b.order)
              .map((loc) => (
                <div
                  key={loc.id}
                  draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/plain', loc.id); }}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedId = e.dataTransfer.getData('text/plain');
                    handleDragReorder(draggedId, loc.id);
                  }}
                  className="flex cursor-grab items-center justify-between rounded-md border px-3 py-2 text-sm active:cursor-grabbing"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(loc)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(loc)}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
