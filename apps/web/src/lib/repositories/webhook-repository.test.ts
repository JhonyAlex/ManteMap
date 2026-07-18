import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock Prisma client — webhook endpoint CRUD
// ---------------------------------------------------------------------------
vi.mock('@mantemap/database', () => ({
  default: {
    webhookEndpoint: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import prisma from '@mantemap/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

// RED — production code does not exist yet
import {
  findByProjectId,
  findById,
  createWebhook,
  updateWebhook,
  deleteWebhook,
} from './webhook-repository';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';

const endpoint1 = {
  id: 'clweb1xxxxxxxxxxxxxxxxx',
  projectId: PROJECT_ID,
  name: 'Slack Bridge',
  url: 'https://hooks.example.com/slack',
  secret: 'sk_secret123',
  eventTypes: ['STATUS_INCIDENT', 'DOCUMENT_EXPIRING'],
  active: true,
  retryCount: 3,
  createdAt: new Date('2026-01-01'),
};

const endpoint2 = {
  id: 'clweb2xxxxxxxxxxxxxxxxx',
  projectId: PROJECT_ID,
  name: 'Teams Notifier',
  url: 'https://hooks.example.com/teams',
  secret: null,
  eventTypes: ['EVENT_UPCOMING'],
  active: false,
  retryCount: 5,
  createdAt: new Date('2026-02-01'),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebhookRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findByProjectId', () => {
    it('should return all endpoints for a project ordered by createdAt', async () => {
      db.webhookEndpoint.findMany.mockResolvedValue([endpoint1, endpoint2]);

      const result = await findByProjectId(PROJECT_ID);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('clweb1xxxxxxxxxxxxxxxxx');
      expect(result[1].id).toBe('clweb2xxxxxxxxxxxxxxxxx');
      expect(db.webhookEndpoint.findMany).toHaveBeenCalledWith({
        where: { projectId: PROJECT_ID },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array when no endpoints exist', async () => {
      db.webhookEndpoint.findMany.mockResolvedValue([]);

      const result = await findByProjectId(PROJECT_ID);

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return the endpoint when found', async () => {
      db.webhookEndpoint.findUnique.mockResolvedValue(endpoint1);

      const result = await findById('clweb1xxxxxxxxxxxxxxxxx');

      expect(result).toEqual(endpoint1);
      expect(db.webhookEndpoint.findUnique).toHaveBeenCalledWith({
        where: { id: 'clweb1xxxxxxxxxxxxxxxxx' },
      });
    });

    it('should return null when endpoint not found', async () => {
      db.webhookEndpoint.findUnique.mockResolvedValue(null);

      const result = await findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('createWebhook', () => {
    it('should create an endpoint with all fields', async () => {
      const data = {
        projectId: PROJECT_ID,
        name: 'New Webhook',
        url: 'https://hooks.example.com/new',
        secret: 'sk_new_secret',
        eventTypes: ['STATUS_INCIDENT'],
        active: true,
        retryCount: 3,
      };
      db.webhookEndpoint.create.mockResolvedValue({
        id: 'clweb3xxxxxxxxxxxxxxxxx',
        ...data,
        createdAt: new Date('2026-03-01'),
      });

      const result = await createWebhook(data);

      expect(result.id).toBe('clweb3xxxxxxxxxxxxxxxxx');
      expect(result.name).toBe('New Webhook');
      expect(result.secret).toBe('sk_new_secret');
      expect(db.webhookEndpoint.create).toHaveBeenCalledWith({
        data,
      });
    });

    it('should create an endpoint without secret', async () => {
      const data = {
        projectId: PROJECT_ID,
        name: 'No Secret Webhook',
        url: 'https://hooks.example.com/nosecret',
        secret: undefined,
        eventTypes: ['DOCUMENT_EXPIRING'],
        active: true,
        retryCount: 1,
      };
      db.webhookEndpoint.create.mockResolvedValue({
        id: 'clweb4xxxxxxxxxxxxxxxxx',
        ...data,
        secret: null,
        createdAt: new Date('2026-03-02'),
      });

      const result = await createWebhook(data);

      expect(result.secret).toBeNull();
    });
  });

  describe('updateWebhook', () => {
    it('should update fields and return updated endpoint', async () => {
      const updates = { name: 'Updated Name', active: false };
      db.webhookEndpoint.update.mockResolvedValue({
        ...endpoint1,
        ...updates,
      });

      const result = await updateWebhook('clweb1xxxxxxxxxxxxxxxxx', updates);

      expect(result.name).toBe('Updated Name');
      expect(result.active).toBe(false);
      expect(db.webhookEndpoint.update).toHaveBeenCalledWith({
        where: { id: 'clweb1xxxxxxxxxxxxxxxxx' },
        data: updates,
      });
    });
  });

  describe('deleteWebhook', () => {
    it('should delete the endpoint by id', async () => {
      db.webhookEndpoint.delete.mockResolvedValue(endpoint1);

      await deleteWebhook('clweb1xxxxxxxxxxxxxxxxx');

      expect(db.webhookEndpoint.delete).toHaveBeenCalledWith({
        where: { id: 'clweb1xxxxxxxxxxxxxxxxx' },
      });
    });

    it('should throw when deleting non-existent endpoint', async () => {
      db.webhookEndpoint.delete.mockRejectedValue(new Error('Record not found'));

      await expect(deleteWebhook('nonexistent')).rejects.toThrow('Record not found');
    });
  });
});
