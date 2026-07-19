'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createLocationSchema, type CreateLocationInput } from '@mantemap/validation';
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
  // Render tree node
  // ---------------------------------------------------------------------------

  function renderTreeNode(nodes: LocationTreeNode[], depth: number): React.ReactNode {
    return nodes.map((node) => {
      const hasChildren = node.children && node.children.length > 0;
      const isExpanded = expandedNodes.has(node.id);

      return (
        <div key={node.id}>
          <div
            className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 cursor-pointer"
            style={{ paddingLeft: `${depth * 20 + 8}px` }}
            onClick={() => hasChildren && toggleNode(node.id)}
          >
            {hasChildren ? (
              <span className="text-xs text-muted-foreground w-4 text-center">
                {isExpanded ? '▾' : '▸'}
              </span>
            ) : (
              <span className="w-4" />
            )}
            <span
              className="rounded px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground"
            >
              {LEVEL_LABELS[node.level] ?? `L${node.level}`}
            </span>
            <span className="text-sm">{node.name}</span>
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
          <h3 className="mb-2 text-sm font-medium text-muted-foreground">All Locations ({flatLocations.length})</h3>
          <div className="space-y-1">
            {flatLocations
              .filter((l) => l.active)
              .map((loc) => (
                <div key={loc.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {LEVEL_LABELS[loc.level] ?? `L${loc.level}`}
                    </span>
                    <span>{loc.name}</span>
                  </div>
                  {loc.parentId && (
                    <span className="text-xs text-muted-foreground">
                      child of{' '}
                      {flatLocations.find((l) => l.id === loc.parentId)?.name ?? loc.parentId}
                    </span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
