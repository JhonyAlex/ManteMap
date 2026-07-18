import { z } from 'zod';

// ---------------------------------------------------------------------------
// channelTypeEnum — user-configurable channel types (email uses SMTP env vars)
// ---------------------------------------------------------------------------

export const channelTypeEnum = z.enum(['slack', 'teams', 'telegram']);

export type ChannelType = z.infer<typeof channelTypeEnum>;

// ---------------------------------------------------------------------------
// Per-channel config schemas
// ---------------------------------------------------------------------------

export const slackConfigSchema = z.object({
  webhookUrl: z.string().url(),
});

export const teamsConfigSchema = z.object({
  webhookUrl: z.string().url(),
});

export const telegramConfigSchema = z.object({
  botToken: z.string().min(1, 'botToken is required'),
  chatId: z.string().min(1, 'chatId is required'),
});

// ---------------------------------------------------------------------------
// channelConfigByType — lookup map for discriminated union
// ---------------------------------------------------------------------------

export const channelConfigByType = {
  slack: slackConfigSchema,
  teams: teamsConfigSchema,
  telegram: telegramConfigSchema,
} as const;

// ---------------------------------------------------------------------------
// upsertChannelConfigSchema — validates channelType + matching config
// ---------------------------------------------------------------------------

export const upsertChannelConfigSchema = z
  .object({
    channelType: channelTypeEnum,
    config: z.record(z.unknown()),
    enabled: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    const schema = channelConfigByType[data.channelType];
    const parsed = schema.safeParse(data.config);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          ...issue,
          path: ['config', ...issue.path],
        });
      }
    }
  });

export type UpsertChannelConfigInput = z.infer<typeof upsertChannelConfigSchema>;

// ---------------------------------------------------------------------------
// testChannelSchema — validate a test request body
// ---------------------------------------------------------------------------

export const testChannelSchema = z.object({
  channelType: channelTypeEnum,
});

export type TestChannelInput = z.infer<typeof testChannelSchema>;

// ---------------------------------------------------------------------------
// updateNotificationPrefWithChannelsSchema — extends existing schema with
// optional channel boolean fields
// ---------------------------------------------------------------------------

export const updateNotificationPrefWithChannelsSchema = z.object({
  enabled: z.boolean().optional(),
  email: z.boolean().optional(),
  slack: z.boolean().optional(),
  teams: z.boolean().optional(),
  telegram: z.boolean().optional(),
});

export type UpdateNotificationPrefWithChannelsInput = z.infer<
  typeof updateNotificationPrefWithChannelsSchema
>;
