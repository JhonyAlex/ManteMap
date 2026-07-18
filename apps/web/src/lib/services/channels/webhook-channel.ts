import { createHmac } from 'crypto';
import type { JsonValue } from '@prisma/client/runtime/library';
import type { DeliveryResult, NotificationChannel } from './types';

/**
 * Webhook config shape passed by the dispatcher (from UserChannelConfig.config).
 * Contains the endpoint configuration needed to POST.
 */
export interface WebhookConfig {
  url: string;
  secret?: string | null;
  eventTypes?: string[];
}

/**
 * Webhook channel — implements NotificationChannel.
 *
 * POSTs signed JSON payloads to external HTTP endpoints when alerts fire.
 * HMAC-SHA256 signing per WH-002. 10s timeout protects the dispatcher.
 */
export class WebhookChannel implements NotificationChannel {
  readonly type = 'webhook';

  /**
   * Send a webhook notification for the given alert.
   *
   * The config parameter is a WebhookConfig extracted from the endpoint's
   * configuration (url, secret, eventTypes). The dispatcher queries the
   * WebhookEndpoint table and passes the relevant values.
   */
  async send(
    alert: {
      id: string;
      alertType: string;
      severity: string;
      title: string;
      message: string | null;
      metadata: JsonValue | null;
    },
    _user: { id: string; name?: string | null; email: string },
    config?: JsonValue,
    projectName?: string,
  ): Promise<DeliveryResult> {
    const cfg = config as WebhookConfig | undefined;
    const url = cfg?.url;

    if (!url) {
      return { success: false, error: 'Webhook URL not configured' };
    }

    // Build payload per design.md format
    const body = JSON.stringify({
      event: alert.alertType,
      timestamp: new Date().toISOString(),
      alert: {
        id: alert.id,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        metadata: alert.metadata,
      },
      project: projectName || null,
      appUrl: process.env.APP_URL || 'http://localhost:3000',
    });

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Sign if secret is configured (WH-002)
    if (cfg.secret) {
      headers['X-ManteMap-Signature'] = this.signPayload(body, cfg.secret);
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        return { success: false, error: `Webhook returned ${response.status}: ${errorText}` };
      }

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  /**
   * Sign a payload with HMAC-SHA256 (WH-002).
   *
   * Returns `sha256={hexDigest}` so receivers can verify:
   *   crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
   *
   * @param body — the raw string body to sign (typically JSON.stringify output)
   * @param secret — the endpoint's secret key
   * @returns signature header value, e.g. `sha256=a1b2c3...`
   */
  signPayload(body: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(body);
    const digest = hmac.digest('hex');
    return `sha256=${digest}`;
  }
}
