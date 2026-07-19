'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  createStatusSchema,
  type CreateStatusInput,
  updateStatusSchema,
  type UpdateStatusInput,
  reorderStatusesSchema,
  type ReorderStatusesInput,
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
  Skeleton,
} from '@mantemap/ui';
import { toast } from 'sonner';
import { Pencil, Trash2, GripVertical, Plus, GitBranch } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StatusItem {
  id: string;
  name: string;
  key: string;
  color: string;
  icon?: string | null;
  description?: string | null;
  order: number;
  isDefault: boolean;
  isFinal?: boolean;
  isStart?: boolean;
}

interface ItemTypeInfo {
  id: string;
  name: string;
  slug: string;
}

interface FormErrors {
  name?: string;
  key?: string;
  color?: string;
  general?: string;
}

interface StatusesPageProps {
  params: Promise<{ projectId: string; itemTypeId: string }>;
}

// ---------------------------------------------------------------------------
// Predefined color palette
// ---------------------------------------------------------------------------

const STATUS_COLORS = [
  '#6B7280', // Gray
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StatusesPage({ params }: StatusesPageProps) {
  const { projectId, itemTypeId } = React.use(params);
  const router = useRouter();

  const [itemType, setItemType] = useState<ItemTypeInfo | null>(null);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [color, setColor] = useState(STATUS_COLORS[0]!);
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusToDelete, setStatusToDelete] = useState<StatusItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchItemType = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}`);
      if (res.ok) {
        const body = await res.json();
        setItemType(body.data);
      }
    } catch {
      // silent
    }
  }, [projectId, itemTypeId]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/statuses`);
      if (res.ok) {
        const body = await res.json();
        setStatuses(body.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, [projectId, itemTypeId]);

  useEffect(() => {
    fetchItemType();
    fetchStatuses();
  }, [fetchItemType, fetchStatuses]);

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  function handleNameChange(value: string) {
    setName(value);
    if (!key || key === name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) {
      setKey(
        value
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Create / Update
  // ---------------------------------------------------------------------------

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const isEditing = editingId !== null;

    if (isEditing) {
      let parsed: UpdateStatusInput;
      try {
        parsed = updateStatusSchema.parse({
          name,
          key,
          color,
          description: description || undefined,
          isDefault,
        });
      } catch (err) {
        if (err instanceof ZodError) {
          const fieldErrors: FormErrors = {};
          for (const issue of err.issues) {
            const f = issue.path[0] as keyof FormErrors;
            if (f === 'name' || f === 'key' || f === 'color') {
              fieldErrors[f] = issue.message;
            }
          }
          setErrors(fieldErrors);
        }
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/statuses/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        });

        if (res.ok) {
          resetForm();
          setDialogOpen(false);
          fetchStatuses();
          router.refresh();
          toast.success('Status updated.');
          return;
        }

        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setErrors({ key: body.message || 'A status with this key already exists.' });
          return;
        }
        setErrors({ general: body.message || 'Failed to update status.' });
      } catch {
        setErrors({ general: 'An unexpected error occurred.' });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      let parsed: CreateStatusInput;
      try {
        parsed = createStatusSchema.parse({
          name,
          key,
          color,
          description: description || undefined,
          isDefault,
        });
      } catch (err) {
        if (err instanceof ZodError) {
          const fieldErrors: FormErrors = {};
          for (const issue of err.issues) {
            const f = issue.path[0] as keyof FormErrors;
            if (f === 'name' || f === 'key' || f === 'color') {
              fieldErrors[f] = issue.message;
            }
          }
          setErrors(fieldErrors);
        }
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/statuses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed),
        });

        if (res.status === 201) {
          resetForm();
          setDialogOpen(false);
          fetchStatuses();
          router.refresh();
          toast.success('Status created.');
          return;
        }

        const body = await res.json().catch(() => ({}));
        if (res.status === 409) {
          setErrors({ key: body.message || 'A status with this key already exists.' });
          return;
        }
        setErrors({ general: body.message || 'Failed to create status.' });
      } catch {
        setErrors({ general: 'An unexpected error occurred.' });
      } finally {
        setIsSubmitting(false);
      }
    }
  }

  function resetForm() {
    setName('');
    setKey('');
    setColor(STATUS_COLORS[0]!);
    setDescription('');
    setIsDefault(false);
    setEditingId(null);
    setErrors({});
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(status: StatusItem) {
    setEditingId(status.id);
    setName(status.name);
    setKey(status.key);
    setColor(status.color);
    setDescription(status.description ?? '');
    setIsDefault(status.isDefault);
    setErrors({});
    setDialogOpen(true);
  }

  function openDeleteDialog(status: StatusItem) {
    setStatusToDelete(status);
    setDeleteOpen(true);
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleDeleteConfirm() {
    if (!statusToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/statuses/${statusToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDeleteOpen(false);
        setStatusToDelete(null);
        fetchStatuses();
        router.refresh();
        toast.success('Status deleted.');
        return;
      }

      const body = await res.json().catch(() => ({}));
      toast.error(body.message || 'Failed to delete status.');
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Set Default
  // ---------------------------------------------------------------------------

  async function handleSetDefault(statusId: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/statuses/${statusId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });

      if (res.ok) {
        fetchStatuses();
        router.refresh();
        toast.success('Default status updated.');
        return;
      }

      const body = await res.json().catch(() => ({}));
      toast.error(body.message || 'Failed to set as default.');
    } catch {
      toast.error('An unexpected error occurred.');
    }
  }

  // ---------------------------------------------------------------------------
  // Reorder via drag & drop
  // ---------------------------------------------------------------------------

  function handleDragReorder(draggedId: string, targetId: string) {
    const sorted = [...statuses].sort((a, b) => a.order - b.order);
    const draggedIdx = sorted.findIndex((s) => s.id === draggedId);
    const targetIdx = sorted.findIndex((s) => s.id === targetId);
    if (draggedIdx < 0 || targetIdx < 0 || draggedIdx === targetIdx) return;
    const newSorted = [...sorted];
    const [moved] = newSorted.splice(draggedIdx, 1);
    newSorted.splice(targetIdx, 0, moved!);
    submitReorder(newSorted.map((s) => s.id));
  }

  async function submitReorder(statusIds: string[]) {
    let parsed: ReorderStatusesInput;
    try {
      parsed = reorderStatusesSchema.parse({ statusIds });
    } catch {
      toast.error('Invalid reorder data.');
      return;
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/statuses/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (res.ok) {
        fetchStatuses();
        router.refresh();
        toast.success('Statuses reordered.');
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.message || 'Failed to reorder statuses.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const sorted = statuses.slice().sort((a, b) => a.order - b.order);

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Link href={`/projects/${projectId}/item-types`} className="hover:text-foreground hover:underline">
              Item Types
            </Link>
            <span>/</span>
            <span className="text-foreground">{itemType?.name ?? 'Loading...'}</span>
            <span>/</span>
            <span className="font-medium text-foreground">Statuses</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Statuses</h2>
          <p className="text-sm text-muted-foreground">
            Configure the workflow states for this item type.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Add Status
        </Button>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Status' : 'New Status'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update the status details.' : 'Create a new workflow status.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errors.general && (
              <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                {errors.general}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="st-name">Name</Label>
                <Input
                  id="st-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. In Progress"
                  maxLength={100}
                  autoFocus
                />
                {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
              </div>
              <div>
                <Label htmlFor="st-key">Key</Label>
                <Input
                  id="st-key"
                  type="text"
                  required
                  value={key}
                  onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="font-mono"
                  placeholder="e.g. in-progress"
                  maxLength={100}
                />
                {errors.key && <p className="mt-1 text-sm text-destructive">{errors.key}</p>}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <Label>Color</Label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border p-0.5"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-28 font-mono text-sm"
                  maxLength={7}
                />
                {color && /^#[0-9a-fA-F]{6}$/.test(color) && (
                  <span className="h-9 w-9 rounded-md border" style={{ backgroundColor: color }} />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-8 w-8 rounded-md border-2 transition-colors ${
                      color === c ? 'border-foreground ring-2 ring-ring' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Color ${c}`}
                  />
                ))}
              </div>
              {errors.color && <p className="mt-1 text-sm text-destructive">{errors.color}</p>}
            </div>

            <div>
              <Label htmlFor="st-desc">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="st-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              Set as default status
            </label>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingId ? 'Update Status' : 'Create Status'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {statusToDelete?.name}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{statusToDelete?.name}</strong>? This action cannot be undone.
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

      {/* Statuses list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : statuses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <GitBranch className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No statuses yet</h3>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            Add your first status to define the workflow for this item type.
          </p>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-1 h-4 w-4" />
            Add First Status
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((status) => (
            <div
              key={status.id}
              draggable
              onDragStart={(e) => { e.dataTransfer.setData('text/plain', status.id); }}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                const draggedId = e.dataTransfer.getData('text/plain');
                handleDragReorder(draggedId, status.id);
              }}
              className="flex cursor-grab items-center justify-between rounded-lg border p-3 active:cursor-grabbing"
            >
              <div className="flex items-center gap-3">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
                <span
                  className="h-5 w-5 flex-shrink-0 rounded-full border"
                  style={{ backgroundColor: status.color }}
                />
                <div>
                  <p className="font-medium">
                    {status.name}
                    {status.isDefault && (
                      <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">{status.key}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {status.description && (
                  <p className="max-w-[150px] truncate text-xs text-muted-foreground">
                    {status.description}
                  </p>
                )}
                {!status.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSetDefault(status.id)}
                    className="text-xs"
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(status)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDeleteDialog(status)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
