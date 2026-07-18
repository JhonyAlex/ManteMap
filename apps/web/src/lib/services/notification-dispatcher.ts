import type { JsonValue } from '@prisma/client/runtime/library';
import type { ChannelRegistry } from './channels/channel-registry';
import type { UserChannelConfig, PrismaClient } from '@mantemap/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AlertForDispatch {
  id: string;
  alertType: string;
  severity: string;
  title: string;
  message: string | null;
  metadata: JsonValue | null;
  projectId: string;
}

export interface MemberPreference {
  alertType: string;
  enabled: boolean;
  email: boolean;
  slack: boolean;
  teams: boolean;
  telegram: boolean;
}

export interface MemberWithPreferences {
  userId: string;
  email: string;
  name: string | null;
  preferences: MemberPreference[];
}

export interface DispatcherDependencies {
  channelRegistry: {
    get(type: string): { type: string; send(...args: any[]): Promise<{ success: boolean; error?: string }> } | undefined;
  };
  getUserChannelConfig: (userId: string, channelType: string) => Promise<UserChannelConfig | null>;
  existsDelivery: (alertId: string, userId: string, channelType: string) => Promise<boolean>;
  createDelivery: (data: {
    alertId: string;
    userId: string;
    channelType: string;
    status: string;
    errorMessage?: string;
  }) => Promise<unknown>;
  getMembersWithPreferences: (projectId: string, alertType: string) => Promise<MemberWithPreferences[]>;
  getProjectById: (projectId: string) => Promise<{ id: string; name: string } | null>;
  getRecentAlerts?: (projectId: string, sinceMinutes: number) => Promise<AlertForDispatch[]>;
}

const ALL_CHANNEL_TYPES = ['email', 'slack', 'teams', 'telegram'] as const;

// ---------------------------------------------------------------------------
// NotificationDispatcher
// ---------------------------------------------------------------------------

export class NotificationDispatcher {
  constructor(private deps: DispatcherDependencies) {}

  /**
   * Dispatch a single alert to all project members with matching channel preferences.
   * Fire-and-forget — never throws, logs errors to delivery table.
   */
  async dispatch(alert: AlertForDispatch, projectId: string): Promise<void> {
    const project = await this.deps.getProjectById(projectId);
    const projectName = project?.name || 'Unknown Project';

    const members = await this.deps.getMembersWithPreferences(projectId, alert.alertType);

    const dispatchPromises: Promise<void>[] = [];

    for (const member of members) {
      const pref = member.preferences[0]; // getMembersWithPreferences returns matching prefs
      if (!pref || !pref.enabled) continue;

      for (const channelType of ALL_CHANNEL_TYPES) {
        if (!pref[channelType]) continue;

        dispatchPromises.push(
          this.sendToChannel(alert, member, channelType, projectName),
        );
      }
    }

    // Fire all in parallel, never throw
    await Promise.allSettled(dispatchPromises);
  }

  /**
   * Dispatch for all recent active alerts in a project (used by scan endpoint).
   */
  async dispatchForProject(projectId: string): Promise<void> {
    const alerts = await this.getRecentAlerts(projectId);

    const dispatchPromises = alerts.map((alert) =>
      this.dispatch(alert, projectId).catch(() => {
        // Individual dispatch already handles errors, but catch just in case
      }),
    );

    await Promise.allSettled(dispatchPromises);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async getRecentAlerts(projectId: string): Promise<AlertForDispatch[]> {
    if (this.deps.getRecentAlerts) {
      return this.deps.getRecentAlerts(projectId, 5);
    }

    // Fallback: return empty — caller may provide custom implementation
    return [];
  }

  private async sendToChannel(
    alert: AlertForDispatch,
    member: MemberWithPreferences,
    channelType: string,
    projectName: string,
  ): Promise<void> {
    try {
      // Dedup check
      const alreadySent = await this.deps.existsDelivery(alert.id, member.userId, channelType);
      if (alreadySent) return;

      // Get channel adapter
      const channel = this.deps.channelRegistry.get(channelType);
      if (!channel) return;

      // Get channel config for non-email channels
      let config: JsonValue | undefined;
      if (channelType !== 'email') {
        const channelConfig = await this.deps.getUserChannelConfig(member.userId, channelType);
        if (!channelConfig) return;
        config = channelConfig.config as JsonValue;
      }

      // Send
      const result = await channel.send(
        {
          id: alert.id,
          alertType: alert.alertType,
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          metadata: alert.metadata,
        },
        { id: member.userId, name: member.name, email: member.email },
        config,
        projectName,
      );

      // Log result
      await this.deps.createDelivery({
        alertId: alert.id,
        userId: member.userId,
        channelType,
        status: result.success ? 'sent' : 'failed',
        errorMessage: result.error,
      });
    } catch (error) {
      // Log failure but never throw
      const message = error instanceof Error ? error.message : String(error);
      await this.deps.createDelivery({
        alertId: alert.id,
        userId: member.userId,
        channelType,
        status: 'failed',
        errorMessage: message,
      });
    }
  }
}
