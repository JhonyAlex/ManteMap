'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import { Trash2, Plus, Link2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WebhookEndpoint {
  id: string;
  projectId: string;
  name: string;
  url: string;
  eventTypes: string[];
  active: boolean;
  retryCount: number;
  createdAt: string;
}

interface FormErrors {
  name?: string;
  url?: string;
  eventTypes?: string;
  general?: string;
}

interface WebhooksPageProps {
  params: Promise<{ projectCode: string }>;
}

// ---------------------------------------------------------------------------
// Available event types
// ---------------------------------------------------------------------------

const EVENT_TYPES = [
  'ITEM_CREATED',
  'ITEM_UPDATED',
  'ITEM_DELETED',
  'ITEM_ARCHIVED',
  'STATUS_CHANGED',
  'DOCUMENT_UPLOADED',
  'DOCUMENT_EXPIRING',
  'DOCUMENT_EXPIRED',
  'EVENT_UPCOMING',
  'STATUS_INCIDENT',
  'INSPECTION_CREATED',
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function WebhooksPage({ params }: WebhooksPageProps) {
  const { projectCode: projectId } = React.use(params);
  const router = useRouter();

  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<WebhookEndpoint | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/webhooks`);
      if (res.ok) {
        const body = await res.json();
        setWebhooks(body.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingList(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // ---------------------------------------------------------------------------
  // Event type toggle helper
  // ---------------------------------------------------------------------------

  function toggleEventType(eventType: string) {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventType)) {
        next.delete(eventType);
      } else {
        next.add(eventType);
      }
      return next;
    });
  }

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  function resetForm() {
    setName('');
    setUrl('');
    setSecret('');
    setSelectedEvents(new Set());
    setActive(true);
    setErrors({});
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    const fieldErrors: FormErrors = {};
    if (!name.trim()) {
      fieldErrors.name = 'Name is required.';
    }
    if (!url.trim()) {
      fieldErrors.url = 'URL is required.';
    } else {
      try {
        new URL(url.trim());
      } catch {
        fieldErrors.url = 'Please enter a valid URL.';
      }
    }
    if (selectedEvents.size === 0) {
      fieldErrors.eventTypes = 'Select at least one event type.';
    }
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          secret: secret.trim() || undefined,
          eventTypes: Array.from(selectedEvents),
          active,
        }),
      });

      if (res.status === 201) {
        resetForm();
        setDialogOpen(false);
        fetchWebhooks();
        router.refresh();
        toast.success('Webhook created.');
        return;
      }

      const body = await res.json().catch(() => ({}));
      setErrors({ general: body.message || 'Failed to create webhook.' });
    } catch {
      setErrors({ general: 'An unexpected error occurred.' });
    } finally {
      setIsCreating(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  function openDeleteDialog(wh: WebhookEndpoint) {
    setWebhookToDelete(wh);
    setDeleteOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!webhookToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/webhooks/${webhookToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setDeleteOpen(false);
        setWebhookToDelete(null);
        fetchWebhooks();
        router.refresh();
        toast.success('Webhook deleted.');
        return;
      }

      const body = await res.json().catch(() => ({}));
      toast.error(body.message || 'Failed to delete webhook.');
    } catch {
      toast.error('An unexpected error occurred.');
    } finally {
      setIsDeleting(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function truncateUrl(u: string, max = 50) {
    return u.length > max ? u.slice(0, max) + '...' : u;
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Configure webhook endpoints to receive event notifications.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-1 h-4 w-4" />
          Add Webhook
        </Button>
      </div>

      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          href={`/projects/${projectId}`}
          className="text-xs text-primary hover:underline"
        >
          &larr; Back to Project
        </Link>
      </div>

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Configure a webhook to receive event notifications.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            {errors.general && (
              <div role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
                {errors.general}
              </div>
            )}

            <div>
              <Label htmlFor="wh-name">Name</Label>
              <Input
                id="wh-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Slack Notifier"
                maxLength={200}
                autoFocus
              />
              {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="wh-url">URL</Label>
              <Input
                id="wh-url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://hooks.example.com/webhook"
              />
              {errors.url && <p className="mt-1 text-sm text-destructive">{errors.url}</p>}
            </div>

            <div>
              <Label htmlFor="wh-secret">
                Secret <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="wh-secret"
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="font-mono"
                placeholder="HMAC signing secret"
              />
            </div>

            {/* Event Types */}
            <div>
              <Label className="mb-2 block">Event Types</Label>
              <div className="grid grid-cols-1 gap-1.5 rounded-md border p-3 sm:grid-cols-2">
                {EVENT_TYPES.map((et) => (
                  <label
                    key={et}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedEvents.has(et)}
                      onCheckedChange={() => toggleEventType(et)}
                    />
                    <span className="select-none text-xs">{et.replace(/_/g, ' ')}</span>
                  </label>
                ))}
              </div>
              {errors.eventTypes && <p className="mt-1 text-sm text-destructive">{errors.eventTypes}</p>}
            </div>

            {/* Active toggle */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <Checkbox
                  checked={active}
                  onCheckedChange={(checked) => setActive(checked === true)}
                />
                Active
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Inactive webhooks will not receive event notifications.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Webhook'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {webhookToDelete?.name}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{webhookToDelete?.name}</strong>? This action cannot be undone.
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

      {/* Webhooks list */}
      {isLoadingList ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : webhooks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <div className="mb-4 rounded-full bg-muted p-4">
            <Link2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">No webhooks yet</h3>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            Create your first webhook to receive event notifications.
          </p>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-1 h-4 w-4" />
            Add First Webhook
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {webhooks.map((wh) => (
            <div key={wh.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{wh.name}</p>
                    {wh.active ? (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Active
                      </span>
                    ) : (
                      <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5" title={wh.url}>
                    {truncateUrl(wh.url)}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {wh.eventTypes.map((et) => (
                      <span
                        key={et}
                        className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {et.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="ml-3 flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(wh.createdAt)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openDeleteDialog(wh)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
