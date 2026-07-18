import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock nodemailer — use vi.hoisted for the shared mock
// ---------------------------------------------------------------------------

const { mockSendMail } = vi.hoisted(() => ({
  mockSendMail: vi.fn(),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: () => ({
      sendMail: mockSendMail,
    }),
  },
  createTransport: () => ({
    sendMail: mockSendMail,
  }),
}));

import nodemailer from 'nodemailer';

// RED → GREEN: production code loaded after mock
import { EmailChannel } from '../email-channel';

// ---------------------------------------------------------------------------
// Helpers
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
// Tests
// ---------------------------------------------------------------------------

describe('EmailChannel', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user@test.com';
    process.env.SMTP_PASSWORD = 'pass123';
    process.env.SMTP_FROM = 'noreply@test.com';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('type', () => {
    it('should have type "email"', () => {
      const channel = new EmailChannel();
      expect(channel.type).toBe('email');
    });
  });

  describe('send', () => {
    it('should return failure when SMTP is not configured', async () => {
      delete process.env.SMTP_HOST;

      const channel = new EmailChannel();
      const result = await channel.send(alert, user);

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP');
    });

    it('should send email and return success', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-123', accepted: ['test@example.com'] });

      const channel = new EmailChannel();
      const result = await channel.send(alert, user, undefined, 'Test Project');

      expect(result.success).toBe(true);
    });

    it('should include HTML content in sent email', async () => {
      mockSendMail.mockResolvedValue({ messageId: 'msg-456', accepted: ['test@example.com'] });

      const channel = new EmailChannel();
      await channel.send(alert, user, undefined, 'Test Project');

      expect(mockSendMail).toHaveBeenCalledTimes(1);
      const callArgs = mockSendMail.mock.calls[0][0];
      expect(callArgs.to).toBe(user.email);
      expect(callArgs.from).toBe(process.env.SMTP_FROM);
      expect(callArgs.subject).toContain('[ManteMap]');
      expect(callArgs.html).toBeTypeOf('string');
      expect(callArgs.html).toContain('Test Project');
    });

    it('should handle sendMail failure gracefully', async () => {
      mockSendMail.mockRejectedValue(new Error('Connection refused'));

      const channel = new EmailChannel();
      const result = await channel.send(alert, user);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection refused');
    });

    it('should never throw on send', async () => {
      mockSendMail.mockRejectedValue(new Error('Boom'));

      const channel = new EmailChannel();

      // This should never throw
      const result = await channel.send(alert, user);
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
    });
  });
});
