'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createItemTypeSchema, type CreateItemTypeInput, updateItemTypeSchema, type UpdateItemTypeInput } from '@mantemap/validation';
import { ZodError } from 'zod';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Label,
  Skeleton,
} from '@mantemap/ui';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Package } from 'lucide-react';

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
  params: Promise<{ projectCode: string }>;
}

export default function ItemTypesPage({ params }: ItemTypesPageProps) {
  const { projectCode: projectId } = React.use(params);
  const router = useRouter();

  const [itemTypes, setItemTypes] = useState<ItemTypeItem[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemTypeItem | null>(null);

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemTypeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  function openCreateDialog() {
    setEditingItem(null);
    setName('');
    setSlug('');
    setDescription('');
    setColor('');
    setErrors({});
    setDialogOpen(true);
  }

  function openEditDialog(item: ItemTypeItem) {
    setEditingItem(item);
    setName(item.name);
    setSlug(item.slug);
    setDescription(item.description ?? '');
    setColor(item.color ?? '');
    setErrors({});
    setDialogOpen(true);
  }

  function openDeleteDialog(item: ItemTypeItem) {
    setItemToDelete(item);
    setDeleteOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
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

    setIsSaving(true);
    try {
      const isEditing = editingItem !== null;
      const url = isEditing
        ? `/api/projects/${projectId}/item-types/${editingItem!.id}`
        : `/api/projects/${projectId}/item-types`;
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      });

      if (res.status === 201 || res.ok) {
        setDialogOpen(false);
        fetchItemTypes();
        router.refresh();
        toast.success(isEditing ? 'Item type updated.' : 'Item type created.');
        return;
      }

      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setErrors({ slug: body.message || 'An item type with this slug already exists.' });
        return;
      }

      setErrors({ general: body.message || 'Failed to save item type.' });
    } catch {
      setErrors({ general: 'An unexpected error occurred.' });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!itemToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/item-types/${itemToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDeleteOpen(false);
        setItemToDelete(null);
        fetchItemTypes();
        router.refresh();
        toast.success('Item type deleted.');
        return;
      }

      const body = await res.json().catch(() => ({}));
      toast.error(body.message || 'Failed to delete item type.');
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
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
        <Button onClick={openCreateDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Add Type
        </Button>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item Type' : 'New Item Type'}</DialogTitle>
            <DialogDescription>
              {editingItem ? 'Update the item type details.' : 'Create a new item type to categorize items.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {errors.general && (
              <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                {errors.general}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label htmlFor="it-name">Name</Label>
                <Input
                  id="it-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Fire Extinguisher"
                  maxLength={100}
                  autoFocus
                />
                {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
              </div>

              <div>
                <Label htmlFor="it-slug">Slug</Label>
                <Input
                  id="it-slug"
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="font-mono"
                  placeholder="e.g. fire-extinguisher"
                  maxLength={80}
                />
                {errors.slug && <p className="mt-1 text-sm text-destructive">{errors.slug}</p>}
              </div>

              <div>
                <Label htmlFor="it-desc">Description <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="it-desc"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                />
              </div>

              <div>
                <Label>Color <span className="text-muted-foreground">(optional)</span></Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color || '#6B7280'}
                    onChange={(e) => setColor(e.target.value)}
                    className="h-9 w-12 cursor-pointer rounded border p-0.5"
                  />
                  <Input
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#3B82F6"
                    className="w-28 font-mono text-sm"
                    maxLength={7}
                  />
                  {color && /^#[0-9a-fA-F]{6}$/.test(color) && (
                    <span className="h-9 w-9 rounded-md border" style={{ backgroundColor: color }} />
                  )}
                </div>
                {errors.color && <p className="mt-1 text-sm text-destructive">{errors.color}</p>}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {itemToDelete?.name}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{itemToDelete?.name}</strong>? This action cannot be undone.
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

      {/* List */}
      {isLoadingList ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : itemTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No item types yet</h3>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            Create your first item type to start managing items.
          </p>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-1 h-4 w-4" />
            Create Item Type
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {itemTypes.map((it) => (
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(it)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openDeleteDialog(it)}
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
