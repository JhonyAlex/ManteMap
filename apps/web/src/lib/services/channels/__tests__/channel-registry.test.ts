import { describe, expect, it } from 'vitest';

// RED — production code does not exist yet
import { ChannelRegistry } from '../channel-registry';
import type { DeliveryResult, NotificationChannel } from '../types';

// ---------------------------------------------------------------------------
// Mock channel for testing
// ---------------------------------------------------------------------------

const createMockChannel = (type: string): NotificationChannel => ({
  type,
  send: async () => ({ success: true }),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChannelRegistry', () => {
  describe('register', () => {
    it('should register a channel and make it retrievable', () => {
      const registry = new ChannelRegistry();
      const emailChannel = createMockChannel('email');

      registry.register(emailChannel);

      const retrieved = registry.get('email');
      expect(retrieved).toBeDefined();
      expect(retrieved!.type).toBe('email');
    });

    it('should override existing channel with same type', () => {
      const registry = new ChannelRegistry();
      const oldChannel = createMockChannel('slack');
      const newChannel: NotificationChannel = {
        type: 'slack',
        send: async () => ({ success: false, error: 'overridden' }),
      };

      registry.register(oldChannel);
      registry.register(newChannel);

      expect(registry.get('slack')).toBe(newChannel);
    });
  });

  describe('get', () => {
    it('should return undefined for unregistered channel type', () => {
      const registry = new ChannelRegistry();

      const result = registry.get('nonexistent');

      expect(result).toBeUndefined();
    });

    it('should return the registered channel for a known type', () => {
      const registry = new ChannelRegistry();
      const telegramChannel = createMockChannel('telegram');

      registry.register(telegramChannel);

      const result = registry.get('telegram');
      expect(result).toBe(telegramChannel);
    });
  });

  describe('list', () => {
    it('should return empty array when no channels registered', () => {
      const registry = new ChannelRegistry();

      expect(registry.list()).toEqual([]);
    });

    it('should return all registered channel types', () => {
      const registry = new ChannelRegistry();
      registry.register(createMockChannel('email'));
      registry.register(createMockChannel('slack'));
      registry.register(createMockChannel('teams'));

      const list = registry.list();

      expect(list).toHaveLength(3);
      expect(list).toContain('email');
      expect(list).toContain('slack');
      expect(list).toContain('teams');
    });
  });

  describe('send delegation', () => {
    it('should delegate send to the correct channel', async () => {
      const registry = new ChannelRegistry();
      let slackCalled = false;
      const slackChannel: NotificationChannel = {
        type: 'slack',
        send: async () => {
          slackCalled = true;
          return { success: true };
        },
      };
      registry.register(slackChannel);

      const channel = registry.get('slack')!;
      const result = await channel.send(
        {
          id: 'alert-1',
          alertType: 'DOCUMENT_EXPIRING',
          severity: 'WARNING',
          title: 'Test',
          message: 'Test message',
          metadata: null,
        },
        { id: 'user-1', email: 'test@example.com' },
        { webhookUrl: 'https://hooks.slack.com/test' },
        'Test Project',
      );

      expect(slackCalled).toBe(true);
      expect(result.success).toBe(true);
    });
  });
});
