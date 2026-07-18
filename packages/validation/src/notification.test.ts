import { describe, expect, it } from 'vitest';
import {
  channelTypeEnum,
  slackConfigSchema,
  teamsConfigSchema,
  telegramConfigSchema,
  channelConfigByType,
  upsertChannelConfigSchema,
  testChannelSchema,
  updateNotificationPrefWithChannelsSchema,
} from './notification';

// ---------------------------------------------------------------------------
// channelTypeEnum
// ---------------------------------------------------------------------------
describe('channelTypeEnum', () => {
  it('accepts "slack"', () => {
    const result = channelTypeEnum.safeParse('slack');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('slack');
    }
  });

  it('accepts "teams"', () => {
    const result = channelTypeEnum.safeParse('teams');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('teams');
    }
  });

  it('accepts "telegram"', () => {
    const result = channelTypeEnum.safeParse('telegram');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('telegram');
    }
  });

  it('rejects "email" (not a user-configured channel)', () => {
    const result = channelTypeEnum.safeParse('email');
    expect(result.success).toBe(false);
  });

  it('rejects invalid channel type', () => {
    const result = channelTypeEnum.safeParse('discord');
    expect(result.success).toBe(false);
  });

  it('rejects empty string', () => {
    const result = channelTypeEnum.safeParse('');
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// slackConfigSchema
// ---------------------------------------------------------------------------
describe('slackConfigSchema', () => {
  it('accepts valid Slack webhook URL', () => {
    const result = slackConfigSchema.safeParse({
      webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxxx',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.webhookUrl).toBe('https://hooks.slack.com/services/T00/B00/xxxx');
    }
  });

  it('rejects invalid URL (not a URL)', () => {
    const result = slackConfigSchema.safeParse({ webhookUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects empty webhookUrl', () => {
    const result = slackConfigSchema.safeParse({ webhookUrl: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing webhookUrl', () => {
    const result = slackConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('strips extra fields (Zod default — passthrough not strict)', () => {
    const result = slackConfigSchema.safeParse({
      webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxxx',
      extraField: 'should not be here',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // Extra field is stripped, only expected fields remain
      expect(result.data).toHaveProperty('webhookUrl');
      expect(result.data).not.toHaveProperty('extraField');
    }
  });
});

// ---------------------------------------------------------------------------
// teamsConfigSchema
// ---------------------------------------------------------------------------
describe('teamsConfigSchema', () => {
  it('accepts valid Teams webhook URL', () => {
    const result = teamsConfigSchema.safeParse({
      webhookUrl: 'https://mytenant.webhook.office.com/webhookb2/xxx/IncomingWebhook/yyy',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.webhookUrl).toBe(
        'https://mytenant.webhook.office.com/webhookb2/xxx/IncomingWebhook/yyy'
      );
    }
  });

  it('rejects invalid URL', () => {
    const result = teamsConfigSchema.safeParse({ webhookUrl: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects empty webhookUrl', () => {
    const result = teamsConfigSchema.safeParse({ webhookUrl: '' });
    expect(result.success).toBe(false);
  });

  it('rejects missing webhookUrl', () => {
    const result = teamsConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// telegramConfigSchema
// ---------------------------------------------------------------------------
describe('telegramConfigSchema', () => {
  it('accepts valid botToken and chatId', () => {
    const result = telegramConfigSchema.safeParse({
      botToken: '123456:ABC-DEF',
      chatId: '987654321',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.botToken).toBe('123456:ABC-DEF');
      expect(result.data.chatId).toBe('987654321');
    }
  });

  it('rejects missing botToken', () => {
    const result = telegramConfigSchema.safeParse({ chatId: '987654321' });
    expect(result.success).toBe(false);
  });

  it('rejects missing chatId', () => {
    const result = telegramConfigSchema.safeParse({ botToken: '123456:ABC-DEF' });
    expect(result.success).toBe(false);
  });

  it('rejects empty botToken', () => {
    const result = telegramConfigSchema.safeParse({ botToken: '', chatId: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects empty chatId', () => {
    const result = telegramConfigSchema.safeParse({ botToken: '123:abc', chatId: '' });
    expect(result.success).toBe(false);
  });

  it('rejects both empty', () => {
    const result = telegramConfigSchema.safeParse({ botToken: '', chatId: '' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// channelConfigByType
// ---------------------------------------------------------------------------
describe('channelConfigByType', () => {
  it('maps "slack" to slackConfigSchema', () => {
    const schema = channelConfigByType['slack'];
    expect(schema).toBeDefined();
    const result = schema.safeParse({ webhookUrl: 'https://hooks.slack.com/services/xxx' });
    expect(result.success).toBe(true);
  });

  it('maps "teams" to teamsConfigSchema', () => {
    const schema = channelConfigByType['teams'];
    expect(schema).toBeDefined();
    const result = schema.safeParse({
      webhookUrl: 'https://mytenant.webhook.office.com/webhookb2/xxx',
    });
    expect(result.success).toBe(true);
  });

  it('maps "telegram" to telegramConfigSchema', () => {
    const schema = channelConfigByType['telegram'];
    expect(schema).toBeDefined();
    const result = schema.safeParse({ botToken: '123:abc', chatId: '456' });
    expect(result.success).toBe(true);
  });

  it('does not have an "email" key', () => {
    expect(channelConfigByType).not.toHaveProperty('email');
  });

  it('returns the schema for each valid type', () => {
    const types = ['slack', 'teams', 'telegram'] as const;
    for (const type of types) {
      expect(channelConfigByType[type]).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// upsertChannelConfigSchema
// ---------------------------------------------------------------------------
describe('upsertChannelConfigSchema', () => {
  it('accepts valid Slack channel config', () => {
    const result = upsertChannelConfigSchema.safeParse({
      channelType: 'slack',
      config: { webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxxx' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channelType).toBe('slack');
      expect(result.data.config).toEqual({
        webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxxx',
      });
    }
  });

  it('accepts valid Teams channel config', () => {
    const result = upsertChannelConfigSchema.safeParse({
      channelType: 'teams',
      config: {
        webhookUrl: 'https://mytenant.webhook.office.com/webhookb2/xxx/IncomingWebhook/yyy',
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channelType).toBe('teams');
    }
  });

  it('accepts valid Telegram channel config', () => {
    const result = upsertChannelConfigSchema.safeParse({
      channelType: 'telegram',
      config: { botToken: '123456:ABC-DEF', chatId: '987654321' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channelType).toBe('telegram');
      expect(result.data.config).toEqual({
        botToken: '123456:ABC-DEF',
        chatId: '987654321',
      });
    }
  });

  it('accepts with optional enabled field', () => {
    const result = upsertChannelConfigSchema.safeParse({
      channelType: 'slack',
      config: { webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxxx' },
      enabled: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(false);
    }
  });

  it('defaults enabled to true when omitted', () => {
    const result = upsertChannelConfigSchema.safeParse({
      channelType: 'slack',
      config: { webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxxx' },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(true);
    }
  });

  it('rejects missing channelType', () => {
    const result = upsertChannelConfigSchema.safeParse({
      config: { webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxxx' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid channelType', () => {
    const result = upsertChannelConfigSchema.safeParse({
      channelType: 'email',
      config: { webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxxx' },
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing config', () => {
    const result = upsertChannelConfigSchema.safeParse({
      channelType: 'slack',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched config for channelType (slack config for telegram)', () => {
    const result = upsertChannelConfigSchema.safeParse({
      channelType: 'telegram',
      config: { webhookUrl: 'https://hooks.slack.com/services/T00/B00/xxxx' },
    });
    // Telegram expects botToken + chatId, not webhookUrl
    expect(result.success).toBe(false);
  });

  it('rejects Slack config for Telegram type', () => {
    const result = upsertChannelConfigSchema.safeParse({
      channelType: 'slack',
      config: { botToken: '123:abc', chatId: '456' },
    });
    // Slack expects webhookUrl, not botToken
    expect(result.success).toBe(false);
  });

  it('rejects invalid Slack URL in config', () => {
    const result = upsertChannelConfigSchema.safeParse({
      channelType: 'slack',
      config: { webhookUrl: 'not-a-url' },
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// testChannelSchema
// ---------------------------------------------------------------------------
describe('testChannelSchema', () => {
  it('accepts valid channelType "slack"', () => {
    const result = testChannelSchema.safeParse({ channelType: 'slack' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.channelType).toBe('slack');
    }
  });

  it('accepts valid channelType "teams"', () => {
    const result = testChannelSchema.safeParse({ channelType: 'teams' });
    expect(result.success).toBe(true);
  });

  it('accepts valid channelType "telegram"', () => {
    const result = testChannelSchema.safeParse({ channelType: 'telegram' });
    expect(result.success).toBe(true);
  });

  it('rejects "email" (not testable via user config)', () => {
    const result = testChannelSchema.safeParse({ channelType: 'email' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid channelType', () => {
    const result = testChannelSchema.safeParse({ channelType: 'discord' });
    expect(result.success).toBe(false);
  });

  it('rejects missing channelType', () => {
    const result = testChannelSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateNotificationPrefWithChannelsSchema
// ---------------------------------------------------------------------------
describe('updateNotificationPrefWithChannelsSchema', () => {
  it('accepts enabled with channel booleans (email=true, slack=true)', () => {
    const result = updateNotificationPrefWithChannelsSchema.safeParse({
      enabled: true,
      email: true,
      slack: true,
      teams: false,
      telegram: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(true);
      expect(result.data.email).toBe(true);
      expect(result.data.slack).toBe(true);
      expect(result.data.teams).toBe(false);
      expect(result.data.telegram).toBe(false);
    }
  });

  it('accepts only enabled (backward compatible — no channel fields)', () => {
    const result = updateNotificationPrefWithChannelsSchema.safeParse({ enabled: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(false);
      // Channel fields remain undefined — caller's responsibility to merge
    }
  });

  it('accepts only channel booleans without enabled', () => {
    const result = updateNotificationPrefWithChannelsSchema.safeParse({
      email: true,
      slack: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe(true);
      expect(result.data.slack).toBe(false);
      expect(result.data.enabled).toBeUndefined();
    }
  });

  it('accepts all channel booleans set to true', () => {
    const result = updateNotificationPrefWithChannelsSchema.safeParse({
      enabled: true,
      email: true,
      slack: true,
      teams: true,
      telegram: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-boolean channel value', () => {
    const result = updateNotificationPrefWithChannelsSchema.safeParse({
      email: 'yes',
    });
    expect(result.success).toBe(false);
  });

  it('strips extra unknown fields (Zod default)', () => {
    const result = updateNotificationPrefWithChannelsSchema.safeParse({
      enabled: true,
      extraField: 'nope',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.enabled).toBe(true);
      expect(result.data).not.toHaveProperty('extraField');
    }
  });
});
