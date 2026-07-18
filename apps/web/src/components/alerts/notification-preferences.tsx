/**
 * NotificationPreferences — per-project toggle UI for alert types.
 *
 * Shows a toggle switch for each alert type. Users can enable/disable
 * specific alert types for the current project.
 *
 * Spec: openspec/changes/phase-8-alerts/specs/notification-preferences/spec.md
 *   "Toggle alert type off" — user disables toggle, saves as false
 *   "Preferences CRUD API" — GET/PUT notification preferences
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "Per-project toggle UI"
 */

'use client';

import React from 'react';
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from '@/hooks/use-notification-preferences';
import { Switch } from '@mantemap/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationPreferencesProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALERT_TYPE_LABELS: Record<string, string> = {
  DOCUMENT_EXPIRING: 'Document Expiring',
  STATUS_INCIDENT: 'Status Incident',
  STATUS_BLOCKING: 'Status Blocking',
  STATUS_FINAL: 'Status Final',
  EVENT_UPCOMING: 'Event Upcoming',
};

const ALERT_TYPE_ORDER = [
  'DOCUMENT_EXPIRING',
  'STATUS_INCIDENT',
  'STATUS_BLOCKING',
  'STATUS_FINAL',
  'EVENT_UPCOMING',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationPreferences({
  projectId,
}: NotificationPreferencesProps) {
  const { data: preferences, isLoading, error } =
    useNotificationPreferences(projectId);
  const update = useUpdateNotificationPreference(projectId);

  if (isLoading) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Loading preferences...
      </p>
    );
  }

  if (error) {
    return (
      <p className="py-4 text-center text-sm text-destructive">
        Error loading preferences. Please try again.
      </p>
    );
  }

  if (!preferences) {
    return null;
  }

  // Build a map of alertType -> enabled
  const prefMap = new Map(preferences.map((p) => [p.alertType, p.enabled]));

  function handleToggle(alertType: string, currentValue: boolean) {
    update.mutate({ alertType, enabled: !currentValue });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Notification Preferences</h3>
      <p className="text-xs text-muted-foreground">
        Control which alert types you receive for this project.
      </p>

      <div className="space-y-3">
        {ALERT_TYPE_ORDER.map((alertType) => {
          const enabled = prefMap.get(alertType) ?? true;
          const label = ALERT_TYPE_LABELS[alertType] ?? alertType;

          return (
            <div
              key={alertType}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <label
                htmlFor={`pref-${alertType}`}
                className="text-sm cursor-pointer"
              >
                {label}
              </label>
              <Switch
                id={`pref-${alertType}`}
                checked={enabled}
                onCheckedChange={() => handleToggle(alertType, enabled)}
                disabled={update.isPending}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
