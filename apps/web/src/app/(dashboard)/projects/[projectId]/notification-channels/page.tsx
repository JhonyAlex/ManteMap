'use client';

/**
 * Notification Channels management page.
 *
 * List, configure, test, and delete external notification channel configs
 * (Slack, Microsoft Teams, Telegram) scoped to the authenticated user.
 *
 * APIs:
 *   GET    /api/projects/[projectId]/notification-channels
 *   PUT    /api/projects/[projectId]/notification-channels
 *   DELETE /api/projects/[projectId]/notification-channels?type={channelType}
 *   POST   /api/projects/[projectId]/notification-channels/test
 *
 * Spec: openspec/changes/phase-10-external-notifications/specs/channel-configuration/spec.md
 *   "Channel Config CRUD API" — GET/PUT/DELETE notification-channels
 *   "Test Connectivity Endpoint" — POST test
 */

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  useChannelConfigs,
  useUpsertChannelConfig,
  useDeleteChannelConfig,
  useTestChannel,
} from '@/hooks/use-notification-channels';
import {
  slackConfigSchema,
  teamsConfigSchema,
  telegramConfigSchema,
} from '@mantemap/validation';
import { Button, Input, Label, Badge, Card, CardContent } from '@mantemap/ui';
import type { ZodObject } from 'zod';

// ---------------------------------------------------------------------------
// Channel definitions
// ---------------------------------------------------------------------------

interface ChannelField {
  name: string;
  label: string;
  placeholder: string;
}

interface ChannelDef {
  type: 'slack' | 'teams' | 'telegram';
  label: string;
  description: string;
  fields: ChannelField[];
}

