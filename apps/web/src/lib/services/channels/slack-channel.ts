import type { Prisma } from '@prisma/client';
import type { DeliveryResult, NotificationChannel } from './types';
import { formatAlertMessage } from '../notification-template-service';

export class SlackChannel implements NotificationChannel {
  readonly type = 'slack';

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
    const webhookUrl = cfg?.webhookUrl as string | undefined;

    if (!webhookUrl) {
      return { success: false, error: 'Slack webhook URL not configured' };
    }

    const effectiveProject = projectName || 'Unknown Project';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const messages = formatAlertMessage(alert.alertType, alert, effectiveProject, appUrl);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: messages.slack.blocks }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { success: false, error: `Slack webhook returned ${response.status}: ${errorText}` };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}
