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
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [color, setColor] = useState(STATUS_COLORS[0]!);
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);

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

  async function handleCreateOrUpdate(e: React.FormEvent) {
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
          fetchStatuses();
          router.refresh();
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
          fetchStatuses();
          router.refresh();
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
    setShowForm(false);
    setEditingId(null);
    setErrors({});
  }

  function startEditing(status: StatusItem) {
    setEditingId(status.id);
    setName(status.name);
    setKey(status.key);
    setColor(status.color);
    setDescription(status.description ?? '');
    setIsDefault(status.isDefault);
    setShowForm(true);
    setErrors({});
  }

  function cancelForm() {
    resetForm();
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleDelete(statusId: string) {
    if (!confirm('Delete this status? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}/statuses/${statusId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchStatuses();
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        alert(body.message || 'Cannot delete: this status has items.');
        return;
      }
      alert(body.message || 'Failed to delete status.');
    } catch {
      alert('An unexpected error occurred.');
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
        return;
      }

      const body = await res.json().catch(() => ({}));
      alert(body.message || 'Failed to set as default.');
    } catch {
      alert('An unexpected error occurred.');
    }
  }

  // ---------------------------------------------------------------------------
  // Reorder
  // ---------------------------------------------------------------------------

  async function handleMoveUp(sorted: StatusItem[], index: number) {
    if (index <= 0) return;
    const newSorted = [...sorted];
    [newSorted[index - 1], newSorted[index]] = [newSorted[index]!, newSorted[index - 1]!];
    await submitReorder(newSorted.map((s) => s.id));
  }

  async function handleMoveDown(sorted: StatusItem[], index: number) {
    if (index >= sorted.length - 1) return;
    const newSorted = [...sorted];
    [newSorted[index], newSorted[index + 1]] = [newSorted[index + 1]!, newSorted[index]!];
    await submitReorder(newSorted.map((s) => s.id));
  }

  async function submitReorder(statusIds: string[]) {
    let parsed: ReorderStatusesInput;
    try {
      parsed = reorderStatusesSchema.parse({ statusIds });
    } catch {
      alert('Invalid reorder data.');
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
      } else {
        const body = await res.json().catch(() => ({}));
        alert(body.message || 'Failed to reorder statuses.');
      }
    } catch {
      alert('An unexpected error occurred.');
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
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Status
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <form onSubmit={handleCreateOrUpdate} noValidate className="mb-8 rounded-lg border p-4">
          <h3 className="mb-3 font-semibold">{editingId ? 'Edit Status' : 'New Status'}</h3>

          {errors.general && (
            <div role="alert" className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="st-name" className="mb-1 block text-sm font-medium">Name</label>
                <input
                  id="st-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g. In Progress"
                  maxLength={100}
                />
                {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="st-key" className="mb-1 block text-sm font-medium">Key</label>
                <input
                  id="st-key"
                  type="text"
                  required
                  value={key}
                  onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                  placeholder="e.g. in-progress"
                  maxLength={100}
                />
                {errors.key && <p className="mt-1 text-sm text-destructive">{errors.key}</p>}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="mb-1 block text-sm font-medium">Color</label>
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
              <label htmlFor="st-desc" className="mb-1 block text-sm font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="st-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                maxLength={500}
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded"
              />
              Set as default status
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : editingId ? 'Update Status' : 'Create Status'}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Statuses list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : statuses.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-3 text-muted-foreground">
            No statuses configured yet. Add your first status to define the workflow for this item type.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add First Status
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((status, index) => (
            <div key={status.id} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => handleMoveUp(sorted, index)}
                    disabled={index === 0}
                    className="rounded px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(sorted, index)}
                    disabled={index === sorted.length - 1}
                    className="rounded px-1 py-0.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>
                {!status.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(status.id)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Set Default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startEditing(status)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(status.id)}
                  className="text-xs text-destructive hover:text-destructive/80"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
