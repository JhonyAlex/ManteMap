import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// RED — production code does not exist yet
import { SlackChannel } from '../slack-channel';
import { TeamsChannel } from '../teams-channel';
import { TelegramChannel } from '../telegram-channel';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const alert = {
  id: 'alert-1',
  alertType: 'DOCUMENT_EXPIRING',
  severity: 'WARNING',
  title: 'Test alert',
  message: 'Test message',
  metadata: { documentName: 'Test.pdf', daysUntilExpiry: 7 },
};

const user = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
};

// ---------------------------------------------------------------------------
// SlackChannel
// ---------------------------------------------------------------------------

describe('SlackChannel', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('type', () => {
    it('should have type "slack"', () => {
      const channel = new SlackChannel();
      expect(channel.type).toBe('slack');
    });
  });

  describe('send', () => {
    it('should POST to webhook URL with Block Kit payload', async () => {
      const mockResponse = { ok: true, status: 200, text: vi.fn().mockResolvedValue('ok') };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const config = { webhookUrl: 'https://hooks.slack.com/services/TEST/BOT' };
      const channel = new SlackChannel();
      const result = await channel.send(alert, user, config, 'Test Project');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/TEST/BOT',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        }),
      );

      // Verify the body is valid JSON with Block Kit blocks
      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.blocks).toBeInstanceOf(Array);
      expect(body.blocks.length).toBeGreaterThan(0);
    });

    it('should return failure when no config provided', async () => {
      const channel = new SlackChannel();
      const result = await channel.send(alert, user, undefined);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return failure when webhook URL is missing', async () => {
      const channel = new SlackChannel();
      const result = await channel.send(alert, user, {});

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle fetch failure gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const config = { webhookUrl: 'https://hooks.slack.com/services/BAD' };
      const channel = new SlackChannel();
      const result = await channel.send(alert, user, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle non-ok response', async () => {
      const mockResponse = { ok: false, status: 404, text: vi.fn().mockResolvedValue('Not found') };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const config = { webhookUrl: 'https://hooks.slack.com/services/BAD' };
      const channel = new SlackChannel();
      const result = await channel.send(alert, user, config);

      expect(result.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// TeamsChannel
// ---------------------------------------------------------------------------

describe('TeamsChannel', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('type', () => {
    it('should have type "teams"', () => {
      const channel = new TeamsChannel();
      expect(channel.type).toBe('teams');
    });
  });

  describe('send', () => {
    it('should POST MessageCard to webhook URL', async () => {
      const mockResponse = { ok: true, status: 200, text: vi.fn().mockResolvedValue('1') };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const config = { webhookUrl: 'https://tenant.webhook.office.com/webhookb2/...' };
      const channel = new TeamsChannel();
      const result = await channel.send(alert, user, config, 'Test Project');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://tenant.webhook.office.com/webhookb2/...',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.any(String),
        }),
      );

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body['@type']).toBe('MessageCard');
      expect(body.themeColor).toBeDefined();
    });

    it('should return failure with no config', async () => {
      const channel = new TeamsChannel();
      const result = await channel.send(alert, user, undefined);

      expect(result.success).toBe(false);
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('timeout'));

      const config = { webhookUrl: 'https://tenant.webhook.office.com/webhookb2/bad' };
      const channel = new TeamsChannel();
      const result = await channel.send(alert, user, config);

      expect(result.success).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// TelegramChannel
// ---------------------------------------------------------------------------

describe('TelegramChannel', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('type', () => {
    it('should have type "telegram"', () => {
      const channel = new TelegramChannel();
      expect(channel.type).toBe('telegram');
    });
  });

  describe('send', () => {
    it('should POST to Telegram Bot API with correct body', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ ok: true, result: {} }),
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const config = { botToken: '123456:ABC-DEF', chatId: '789012' };
      const channel = new TelegramChannel();
      const result = await channel.send(alert, user, config, 'Test Project');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bot123456:ABC-DEF/sendMessage',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body);
      expect(body.chat_id).toBe('789012');
      expect(body.parse_mode).toBe('Markdown');
      expect(body.text).toBeTypeOf('string');
      expect(body.text).toContain('Test Project');
    });

    it('should return failure when botToken is missing', async () => {
      const channel = new TelegramChannel();
      const result = await channel.send(alert, user, { chatId: '123' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('botToken');
    });

    it('should return failure when chatId is missing', async () => {
      const channel = new TelegramChannel();
      const result = await channel.send(alert, user, { botToken: '123:ABC' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('chatId');
    });

    it('should return failure with no config', async () => {
      const channel = new TelegramChannel();
      const result = await channel.send(alert, user, undefined);

      expect(result.success).toBe(false);
    });

    it('should handle Telegram API error response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({ ok: false, description: 'Forbidden: bot was blocked' }),
      };
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(mockResponse);

      const config = { botToken: '123:ABC', chatId: '456' };
      const channel = new TelegramChannel();
      const result = await channel.send(alert, user, config);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Forbidden');
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('ENOTFOUND'));

      const config = { botToken: 'bad:token', chatId: '123' };
      const channel = new TelegramChannel();
      const result = await channel.send(alert, user, config);

      expect(result.success).toBe(false);
    });
  });
});
