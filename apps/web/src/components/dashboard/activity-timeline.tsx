'use client';

/**
 * ActivityTimeline — displays a bounded, newest-first activity feed.
 *
 * Shows recent activity from items, documents, alerts, and events
 * with kind badges and relative timestamps.
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "Bounded Activity Timeline" — newest-first, empty state
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "Activity" — normalize, sort descending, slice to limit
 */

import React from 'react';
import type { ActivityEntry, ActivityKind } from '@mantemap/shared';

interface ActivityTimelineProps {
  entries: ActivityEntry[];
}

const KIND_LABELS: Record<ActivityKind, string> = {
  item_created: 'Item Created',
  item_updated: 'Item Updated',
  document_uploaded: 'Document Uploaded',
  alert_created: 'Alert Created',
  event_created: 'Event Created',
};

function formatKind(kind: ActivityKind): string {
  return KIND_LABELS[kind] ?? kind;
}

function sortByNewest(entries: ActivityEntry[]): ActivityEntry[] {
  return [...entries].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export function ActivityTimeline({ entries }: ActivityTimelineProps) {
  if (entries.length === 0) {
    return (
      <div role="region" aria-label="Recent activity">
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  const sorted = sortByNewest(entries);

  return (
    <div role="region" aria-label="Recent activity">
      <ul aria-label="Recent activity" className="space-y-3">
        {sorted.map((entry) => (
          <li
            key={`${entry.kind}:${entry.id}`}
            className="flex items-start gap-3 rounded-md border p-3"
          >
            <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
              {formatKind(entry.kind)}
            </span>
            <div className="min-w-0 flex-1">
              <a
                href={entry.href}
                className="block truncate text-sm font-medium hover:underline"
              >
                {entry.title}
              </a>
              <time
                dateTime={entry.timestamp.toISOString()}
                className="text-xs text-muted-foreground"
              >
                {entry.timestamp.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
