/**
 * AlertCard — displays a single alert with severity indicator and actions.
 *
 * Shows alert title, message, severity badge, and acknowledge/dismiss
 * buttons for ACTIVE alerts.
 *
 * Spec: openspec/changes/phase-8-alerts/specs/alert-management/spec.md
 *   "Acknowledge alert" — status changes to acknowledged
 *   "Dismiss alert" — status changes to dismissed
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "Individual alert with ack/dismiss actions"
 */

'use client';

import React from 'react';
import { Button } from '@mantemap/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Alert {
  id: string;
  projectId: string;
  alertType: string;
  severity: string;
  status: string;
  sourceType: string;
  sourceId: string;
  title: string;
  message: string | null;
  metadata: Record<string, unknown> | null;
  acknowledgedAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AlertCardProps {
  alert: Alert;
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const severityConfig: Record<
  string,
  { label: string; className: string }
> = {
  CRITICAL: {
    label: 'Critical',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  WARNING: {
    label: 'Warning',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  INFO: {
    label: 'Info',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'text-foreground' },
  ACKNOWLEDGED: {
    label: 'Acknowledged',
    className: 'text-muted-foreground',
  },
  DISMISSED: { label: 'Dismissed', className: 'text-muted-foreground' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AlertCard({ alert, onAcknowledge, onDismiss }: AlertCardProps) {
  const severity = severityConfig[alert.severity] ?? severityConfig.INFO;
  const status = statusConfig[alert.status] ?? statusConfig.ACTIVE;
  const isActive = alert.status === 'ACTIVE';

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium leading-snug">{alert.title}</h3>
          {alert.message && (
            <p className="mt-1 text-xs text-muted-foreground">{alert.message}</p>
          )}
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${severity.className}`}
        >
          {severity.label}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs ${status.className}`}>
          {alert.status === 'ACKNOWLEDGED' && (
            <>
              Acknowledged
              {alert.acknowledgedAt && ` · ${formatDate(alert.acknowledgedAt)}`}
            </>
          )}
          {alert.status === 'DISMISSED' && (
            <>
              Dismissed
              {alert.dismissedAt && ` · ${formatDate(alert.dismissedAt)}`}
            </>
          )}
          {alert.status === 'ACTIVE' && 'Active'}
        </span>

        {isActive && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAcknowledge(alert.id)}
            >
              Acknowledge
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDismiss(alert.id)}
            >
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
