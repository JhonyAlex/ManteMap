/**
 * AlertBell — header bell icon with unread count badge.
 *
 * Shows a bell icon with a badge displaying the unread alert count.
 * Clicking opens a dropdown with recent alerts and a link to the
 * full alerts page.
 *
 * Spec: openspec/changes/phase-8-alerts/specs/alert-management/spec.md
 *   "Unread Count" — GET /alerts/unread-count returns { count }
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "Header bell icon with unread badge (TanStack Query)"
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  useUnreadCount,
  useAlerts,
  useAcknowledge,
  useDismiss,
} from '@/hooks/use-alerts';
import { AlertCard } from './alert-card';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlertBellProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AlertBell({ projectId }: AlertBellProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useUnreadCount(projectId);
  const { data: alerts } = useAlerts({ projectId, status: 'ACTIVE' });
  const acknowledge = useAcknowledge(projectId);
  const dismiss = useDismiss(projectId);

  const count = unreadData?.count ?? 0;
  const recentAlerts = alerts?.slice(0, 5) ?? [];

  const close = useCallback(() => setOpen(false), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        close();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, close]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, close]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Alerts"
        aria-expanded={open}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        {/* Bell icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {/* Badge */}
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border bg-popover p-3 shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Alerts</h2>
            <Link
              href={`/projects/${projectId}/alerts`}
              className="text-xs text-primary hover:underline"
              onClick={close}
            >
              View all
            </Link>
          </div>

          {recentAlerts.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              No active alerts
            </p>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {recentAlerts.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={(id) => acknowledge.mutate(id)}
                  onDismiss={(id) => dismiss.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
