import type { PrismaClient } from '@mantemap/database';
import prisma from '@mantemap/database';
import { ChannelRegistry } from './channel-registry';
import { EmailChannel } from './email-channel';
import { SlackChannel } from './slack-channel';
import { TeamsChannel } from './teams-channel';
import { TelegramChannel } from './telegram-channel';
import {
  getUserChannelConfig,
} from '@/lib/repositories/channel-config-repository';
import {
  existsDelivery,
  createDelivery,
} from '@/lib/repositories/notification-delivery-repository';
import {
  getMembersWithPreferences,
  getRecentActiveAlerts,
  getProjectById,
} from '@/lib/repositories/alert-repository';
import {
  NotificationDispatcher,
  type DispatcherDependencies,
} from '@/lib/services/notification-dispatcher';

// ---------------------------------------------------------------------------
// Singleton — one dispatcher per process (serverless-compatible)
// ---------------------------------------------------------------------------

let _dispatcher: NotificationDispatcher | null = null;

function buildDeps(client: PrismaClient): DispatcherDependencies {
  return {
    channelRegistry: buildRegistry(),
    getUserChannelConfig: (userId, channelType) =>
      getUserChannelConfig(userId, channelType, client),
    existsDelivery: (alertId, userId, channelType) =>
      existsDelivery(alertId, userId, channelType, client),
    createDelivery: (data) =>
      createDelivery(
        {
          alertId: data.alertId,
          userId: data.userId,
          channelType: data.channelType,
          status: data.status,
          ...(data.errorMessage ? { errorMessage: data.errorMessage } : {}),
        },
        client,
      ),
    getMembersWithPreferences: (projectId, alertType) =>
      getMembersWithPreferences(projectId, alertType, client),
    getProjectById: (projectId) =>
      getProjectById(projectId, client),
    getRecentAlerts: (projectId, sinceMinutes) =>
      getRecentActiveAlerts(projectId, sinceMinutes, client),
  };
}

function buildRegistry(): ChannelRegistry {
  const registry = new ChannelRegistry();
  registry.register(new EmailChannel());
  registry.register(new SlackChannel());
  registry.register(new TeamsChannel());
  registry.register(new TelegramChannel());
  return registry;
}

export function getNotificationDispatcher(client: PrismaClient = prisma): NotificationDispatcher {
  if (!_dispatcher) {
    _dispatcher = new NotificationDispatcher(buildDeps(client));
  }
  return _dispatcher;
}

/**
 * Reset the singleton (for tests). Never call in production.
 */
export function resetDispatcher(): void {
  _dispatcher = null;
}

// Re-export for convenience
export { NotificationDispatcher } from '@/lib/services/notification-dispatcher';
