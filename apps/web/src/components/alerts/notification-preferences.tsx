/**
 * NotificationPreferences — per-project toggle UI for alert types.
 *
 * Shows a toggle switch for each alert type. Users can enable/disable
 * specific alert types for the current project, plus per-channel delivery
 * toggles (In-App, Email, Slack, Teams, Telegram).
 *
 * Spec: openspec/changes/phase-8-alerts/specs/notification-preferences/spec.md
 *   "Toggle alert type off" — user disables toggle, saves as false
 *   "Preferences CRUD API" — GET/PUT notification preferences
 * Phase 10: openspec/changes/phase-10-external-notifications/specs/notification-preferences/spec.md
 *   "Channel Toggle UI Column" — per-channel toggles per alert type row
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "Per-project toggle UI"
 */

'use client';

import React from 'react';
import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from '@/hooks/use-notification-preferences';
import type { UserChannelConfig } from '@/hooks/use-notification-channels';
import { Switch } from '@mantemap/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NotificationPreferencesProps {
  projectId: string;
  channelConfigs?: UserChannelConfig[];
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

const CHANNEL_KEYS = ['email', 'slack', 'teams', 'telegram'] as const;
const CHANNEL_LABELS: Record<string, string> = {
  email: 'Email',
  slack: 'Slack',
  teams: 'Teams',
  telegram: 'Telegram',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationPreferences({
  projectId,
  channelConfigs,
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

  // Build a map of alertType -> preference
  const prefMap = new Map(preferences.map((p) => [p.alertType, p]));

  // Build set of configured channel types
  const configuredChannels = new Set(
    (channelConfigs ?? []).map((c) => c.channelType)
  );

  function handleEnabledToggle(alertType: string, currentValue: boolean) {
    update.mutate({ alertType, enabled: !currentValue });
  }

  function handleChannelToggle(
    alertType: string,
    channelKey: string,
    currentValue: boolean
  ) {
    update.mutate({
      alertType,
      [channelKey]: !currentValue,
    });
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Notification Preferences</h3>
      <p className="text-xs text-muted-foreground">
        Control which alert types you receive for this project.
      </p>

      {/* Channel toggle header */}
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">
        Notification Channels
      </h4>

      {/* Header row for channel columns */}
      <div className="hidden sm:grid sm:grid-cols-6 sm:gap-2 sm:items-center sm:px-3">
        <span className="text-xs text-muted-foreground col-span-1" />
        <span className="text-xs text-muted-foreground text-center">In-App</span>
        <span className="text-xs text-muted-foreground text-center">Email</span>
        <span className="text-xs text-muted-foreground text-center">Slack</span>
        <span className="text-xs text-muted-foreground text-center">Teams</span>
        <span className="text-xs text-muted-foreground text-center">Telegram</span>
      </div>

      <div className="space-y-3">
        {ALERT_TYPE_ORDER.map((alertType) => {
          const pref = prefMap.get(alertType);
          const enabled = pref?.enabled ?? true;

          return (
            <div
              key={alertType}
              className="grid grid-cols-6 gap-2 items-center rounded-lg border p-3"
            >
              {/* Alert type label */}
              <span className="text-sm truncate col-span-1">
                {ALERT_TYPE_LABELS[alertType] ?? alertType}
              </span>

              {/* In-App toggle */}
              <div className="flex justify-center">
                <Switch
                  checked={enabled}
                  onCheckedChange={() => handleEnabledToggle(alertType, enabled)}
                  disabled={update.isPending}
                  aria-label={`${ALERT_TYPE_LABELS[alertType] ?? alertType} in-app`}
                />
              </div>

              {/* Channel toggles */}
              {CHANNEL_KEYS.map((key) => {
                const channelValue = (pref?.[key] ?? false) as boolean;
                const isConfigured =
                  key === 'email' || configuredChannels.has(key);

                return (
                  <div key={key} className="flex justify-center">
                    <Switch
                      checked={channelValue}
                      onCheckedChange={() =>
                        handleChannelToggle(alertType, key, channelValue)
                      }
                      disabled={update.isPending || !isConfigured}
                      aria-label={`${ALERT_TYPE_LABELS[alertType] ?? alertType} ${CHANNEL_LABELS[key]}`}
                      title={
                        !isConfigured
                          ? `Configure ${CHANNEL_LABELS[key]} first`
                          : undefined
                      }
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
