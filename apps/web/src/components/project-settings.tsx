'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProjectSchema, type UpdateProjectInput } from '@mantemap/validation';
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
  Textarea,
} from '@mantemap/ui';
import { toast } from 'sonner';

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

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [archiveOpen, setArchiveOpen] = useState(false);
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
        toast.success('Project updated.');
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
    setIsArchiving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/archive`, {
        method: 'POST',
      });

      if (res.ok) {
        router.push('/projects');
        toast.success('Project archived.');
      } else {
        const body = await res.json().catch(() => ({}));
        toast.error(body.message || 'Failed to archive project.');
      }
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <>
      <div className="rounded-lg border p-4">
        <h3 className="mb-3 font-semibold">Project Settings</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openEdit}>
            Edit Project
          </Button>
          <Button
            variant="outline"
            onClick={() => setArchiveOpen(true)}
            disabled={isArchiving}
            className="border-destructive text-destructive hover:bg-destructive/10"
          >
            {isArchiving ? 'Archiving...' : 'Archive Project'}
          </Button>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the project name and description.
            </DialogDescription>
          </DialogHeader>

          {editError && (
            <div
              role="alert"
              className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive"
            >
              {editError}
            </div>
          )}

          <form onSubmit={handleEdit} noValidate className="space-y-4">
            <div>
              <Label htmlFor="ps-name">Name</Label>
              <Input
                id="ps-name"
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="ps-desc">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="ps-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Dialog */}
      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Archive Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive this project? It will be hidden from active views.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleArchive} disabled={isArchiving}>
              {isArchiving ? 'Archiving...' : 'Archive'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
