/**
 * ChannelConfigForm — per-channel configuration form (Slack, Teams, Telegram).
 *
 * Renders input fields based on channel type, with save/test/delete buttons.
 * Uses React Hook Form + Zod validation, and TanStack Query hooks for API calls.
 *
 * Spec: openspec/changes/phase-10-external-notifications/specs/channel-configuration/spec.md
 *   "Channel Config UI" — webhook/token input fields, save, test button
 *   "User configures Slack via UI" — save persists via PUT API
 *   "Test button sends and shows result"
 * Design: openspec/changes/phase-10-external-notifications/design.md
 *   "ChannelConfigForm (Client Component)"
 */

'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useChannelConfigs,
  useUpsertChannelConfig,
  useDeleteChannelConfig,
  useTestChannel,
} from '@/hooks/use-notification-channels';
import { Button, Input, Label, Card, CardHeader, CardTitle, CardContent, CardFooter } from '@mantemap/ui';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ChannelConfigFormProps {
  projectId: string;
  channelType: 'slack' | 'teams' | 'telegram';
}

// ---------------------------------------------------------------------------
// Per-channel schemas
// ---------------------------------------------------------------------------

const slackSchema = z.object({
  webhookUrl: z.string().min(1, 'Webhook URL is required').url('Must be a valid URL'),
});

const teamsSchema = z.object({
  webhookUrl: z.string().min(1, 'Webhook URL is required').url('Must be a valid URL'),
});

const telegramSchema = z.object({
  botToken: z.string().min(1, 'Bot token is required'),
  chatId: z.string().min(1, 'Chat ID is required'),
});

function getSchema(channelType: string) {
  switch (channelType) {
    case 'slack':
      return slackSchema;
    case 'teams':
      return teamsSchema;
    case 'telegram':
      return telegramSchema;
    default:
      return z.object({});
  }
}

// ---------------------------------------------------------------------------
// Label + description by channel type
// ---------------------------------------------------------------------------

const CHANNEL_LABELS: Record<string, { title: string; description: string }> = {
  slack: {
    title: 'Slack Configuration',
    description:
      'Create an Incoming Webhook in your Slack workspace and paste the URL here.',
  },
  teams: {
    title: 'Teams Configuration',
    description:
      'Set up an Incoming Webhook connector in your Teams channel and paste the URL here.',
  },
  telegram: {
    title: 'Telegram Configuration',
    description:
      'Create a bot with @BotFather and paste the token. Get your chat ID from @userinfobot.',
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChannelConfigForm({ projectId, channelType }: ChannelConfigFormProps) {
  const { data: configs, isLoading } = useChannelConfigs(projectId);
  const upsert = useUpsertChannelConfig(projectId);
  const deleteConfig = useDeleteChannelConfig(projectId);
  const testChannel = useTestChannel(projectId);

  const existingConfig = configs?.find((c) => c.channelType === channelType);
  const schema = getSchema(channelType);
  const labels = CHANNEL_LABELS[channelType] ?? {
    title: channelType,
    description: '',
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: (existingConfig?.config ?? {}) as Record<string, string>,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Loading configuration...</p>
        </CardContent>
      </Card>
    );
  }

  function onSubmit(values: Record<string, string>) {
    upsert.mutate({
      channelType,
      config: values as Record<string, unknown>,
      enabled: true,
    });
  }

  function handleTest() {
    testChannel.mutate(channelType);
  }

  function handleDelete() {
    deleteConfig.mutate(channelType);
  }

  const isBusy = upsert.isPending || deleteConfig.isPending || testChannel.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{labels.title}</CardTitle>
        <p className="text-xs text-muted-foreground">{labels.description}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {channelType === 'slack' || channelType === 'teams' ? (
            <div className="space-y-2">
              <Label htmlFor="webhookUrl">
                {channelType === 'slack' ? 'Slack Webhook URL' : 'Teams Webhook URL'}
              </Label>
              <Input
                id="webhookUrl"
                type="url"
                placeholder={
                  channelType === 'slack'
                    ? 'https://hooks.slack.com/services/...'
                    : 'https://tenant.webhook.office.com/...'
                }
                {...register('webhookUrl')}
                disabled={isBusy}
              />
              {errors.webhookUrl && (
                <p className="text-xs text-destructive">{errors.webhookUrl.message}</p>
              )}
            </div>
          ) : null}

          {channelType === 'telegram' ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="botToken">Bot Token</Label>
                <Input
                  id="botToken"
                  type="text"
                  placeholder="123456:ABC-DEF..."
                  {...register('botToken')}
                  disabled={isBusy}
                />
                {errors.botToken && (
                  <p className="text-xs text-destructive">{errors.botToken.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="chatId">Chat ID</Label>
                <Input
                  id="chatId"
                  type="text"
                  placeholder="987654321"
                  {...register('chatId')}
                  disabled={isBusy}
                />
                {errors.chatId && (
                  <p className="text-xs text-destructive">{errors.chatId.message}</p>
                )}
              </div>
            </>
          ) : null}
        </form>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={isBusy}
          onClick={handleSubmit(onSubmit)}
        >
          {upsert.isPending ? 'Saving...' : 'Save'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isBusy || !existingConfig}
          onClick={handleTest}
        >
          {testChannel.isPending ? 'Testing...' : 'Test Connection'}
        </Button>
        {existingConfig && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isBusy}
            onClick={handleDelete}
          >
            {deleteConfig.isPending ? 'Deleting...' : 'Delete'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
