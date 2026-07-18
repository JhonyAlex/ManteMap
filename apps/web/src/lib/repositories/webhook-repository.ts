import type { PrismaClient, WebhookEndpoint } from '@mantemap/database';
import prisma from '@mantemap/database';

/**
 * List all webhook endpoints for a project, ordered by creation date.
 * Secret is INCLUDED here (used internally by the channel).
 * API routes strip secrets before responding.
 */
export async function findByProjectId(
  projectId: string,
  client: PrismaClient = prisma,
): Promise<WebhookEndpoint[]> {
  return client.webhookEndpoint.findMany({
    where: { projectId },
    orderBy: { createdAt: 'asc' },
  });
}

/**
 * Get a single webhook endpoint by ID.
 */
export async function findById(
  id: string,
  client: PrismaClient = prisma,
): Promise<WebhookEndpoint | null> {
  return client.webhookEndpoint.findUnique({
    where: { id },
  });
}

/**
 * Create a new webhook endpoint.
 */
export async function createWebhook(
  data: {
    projectId: string;
    name: string;
    url: string;
    secret?: string;
    eventTypes: string[];
    active?: boolean;
    retryCount?: number;
  },
  client: PrismaClient = prisma,
): Promise<WebhookEndpoint> {
  return client.webhookEndpoint.create({
    data: {
      projectId: data.projectId,
      name: data.name,
      url: data.url,
      secret: data.secret ?? null,
      eventTypes: data.eventTypes,
      active: data.active ?? true,
      retryCount: data.retryCount ?? 3,
    },
  });
}

/**
 * Update an existing webhook endpoint.
 */
export async function updateWebhook(
  id: string,
  data: {
    name?: string;
    url?: string;
    secret?: string | null;
    eventTypes?: string[];
    active?: boolean;
    retryCount?: number;
  },
  client: PrismaClient = prisma,
): Promise<WebhookEndpoint> {
  return client.webhookEndpoint.update({
    where: { id },
    data,
  });
}

/**
 * Delete a webhook endpoint by ID.
 */
export async function deleteWebhook(
  id: string,
  client: PrismaClient = prisma,
): Promise<void> {
  await client.webhookEndpoint.delete({
    where: { id },
  });
}
