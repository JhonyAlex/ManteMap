import type { Prisma } from '@mantemap/database';

export interface DeliveryResult {
  success: boolean;
  error?: string;
}

export interface NotificationChannel {
  readonly type: string;
  send(
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
  ): Promise<DeliveryResult>;
}
