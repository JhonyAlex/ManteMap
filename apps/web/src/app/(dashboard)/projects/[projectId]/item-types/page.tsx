'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createItemTypeSchema, type CreateItemTypeInput, updateItemTypeSchema, type UpdateItemTypeInput } from '@mantemap/validation';
import { ZodError } from 'zod';

interface ItemTypeItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
}

interface FormErrors {
  name?: string;
  slug?: string;
  description?: string;
  color?: string;
  general?: string;
}

interface ItemTypesPageProps {
  params: Promise<{ projectId: string }>;
}

export default function ItemTypesPage({ params }: ItemTypesPageProps) {
  const { projectId } = React.use(params);
  const router = useRouter();

  const [itemTypes, setItemTypes] = useState<ItemTypeItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editErrors, setEditErrors] = useState<FormErrors>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchItemTypes = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/item-types`);
      if (res.ok) {
        const body = await res.json();
        setItemTypes(body.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingList(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchItemTypes();
  }, [fetchItemTypes]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slug || slug === name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) {
      setSlug(
        value
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
      );
    }
  }

  function handleEditNameChange(value: string) {
    setEditName(value);
    if (!editSlug || editSlug === editName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) {
      setEditSlug(
        value
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
      );
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    let parsed: CreateItemTypeInput;
    try {
      parsed = createItemTypeSchema.parse({
        name,
        slug,
        description: description || undefined,
        color: color || undefined,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: FormErrors = {};
        for (const issue of err.issues) {
          const field = issue.path[0] as keyof FormErrors;
          if (field === 'name' || field === 'slug' || field === 'description' || field === 'color') {
            fieldErrors[field] = issue.message;
          }
        }
        setErrors(fieldErrors);
      }
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/item-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (res.status === 201) {
        setName('');
        setSlug('');
        setDescription('');
        setColor('');
        setShowForm(false);
        fetchItemTypes();
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setErrors({ slug: body.message || 'An item type with this slug already exists.' });
        return;
      }

      setErrors({ general: body.message || 'Failed to create item type.' });
    } catch {
      setErrors({ general: 'An unexpected error occurred.' });
    } finally {
      setIsCreating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Edit
  // ---------------------------------------------------------------------------

  function startEditing(item: ItemTypeItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditSlug(item.slug);
    setEditDescription(item.description ?? '');
    setEditColor(item.color ?? '');
    setEditErrors({});
  }

  function cancelEditing() {
    setEditingId(null);
    setEditErrors({});
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    setEditErrors({});

    let parsed: UpdateItemTypeInput;
    try {
      parsed = updateItemTypeSchema.parse({
        name: editName,
        slug: editSlug,
        description: editDescription || undefined,
        color: editColor || undefined,
      });
    } catch (err) {
      if (err instanceof ZodError) {
        const fieldErrors: FormErrors = {};
        for (const issue of err.issues) {
          const field = issue.path[0] as keyof FormErrors;
          if (field === 'name' || field === 'slug' || field === 'description' || field === 'color') {
            fieldErrors[field] = issue.message;
          }
        }
        setEditErrors(fieldErrors);
      }
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (res.ok) {
        cancelEditing();
        fetchItemTypes();
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setEditErrors({ slug: body.message || 'An item type with this slug already exists.' });
        return;
      }
      setEditErrors({ general: body.message || 'Failed to update item type.' });
    } catch {
      setEditErrors({ general: 'An unexpected error occurred.' });
    } finally {
      setIsUpdating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async function handleDelete(itemTypeId: string) {
    if (!confirm('Delete this item type? This action cannot be undone.')) return;

    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemTypeId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchItemTypes();
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        alert(body.message || 'Cannot delete: this type has items.');
        return;
      }
      alert(body.message || 'Failed to delete item type.');
    } catch {
      alert('An unexpected error occurred.');
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Item Types</h2>
          <p className="text-sm text-muted-foreground">
            Configure the types of items this project manages.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Type
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} noValidate className="mb-8 rounded-lg border p-4">
          <h3 className="mb-3 font-semibold">New Item Type</h3>

          {errors.general && (
            <div role="alert" className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {errors.general}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label htmlFor="it-name" className="mb-1 block text-sm font-medium">Name</label>
              <input
                id="it-name"
                type="text"
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="e.g. Fire Extinguisher"
                maxLength={100}
              />
              {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
            </div>

            <div>
              <label htmlFor="it-slug" className="mb-1 block text-sm font-medium">Slug</label>
              <input
                id="it-slug"
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                placeholder="e.g. fire-extinguisher"
                maxLength={80}
              />
              {errors.slug && <p className="mt-1 text-sm text-destructive">{errors.slug}</p>}
            </div>

            <div>
              <label htmlFor="it-desc" className="mb-1 block text-sm font-medium">Description <span className="text-muted-foreground">(optional)</span></label>
              <input
                id="it-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                maxLength={500}
              />
            </div>

            <div>
              <label htmlFor="it-color" className="mb-1 block text-sm font-medium">Color <span className="text-muted-foreground">(optional hex)</span></label>
              <div className="flex gap-2">
                <input
                  id="it-color"
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-24 rounded-md border px-3 py-2 text-sm font-mono"
                  placeholder="#3B82F6"
                  maxLength={7}
                />
                {color && /^#[0-9a-fA-F]{6}$/.test(color) && (
                  <span className="h-9 w-9 rounded-md border" style={{ backgroundColor: color }} />
                )}
              </div>
              {errors.color && <p className="mt-1 text-sm text-destructive">{errors.color}</p>}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create'}
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

      {isLoadingList ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : itemTypes.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No item types yet. Add your first item type to start managing items.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {itemTypes.map((it) =>
            editingId === it.id ? (
              // ---- Inline edit form ----
              <form key={it.id} onSubmit={handleUpdate} noValidate className="rounded-lg border border-primary/40 bg-muted/20 p-3">
                {editErrors.general && (
                  <div role="alert" className="mb-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                    {editErrors.general}
                  </div>
                )}
                <div className="space-y-2">
                  <div>
                    <label className="mb-0.5 block text-xs font-medium">Name</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => handleEditNameChange(e.target.value)}
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      maxLength={100}
                    />
                    {editErrors.name && <p className="mt-0.5 text-xs text-destructive">{editErrors.name}</p>}
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs font-medium">Slug</label>
                    <input
                      type="text"
                      required
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full rounded-md border px-2 py-1.5 text-sm font-mono"
                      maxLength={80}
                    />
                    {editErrors.slug && <p className="mt-0.5 text-xs text-destructive">{editErrors.slug}</p>}
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs font-medium">Description <span className="text-muted-foreground">(optional)</span></label>
                    <input
                      type="text"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      maxLength={500}
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs font-medium">Color <span className="text-muted-foreground">(optional hex)</span></label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="w-24 rounded-md border px-2 py-1.5 text-sm font-mono"
                        placeholder="#3B82F6"
                        maxLength={7}
                      />
                      {editColor && /^#[0-9a-fA-F]{6}$/.test(editColor) && (
                        <span className="h-8 w-8 rounded-md border" style={{ backgroundColor: editColor }} />
                      )}
                    </div>
                    {editErrors.color && <p className="mt-0.5 text-xs text-destructive">{editErrors.color}</p>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              // ---- Display row ----
              <div key={it.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  {it.color && (
                    <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: it.color }} />
                  )}
                  <div>
                    <p className="font-medium">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${projectId}/item-types/${it.id}/fields`}
                    className="text-xs text-primary hover:underline"
                  >
                    Fields
                  </Link>
                  <Link
                    href={`/projects/${projectId}/item-types/${it.id}/statuses`}
                    className="text-xs text-primary hover:underline"
                  >
                    Statuses
                  </Link>
                  <Link
                    href={`/projects/${projectId}/items?itemTypeId=${it.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    View Items
                  </Link>
                  <button
                    type="button"
                    onClick={() => startEditing(it)}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(it.id)}
                    className="text-xs text-destructive hover:text-destructive/80"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
