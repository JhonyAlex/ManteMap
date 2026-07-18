import type { Prisma } from '@prisma/client';
import type { DeliveryResult, NotificationChannel } from './types';
import { formatAlertMessage } from '../notification-template-service';

export class TelegramChannel implements NotificationChannel {
  readonly type = 'telegram';

  async send(
    alert: {
      id: string;
      alertType: string;
      severity: string;
      title: string;
      message: string | null;
      metadata: Prisma.JsonValue | null;
    },
    user: { id: string; name?: string | null; email: string },
    config?: Prisma.JsonValue,
    projectName?: string,
  ): Promise<DeliveryResult> {
    const cfg = config as Record<string, unknown> | undefined;
    const botToken = cfg?.botToken as string | undefined;
    const chatId = cfg?.chatId as string | undefined;

    if (!botToken) {
      return { success: false, error: 'Telegram botToken not configured' };
    }

    if (!chatId) {
      return { success: false, error: 'Telegram chatId not configured' };
    }

    const effectiveProject = projectName || 'Unknown Project';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const messages = formatAlertMessage(alert.alertType, alert, effectiveProject, appUrl);

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messages.telegram.text,
          parse_mode: 'Markdown',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { success: false, error: `Telegram API returned ${response.status}: ${errorText}` };
      }

      const data = (await response.json()) as { ok: boolean; description?: string };
      if (!data.ok) {
        return { success: false, error: data.description || 'Telegram API error' };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}
