/**
 * AlertList — filterable list of alerts with severity indicators.
 *
 * Shows alerts with optional filters for severity, status, and alert type.
 * Each alert renders as an AlertCard with acknowledge/dismiss actions.
 *
 * Spec: openspec/changes/phase-8-alerts/specs/alert-management/spec.md
 *   "List filtered by severity" — GET /alerts?severity=warning
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "Filterable alert list with severity indicators"
 */

'use client';

import React, { useState } from 'react';
import {
  useAlerts,
  useAcknowledge,
  useDismiss,
  type UseAlertsOptions,
} from '@/hooks/use-alerts';
import { AlertCard } from './alert-card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mantemap/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AlertListProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AlertList({ projectId }: AlertListProps) {
  const [severity, setSeverity] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [alertType, setAlertType] = useState<string | undefined>(undefined);

  const options: UseAlertsOptions = { projectId };
  if (severity) options.severity = severity;
  if (status) options.status = status;
  if (alertType) options.alertType = alertType;

  const { data: alerts, isLoading, error } = useAlerts(options);
  const acknowledge = useAcknowledge(projectId);
  const dismiss = useDismiss(projectId);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="w-40">
          <label
            htmlFor="severity-filter"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Severity
          </label>
          <Select
            value={severity ?? 'all'}
            onValueChange={(v) => setSeverity(v === 'all' ? undefined : v)}
          >
            <SelectTrigger id="severity-filter" aria-label="Severity">
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All severities</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="WARNING">Warning</SelectItem>
              <SelectItem value="INFO">Info</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-40">
          <label
            htmlFor="status-filter"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Status
          </label>
          <Select
            value={status ?? 'all'}
            onValueChange={(v) => setStatus(v === 'all' ? undefined : v)}
          >
            <SelectTrigger id="status-filter" aria-label="Status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
              <SelectItem value="DISMISSED">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="w-48">
          <label
            htmlFor="type-filter"
            className="mb-1 block text-xs font-medium text-muted-foreground"
          >
            Type
          </label>
          <Select
            value={alertType ?? 'all'}
            onValueChange={(v) => setAlertType(v === 'all' ? undefined : v)}
          >
            <SelectTrigger id="type-filter" aria-label="Alert type">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="DOCUMENT_EXPIRING">Document Expiring</SelectItem>
              <SelectItem value="STATUS_INCIDENT">Status Incident</SelectItem>
              <SelectItem value="STATUS_BLOCKING">Status Blocking</SelectItem>
              <SelectItem value="STATUS_FINAL">Status Final</SelectItem>
              <SelectItem value="EVENT_UPCOMING">Event Upcoming</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Loading alerts...
        </p>
      )}

      {error && (
        <p className="py-8 text-center text-sm text-destructive">
          Error loading alerts. Please try again.
        </p>
      )}

      {!isLoading && !error && alerts && alerts.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No alerts found.
        </p>
      )}

      {!isLoading && !error && alerts && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert) => (
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
  );
}
