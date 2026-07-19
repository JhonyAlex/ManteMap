'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProjectSchema, type UpdateProjectInput } from '@mantemap/validation';
import { ZodError } from 'zod';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ProjectSettingsProps {
  projectId: string;
  currentName: string;
  currentDescription?: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectSettings({ projectId, currentName, currentDescription }: ProjectSettingsProps) {
  const router = useRouter();

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  // Archive state
  const [isArchiving, setIsArchiving] = useState(false);

  function openEdit() {
    setEditName(currentName);
    setEditDescription(currentDescription ?? '');
    setEditError('');
    setEditOpen(true);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setEditError('');

    const payload: UpdateProjectInput = {
      name: editName.trim() || undefined,
      description: editDescription.trim() || undefined,
    };

    try {
      updateProjectSchema.parse(payload);
    } catch (err) {
      if (err instanceof ZodError) {
        setEditError(err.issues[0]?.message ?? 'Invalid input');
      }
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditOpen(false);
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        setEditError(body.message || 'Failed to update project.');
      }
    } catch {
      setEditError('An unexpected error occurred.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    if (!confirm('Are you sure you want to archive this project? It will be hidden from active views.')) {
      return;
    }

    setIsArchiving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/archive`, {
        method: 'POST',
      });

      if (res.ok) {
        router.push('/projects');
      } else {
        const body = await res.json().catch(() => ({}));
        alert(body.message || 'Failed to archive project.');
      }
    } catch {
      alert('An unexpected error occurred.');
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <>
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 font-semibold">Project Settings</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openEdit}
            className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Edit Project
          </button>
          <button
            type="button"
            onClick={handleArchive}
            disabled={isArchiving}
            className="inline-flex h-9 items-center rounded-md border border-destructive bg-background px-4 text-sm font-medium text-destructive shadow-sm transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            {isArchiving ? 'Archiving...' : 'Archive Project'}
          </button>
        </div>
      </div>

      {/* Edit dialog — inline modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">Edit Project</h2>

            {editError && (
              <div
                role="alert"
                className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive"
              >
                {editError}
              </div>
            )}

            <form onSubmit={handleEdit} noValidate className="space-y-4">
              <div>
                <label htmlFor="ps-name" className="mb-1 block text-sm font-medium">
                  Name
                </label>
                <input
                  id="ps-name"
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  maxLength={100}
                />
              </div>

              <div>
                <label htmlFor="ps-desc" className="mb-1 block text-sm font-medium">
                  Description <span className="text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="ps-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  disabled={isSaving}
                  className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
