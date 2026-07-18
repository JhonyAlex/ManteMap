import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// RED — WebhookChannel does not exist yet
// ---------------------------------------------------------------------------
import { WebhookChannel } from './webhook-channel';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createAlert(overrides: Record<string, unknown> = {}) {
  return {
    id: 'clalertxxxxxxxxxxxxxxxxx',
    alertType: 'STATUS_INCIDENT',
    severity: 'CRITICAL',
    title: 'Pump failure',
    message: 'Pump A has stopped working',
    metadata: { itemId: 'clitemxxxxxxxxxxxxxxxx' },
    ...overrides,
  };
}

function createUser() {
  return {
    id: 'cluserxxxxxxxxxxxxxxxxx',
    name: 'Test User',
    email: 'test@example.com',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebhookChannel', () => {
  describe('signPayload', () => {
    it('should produce a valid HMAC-SHA256 hex digest', () => {
      const channel = new WebhookChannel();
      const payload = JSON.stringify({ event: 'STATUS_INCIDENT' });
      const secret = 'sk_test_abc123';
      const signature = channel.signPayload(payload, secret);

      // sha256= prefix (7 chars) + 64 hex chars = 71 total
      expect(signature).toHaveLength(71);
      // Must start with sha256= prefix per WH-002
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should produce deterministic output for same input', () => {
      const channel = new WebhookChannel();
      const payload = JSON.stringify({ event: 'STATUS_INCIDENT', item: 'Pump A' });
      const secret = 'sk_test_abc123';

      const sig1 = channel.signPayload(payload, secret);
      const sig2 = channel.signPayload(payload, secret);

      expect(sig1).toBe(sig2);
    });

    it('should produce different output for different payloads', () => {
      const channel = new WebhookChannel();
      const secret = 'sk_test_abc123';

      const sig1 = channel.signPayload(JSON.stringify({ event: 'A' }), secret);
      const sig2 = channel.signPayload(JSON.stringify({ event: 'B' }), secret);

      expect(sig1).not.toBe(sig2);
    });

    it('should produce different output for different secrets', () => {
      const channel = new WebhookChannel();
      const payload = JSON.stringify({ event: 'STATUS_INCIDENT' });

      const sig1 = channel.signPayload(payload, 'secret_one');
      const sig2 = channel.signPayload(payload, 'secret_two');

      expect(sig1).not.toBe(sig2);
    });

    it('should match a known HMAC-SHA256 value for verification', () => {
      const channel = new WebhookChannel();
      const payload = 'test-body';
      const secret = 'my-secret-key';

      // Pre-computed with Node.js: crypto.createHmac('sha256', 'my-secret-key').update('test-body').digest('hex')
      const expected = 'sha256=46f7366cba18811c679cc8f6bbb97c35881ea5d5848ad8526761638db73e6382';
      const result = channel.signPayload(payload, secret);

      expect(result).toBe(expected);
    });
  });

  describe('send', () => {
    beforeEach(() => {
      vi.restoreAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should POST to the configured URL with correct JSON payload', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(null, { status: 200 }),
      );
      vi.stubGlobal('fetch', mockFetch);

      const channel = new WebhookChannel();
      const alert = createAlert();
      const user = createUser();
      const config = { webhookEndpointId: 'clweb1xxxxxxxxxxxxxxxxx' };

      // Mock endpoint: the channel would query this from repository
      // But since we're unit-testing the channel, we pass the config directly
      const result = await channel.send(alert, user, {
        url: 'https://hooks.example.com/webhook',
        secret: null,
        eventTypes: ['STATUS_INCIDENT'],
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(fetchCall[0]).toBe('https://hooks.example.com/webhook');
      expect(fetchCall[1].method).toBe('POST');
      expect(fetchCall[1].headers).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should include HMAC signature header when secret is configured', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(null, { status: 200 }),
      );
      vi.stubGlobal('fetch', mockFetch);

      const channel = new WebhookChannel();
      const alert = createAlert();
      const user = createUser();

      await channel.send(alert, user, {
        url: 'https://hooks.example.com/webhook',
        secret: 'sk_test_abc123',
        eventTypes: ['STATUS_INCIDENT'],
      });

      const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = fetchCall[1].headers as Record<string, string>;
      expect(headers['X-ManteMap-Signature']).toBeDefined();
      expect(headers['X-ManteMap-Signature']).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should NOT include signature header when no secret is configured', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(null, { status: 200 }),
      );
      vi.stubGlobal('fetch', mockFetch);

      const channel = new WebhookChannel();
      const alert = createAlert();
      const user = createUser();

      await channel.send(alert, user, {
        url: 'https://hooks.example.com/webhook',
        secret: null,
        eventTypes: ['STATUS_INCIDENT'],
      });

      const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = fetchCall[1].headers as Record<string, string>;
      expect(headers['X-ManteMap-Signature']).toBeUndefined();
    });

    it('should return success:false when URL returns non-2xx', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response('Internal Server Error', { status: 500 }),
      );
      vi.stubGlobal('fetch', mockFetch);

      const channel = new WebhookChannel();
      const alert = createAlert();
      const user = createUser();

      const result = await channel.send(alert, user, {
        url: 'https://hooks.example.com/fail',
        secret: null,
        eventTypes: ['STATUS_INCIDENT'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('500');
    });

    it('should return success:false when fetch throws (timeout/network error)', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('The operation was aborted'));
      vi.stubGlobal('fetch', mockFetch);

      const channel = new WebhookChannel();
      const alert = createAlert();
      const user = createUser();

      const result = await channel.send(alert, user, {
        url: 'https://unreachable.example.com',
        secret: null,
        eventTypes: ['STATUS_INCIDENT'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('The operation was aborted');
    });

    it('should return success:false when URL is not configured', async () => {
      const channel = new WebhookChannel();
      const alert = createAlert();
      const user = createUser();

      const result = await channel.send(alert, user, {
        url: '',
        secret: null,
        eventTypes: ['STATUS_INCIDENT'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should build payload with alert data and timestamp', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(null, { status: 200 }),
      );
      vi.stubGlobal('fetch', mockFetch);

      const channel = new WebhookChannel();
      const alert = createAlert();
      const user = createUser();

      await channel.send(alert, user, {
        url: 'https://hooks.example.com/webhook',
        secret: null,
        eventTypes: ['STATUS_INCIDENT'],
      });

      const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(fetchCall[1].body as string);

      expect(body.event).toBe('STATUS_INCIDENT');
      expect(body.alert.severity).toBe('CRITICAL');
      expect(body.alert.title).toBe('Pump failure');
      expect(body.alert.message).toBe('Pump A has stopped working');
      expect(body.timestamp).toBeDefined();
      // Should be ISO 8601 UTC format
      expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should include project name in payload when provided', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(null, { status: 200 }),
      );
      vi.stubGlobal('fetch', mockFetch);

      const channel = new WebhookChannel();
      const alert = createAlert();
      const user = createUser();

      await channel.send(alert, user, {
        url: 'https://hooks.example.com/webhook',
        secret: null,
        eventTypes: ['STATUS_INCIDENT'],
      }, 'Plant Alpha');

      const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(fetchCall[1].body as string);

      expect(body.project).toBe('Plant Alpha');
    });
  });
});
