import type { JsonValue } from '@prisma/client/runtime/library';

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
      metadata: JsonValue | null;
    },
    user: { id: string; name?: string | null; email: string },
    config?: JsonValue,
    projectName?: string,
  ): Promise<DeliveryResult>;
}
