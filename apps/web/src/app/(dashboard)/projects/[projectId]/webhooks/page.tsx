'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  params: Promise<{ projectId: string }>;
}

// ---------------------------------------------------------------------------
// Available event types (from the codebase)
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
  const { projectId } = React.use(params);
  const router = useRouter();

  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [active, setActive] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isCreating, setIsCreating] = useState(false);

  // Delete state
  const [deletingWebhookId, setDeletingWebhookId] = useState<string | null>(null);

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});

    // Client-side validation
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
        setShowForm(false);
        fetchWebhooks();
        router.refresh();
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

  async function handleDelete(webhookId: string) {
    if (!confirm('Delete this webhook endpoint? This action cannot be undone.')) return;

    setDeletingWebhookId(webhookId);
    try {
      const res = await fetch(`/api/projects/${projectId}/webhooks/${webhookId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchWebhooks();
        router.refresh();
        return;
      }

      const body = await res.json().catch(() => ({}));
      alert(body.message || 'Failed to delete webhook.');
    } catch {
      alert('An unexpected error occurred.');
    } finally {
      setDeletingWebhookId(null);
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
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add Webhook
          </button>
        )}
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

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} noValidate className="mb-8 rounded-lg border p-4">
          <h3 className="mb-3 font-semibold">New Webhook Endpoint</h3>

          {errors.general && (
            <div role="alert" className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive">
              {errors.general}
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="wh-name" className="mb-1 block text-sm font-medium">Name</label>
              <input
                id="wh-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="e.g. Slack Notifier"
                maxLength={200}
              />
              {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
            </div>

            {/* URL */}
            <div>
              <label htmlFor="wh-url" className="mb-1 block text-sm font-medium">URL</label>
              <input
                id="wh-url"
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="https://hooks.example.com/webhook"
              />
              {errors.url && <p className="mt-1 text-sm text-destructive">{errors.url}</p>}
            </div>

            {/* Secret */}
            <div>
              <label htmlFor="wh-secret" className="mb-1 block text-sm font-medium">
                Secret <span className="text-muted-foreground">(optional)</span>
              </label>
              <input
                id="wh-secret"
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm font-mono"
                placeholder="HMAC signing secret"
              />
            </div>

            {/* Event Types */}
            <div>
              <label className="mb-2 block text-sm font-medium">Event Types</label>
              <div className="grid grid-cols-1 gap-1.5 rounded-md border p-3 sm:grid-cols-2">
                {EVENT_TYPES.map((et) => (
                  <label
                    key={et}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent/50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.has(et)}
                      onChange={() => toggleEventType(et)}
                      className="rounded"
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
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded"
                />
                Active
              </label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Inactive webhooks will not receive event notifications.
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={isCreating}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Create Webhook'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Webhooks list */}
      {isLoadingList ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : webhooks.length === 0 && !showForm ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-3 text-muted-foreground">
            No webhooks configured. Create your first webhook to receive event notifications.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Add First Webhook
          </button>
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
                  <button
                    type="button"
                    onClick={() => handleDelete(wh.id)}
                    disabled={deletingWebhookId === wh.id}
                    className="rounded px-1.5 py-0.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
                  >
                    {deletingWebhookId === wh.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
