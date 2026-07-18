import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { Prisma } from '@mantemap/database';
import type { DeliveryResult, NotificationChannel } from './types';
import { formatAlertMessage } from '../notification-template-service';

export class EmailChannel implements NotificationChannel {
  readonly type = 'email';

  private transporter: Transporter | null = null;

  private getTransporter(): Transporter | null {
    const host = process.env.SMTP_HOST;
    if (!host) return null;

    if (this.transporter) return this.transporter;

    this.transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
    });

    return this.transporter;
  }

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
    _config?: Prisma.JsonValue,
    projectName?: string,
  ): Promise<DeliveryResult> {
    const transporter = this.getTransporter();

    if (!transporter) {
      return { success: false, error: 'SMTP not configured (SMTP_HOST missing)' };
    }

    const effectiveProject = projectName || 'Unknown Project';
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const messages = formatAlertMessage(alert.alertType, alert, effectiveProject, appUrl);
    const from = process.env.SMTP_FROM || 'noreply@mantemap.local';

    try {
      await transporter.sendMail({
        from,
        to: user.email,
        subject: messages.email.subject,
        html: messages.email.html,
      });

      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
}