const CHANNELS: ChannelDef[] = [
  {
    type: 'slack',
    label: 'Slack',
    description: 'Send notifications to a Slack channel via incoming webhook.',
    fields: [
      {
        name: 'webhookUrl',
        label: 'Webhook URL',
        placeholder: 'https://hooks.slack.com/services/...',
      },
    ],
  },
  {
    type: 'teams',
    label: 'Microsoft Teams',
    description: 'Send notifications to a Teams channel via incoming webhook.',
    fields: [
      {
        name: 'webhookUrl',
        label: 'Webhook URL',
        placeholder: 'https://mytenant.webhook.office.com/...',
      },
    ],
  },
  {
    type: 'telegram',
    label: 'Telegram',
    description: 'Send notifications to a Telegram chat via bot.',
    fields: [
      {
        name: 'botToken',
        label: 'Bot Token',
        placeholder: '123456:ABC-DEF...',
      },
      {
        name: 'chatId',
        label: 'Chat ID',
        placeholder: '-1001234567890',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Per-channel Zod schemas
// ---------------------------------------------------------------------------

const configSchemas: Record<string, ZodObject<any>> = {
  slack: slackConfigSchema,
  teams: teamsConfigSchema,
  telegram: telegramConfigSchema,
};

function getConfigSchema(channelType: string): ZodObject<any> | null {
  return configSchemas[channelType] ?? null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Partially mask a config value for display. */
function maskValue(value: string): string {
  if (!value) return '—';
  if (value.length <= 8) return value.slice(0, 2) + '••••' + value.slice(-2);
  return value.slice(0, 4) + '••••••' + value.slice(-4);
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function NotificationChannelsPage({ params }: PageProps) {
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams.projectId;

  // ---- Hooks ---------------------------------------------------------------

  const {
    data: configs,
    isLoading,
    error: fetchError,
  } = useChannelConfigs(projectId);

  const upsertMut = useUpsertChannelConfig(projectId);
  const deleteMut = useDeleteChannelConfig(projectId);
  const testMut = useTestChannel(projectId);

  // ---- Local state ---------------------------------------------------------

  /** Which channel's form is currently expanded (null = none). */
  const [expanded, setExpanded] = useState<string | null>(null);

  /** Per-channel form field values keyed by channelType → fieldName → value. */
  const [formValues, setFormValues] = useState<
    Record<string, Record<string, string>>
  >({});

  /** Per-channel field-level validation errors. */
  const [formErrors, setFormErrors] = useState<
    Record<string, Record<string, string>>
  >({});

  /** Per-channel saving indicator. */
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  /** Per-channel test result. */
  const [testStatus, setTestStatus] = useState<
    Record<string, { success: boolean; error?: string } | null>
  >({});

  /** Per-channel testing indicator. */
  const [testing, setTesting] = useState<Record<string, boolean>>({});

  // ---- Derived data --------------------------------------------------------

  /** channelType → config lookup. */
  const configMap = useMemo(() => {
    const map: Record<string, any> = {};
    if (configs) {
      for (const c of configs) {
        map[c.channelType] = c;
      }
    }
    return map;
  }, [configs]);

  // ---- Handlers ------------------------------------------------------------

  /** Update a single form field value and clear its error. */
  const handleInputChange = useCallback(
    (channelType: string, fieldName: string, value: string) => {
      setFormValues((prev) => ({
        ...prev,
        [channelType]: { ...(prev[channelType] ?? {}), [fieldName]: value },
      }));
      setFormErrors((prev) => {
        if (!prev[channelType]?.[fieldName]) return prev;
        const nextChannel = { ...prev[channelType] };
        delete nextChannel[fieldName];
        return { ...prev, [channelType]: nextChannel };
      });
    },
    [],
  );

  /** Expand/collapse the form for a channel. Pre-populates fields if expanding. */
  const toggleExpand = useCallback(
    (channelType: string) => {
      setExpanded((prev) => {
        if (prev === channelType) {
          // Collapse — clear form state
          setFormValues((fv) => {
            const next = { ...fv };
            delete next[channelType];
            return next;
          });
          setFormErrors((fe) => {
            const next = { ...fe };
            delete next[channelType];
            return next;
          });
          return null;
        }

        // Expand — pre-populate if there's an existing config
        const existing = configMap[channelType];
        if (existing?.config) {
          const def = CHANNELS.find((c) => c.type === channelType);
          if (def) {
            const populated: Record<string, string> = {};
            for (const field of def.fields) {
              populated[field.name] = String(existing.config[field.name] ?? '');
            }
            setFormValues((fv) => ({ ...fv, [channelType]: populated }));
          }
        }
        return channelType;
      });
    },
    [configMap],
  );

  /** Validate and save a channel config. */
  const handleSave = useCallback(
    async (channelType: string) => {
      const schema = getConfigSchema(channelType);
      if (!schema) return;

      const values = formValues[channelType] ?? {};
      const parsed = schema.safeParse(values);

      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path.length > 0 ? issue.path.join('.') : 'general';
          fieldErrors[field] = issue.message;
        }
        setFormErrors((prev) => ({ ...prev, [channelType]: fieldErrors }));
        return;
      }

      setSaving((prev) => ({ ...prev, [channelType]: true }));
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[channelType];
        return next;
      });

      try {
        await upsertMut.mutateAsync({
          channelType,
          config: parsed.data as Record<string, unknown>,
        });
        setExpanded(null);
        setFormValues((prev) => {
          const next = { ...prev };
          delete next[channelType];
          return next;
        });
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to save configuration';
        setFormErrors((prev) => ({
          ...prev,
          [channelType]: { general: msg },
        }));
      } finally {
        setSaving((prev) => ({ ...prev, [channelType]: false }));
      }
    },
    [formValues, upsertMut],
  );

  /** Delete a channel config after confirmation. */
  const handleDelete = useCallback(
    async (channelType: string) => {
      const label =
        CHANNELS.find((c) => c.type === channelType)?.label ?? channelType;
      if (!window.confirm(`Remove ${label} channel configuration? This cannot be undone.`)) {
        return;
      }
      try {
        await deleteMut.mutateAsync(channelType);
      } catch {
        // Error will be surfaced by the hook or global error boundary
      }
    },
    [deleteMut],
  );

  /** Send a test message through the configured channel. */
  const handleTest = useCallback(
    async (channelType: string) => {
      setTesting((prev) => ({ ...prev, [channelType]: true }));
      setTestStatus((prev) => {
        const next = { ...prev };
        delete next[channelType];
        return next;
      });
      try {
        const result = await testMut.mutateAsync(channelType);
        setTestStatus((prev) => ({ ...prev, [channelType]: result }));
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Test failed';
        setTestStatus((prev) => ({
          ...prev,
          [channelType]: { success: false, error: msg },
        }));
      } finally {
        setTesting((prev) => ({ ...prev, [channelType]: false }));
      }
    },
    [testMut],
  );

  /** Dismiss a test result alert. */
  const dismissTest = useCallback((channelType: string) => {
    setTestStatus((prev) => {
      const next = { ...prev };
      delete next[channelType];
      return next;
    });
  }, []);

  // ---- Render: loading -----------------------------------------------------

  if (isLoading) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Notification Channels
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Loading channel configurations…
          </p>
        </div>
        <div className="space-y-4">
          {CHANNELS.map((ch) => (
            <Card key={ch.type}>
              <CardContent className="p-4">
                <div className="space-y-3 animate-pulse">
                  <div className="h-5 w-32 rounded bg-muted" />
                  <div className="h-4 w-64 rounded bg-muted" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ---- Render: error -------------------------------------------------------

  if (fetchError) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Notification Channels
          </h1>
        </div>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load channel configurations:{' '}
          {fetchError instanceof Error ? fetchError.message : 'Unknown error'}
        </div>
      </div>
    );
  }

  // ---- Render: normal ------------------------------------------------------

  return (
    <div className="max-w-2xl">
      {/* Back link */}
      <Link
        href={`/projects/${projectId}`}
        className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground transition-colors motion-reduce:transition-none"
      >
        ← Back to project
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          Notification Channels
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure external notification channels (Slack, Microsoft Teams,
          Telegram) for your account in this project.
        </p>
      </div>

      <div className="space-y-4">
        {CHANNELS.map((channel) => {
          const config = configMap[channel.type];
          const isConfigured = Boolean(config);
          const isExpanded = expanded === channel.type;
          const isSaving = saving[channel.type] ?? false;
          const isTesting = testing[channel.type] ?? false;
          const testResult = testStatus[channel.type];
          const errors = formErrors[channel.type] ?? {};

          return (
            <Card key={channel.type}>
              <CardContent className="p-4">
                {/* ---- Card header row ---- */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-base font-semibold">{channel.label}</h3>
                      {isConfigured ? (
                        <Badge variant="default">Configured</Badge>
                      ) : (
                        <Badge variant="outline">Not configured</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {channel.description}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex shrink-0 items-center gap-2">
                    {isConfigured && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(channel.type)}
                          disabled={isTesting}
                        >
                          {isTesting ? 'Testing…' : 'Test'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleExpand(channel.type)}
                          disabled={isSaving}
                        >
                          {isExpanded ? 'Cancel' : 'Edit'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(channel.type)}
                          disabled={deleteMut.isPending}
                        >
                          Remove
                        </Button>
                      </>
                    )}
                    {!isConfigured && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => toggleExpand(channel.type)}
                      >
                        Configure
                      </Button>
                    )}
                  </div>
                </div>

                {/* ---- Masked values (collapsed) ---- */}
                {isConfigured && !isExpanded && (
                  <div className="mt-3 space-y-1">
                    {channel.fields.map((field) => (
                      <div
                        key={field.name}
                        className="text-xs text-muted-foreground"
                      >
                        <span className="font-medium">{field.label}: </span>
                        <code className="text-[11px]">
                          {maskValue(String(config.config[field.name] ?? ''))}
                        </code>
                      </div>
                    ))}
                  </div>
                )}

                {/* ---- Expanded form ---- */}
                {isExpanded && (
                  <div className="mt-4 space-y-4 border-t pt-4">
                    {/* Show current masked values when editing existing */}
                    {isConfigured && (
                      <div className="space-y-1 rounded-md bg-muted/40 px-3 py-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Current configuration:
                        </p>
                        {channel.fields.map((field) => (
                          <div
                            key={field.name}
                            className="text-xs text-muted-foreground"
                          >
                            <span className="font-medium">{field.label}: </span>
                            <code className="text-[11px]">
                              {maskValue(String(config.config[field.name] ?? ''))}
                            </code>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* General save error */}
                    {errors.general && (
                      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {errors.general}
                      </div>
                    )}

                    {/* Form fields */}
                    {channel.fields.map((field) => {
                      const currentValues = formValues[channel.type] ?? {};
                      const value =
                        currentValues[field.name] !== undefined
                          ? currentValues[field.name]
                          : isConfigured
                            ? String(config.config[field.name] ?? '')
                            : '';
                      const error = errors[field.name];

                      return (
                        <div key={field.name} className="space-y-1.5">
                          <Label htmlFor={`${channel.type}-${field.name}`}>
                            {field.label}
                          </Label>
                          <Input
                            id={`${channel.type}-${field.name}`}
                            placeholder={field.placeholder}
                            value={value}
                            onChange={(e) =>
                              handleInputChange(
                                channel.type,
                                field.name,
                                e.target.value,
                              )
                            }
                            disabled={isSaving}
                          />
                          {error && (
                            <p className="text-xs text-destructive">{error}</p>
                          )}
                        </div>
                      );
                    })}

                    {/* Save / Cancel */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSave(channel.type)}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving…' : 'Save'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => toggleExpand(channel.type)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {/* ---- Test result ---- */}
                {testResult && (
                  <div
                    className={`mt-3 rounded-md border p-3 text-sm ${
                      testResult.success
                        ? 'border-emerald-500/50 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'border-destructive/50 bg-destructive/10 text-destructive'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {testResult.success
                            ? '✓ Test successful'
                            : '✗ Test failed'}
                        </p>
                        {testResult.error && (
                          <p className="mt-0.5 break-all text-xs opacity-80">
                            {testResult.error}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => dismissTest(channel.type)}
                        className="shrink-0 text-xs underline decoration-muted-foreground/50 hover:decoration-muted-foreground"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
