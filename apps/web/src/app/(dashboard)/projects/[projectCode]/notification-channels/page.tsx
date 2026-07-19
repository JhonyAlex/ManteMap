'use client';

/**
 * Notification Channels management page.
 *
 * List, configure, test, and delete external notification channel configs
 * (Slack, Microsoft Teams, Telegram) scoped to the authenticated user.
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
import {
  Button,
  Input,
  Label,
  Badge,
  Card,
  CardContent,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@mantemap/ui';
import { toast } from 'sonner';
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

function maskValue(value: string): string {
  if (!value) return '—';
  if (value.length <= 8) return value.slice(0, 2) + '••••' + value.slice(-2);
  return value.slice(0, 4) + '••••••' + value.slice(-4);
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

interface PageProps {
  params: Promise<{ projectCode: string }>;
}

export default function NotificationChannelsPage({ params }: PageProps) {
  const unwrappedParams = React.use(params);
  const projectId = unwrappedParams.projectCode;

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

  const [expanded, setExpanded] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<
    Record<string, Record<string, string>>
  >({});

  const [formErrors, setFormErrors] = useState<
    Record<string, Record<string, string>>
  >({});

  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const [testStatus, setTestStatus] = useState<
    Record<string, { success: boolean; error?: string } | null>
  >({});

  const [testing, setTesting] = useState<Record<string, boolean>>({});

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [channelToDelete, setChannelToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ---- Derived data --------------------------------------------------------

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

  const toggleExpand = useCallback(
    (channelType: string) => {
      setExpanded((prev) => {
        if (prev === channelType) {
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
        toast.success('Configuration saved.');
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Failed to save configuration';
        setFormErrors((prev) => ({
          ...prev,
          [channelType]: { general: msg },
        }));
        toast.error(msg);
      } finally {
        setSaving((prev) => ({ ...prev, [channelType]: false }));
      }
    },
    [formValues, upsertMut],
  );

  const handleDelete = useCallback(
    async (channelType: string) => {
      const label = CHANNELS.find((c) => c.type === channelType)?.label ?? channelType;
      setChannelToDelete(channelType);
      setDeleteOpen(true);
    },
    [],
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!channelToDelete) return;
    setIsDeleting(true);
    try {
      await deleteMut.mutateAsync(channelToDelete);
      setDeleteOpen(false);
      setChannelToDelete(null);
      toast.success('Channel removed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove channel.';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  }, [channelToDelete, deleteMut]);

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
        if (result.success) {
          toast.success('Test successful.');
        } else {
          toast.error('Test failed.');
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : 'Test failed';
        setTestStatus((prev) => ({
          ...prev,
          [channelType]: { success: false, error: msg },
        }));
        toast.error(msg);
      } finally {
        setTesting((prev) => ({ ...prev, [channelType]: false }));
      }
    },
    [testMut],
  );

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
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-64" />
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

  const channelLabel = channelToDelete
    ? CHANNELS.find((c) => c.type === channelToDelete)?.label ?? channelToDelete
    : '';

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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove {channelLabel} Channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove the <strong>{channelLabel}</strong> channel configuration? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

                    {errors.general && (
                      <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                        {errors.general}
                      </div>
                    )}

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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => dismissTest(channel.type)}
                      >
                        Dismiss
                      </Button>
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
