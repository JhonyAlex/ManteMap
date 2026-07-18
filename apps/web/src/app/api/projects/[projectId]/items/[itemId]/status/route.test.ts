import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthorizationError, ConflictError, NotFoundError } from '@mantemap/shared';

vi.mock('@/lib/services/item-service', () => ({
  transitionStatus: vi.fn(),
}));
vi.mock('@/lib/auth/session', () => ({ getAuthUser: vi.fn() }));

import { PATCH } from './route';
import { transitionStatus } from '@/lib/services/item-service';
import { getAuthUser } from '@/lib/auth/session';
import { unauthorized } from '@/lib/http/api-error';

const params = {
  params: Promise.resolve({ projectId: 'project-1', itemId: 'item-1' }),
};
const user = {
  id: 'owner-1',
  email: 'owner@example.com',
  name: 'Owner',
  role: 'ADMIN',
};

const updatedItem = {
  id: 'item-1',
  name: 'Industrial Pump',
  slug: 'industrial-pump',
  itemTypeId: 'type-1',
  statusId: 'status-2',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function patchRequest(body: string) {
  return new Request(
    'http://localhost/api/projects/project-1/items/item-1/status',
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body,
    }
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAuthUser).mockResolvedValue({ user } as never);
});

describe('items status transition route', () => {
  // -----------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------
  describe('authentication', () => {
    it('returns 401 without a session', async () => {
      vi.mocked(getAuthUser).mockResolvedValue({ error: unauthorized() } as never);
      const response = await PATCH(
        patchRequest(JSON.stringify({ statusId: 'clstat2xxxxxxxxxxxxxxxxx' })),
        params
      );
      expect(response.status).toBe(401);
    });
  });

  // -----------------------------------------------------------------
  // Validation
  // -----------------------------------------------------------------
  describe('validation', () => {
    it('returns 400 for malformed JSON', async () => {
      const response = await PATCH(patchRequest('{broken'), params);
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when statusId is missing', async () => {
      const response = await PATCH(patchRequest(JSON.stringify({})), params);
      expect(response.status).toBe(400);
    });

    it('returns 400 when statusId is not a valid CUID', async () => {
      const response = await PATCH(
        patchRequest(JSON.stringify({ statusId: 'not-a-cuid' })),
        params
      );
      expect(response.status).toBe(400);
    });
  });

  // -----------------------------------------------------------------
  // Valid transitions
  // -----------------------------------------------------------------
  describe('valid transitions', () => {
    it('transitions item to a valid status and returns 200', async () => {
      vi.mocked(transitionStatus).mockResolvedValue({ item: updatedItem } as never);

      const response = await PATCH(
        patchRequest(JSON.stringify({ statusId: 'clstat2xxxxxxxxxxxxxxxxx' })),
        params
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.statusId).toBe('status-2');
      expect(body.message).toContain('transitioned');
    });

    it('calls service with correct parameters', async () => {
      vi.mocked(transitionStatus).mockResolvedValue({ item: updatedItem } as never);

      await PATCH(
        patchRequest(JSON.stringify({ statusId: 'clstat2xxxxxxxxxxxxxxxxx' })),
        params
      );

      expect(transitionStatus).toHaveBeenCalledWith(
        'project-1',
        'item-1',
        'clstat2xxxxxxxxxxxxxxxxx',
        'owner-1'
      );
    });
  });

  // -----------------------------------------------------------------
  // isFinal enforcement
  // -----------------------------------------------------------------
  describe('isFinal enforcement', () => {
    it('returns 409 when current status is final', async () => {
      vi.mocked(transitionStatus).mockRejectedValue(
        new ConflictError('Item is in a final status "Completed" and cannot be transitioned')
      );

      const response = await PATCH(
        patchRequest(JSON.stringify({ statusId: 'clstat2xxxxxxxxxxxxxxxxx' })),
        params
      );

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.message).toContain('final');
    });
  });

  // -----------------------------------------------------------------
  // Deactivated status rejection
  // -----------------------------------------------------------------
  describe('deactivated status rejection', () => {
    it('returns 404 when target status does not exist or is deactivated', async () => {
      vi.mocked(transitionStatus).mockRejectedValue(
        new NotFoundError('Status', 'clstat999xxxxxxxxxxxxxxxx')
      );

      const response = await PATCH(
        patchRequest(JSON.stringify({ statusId: 'clstat999xxxxxxxxxxxxxxxx' })),
        params
      );

      expect(response.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------
  // Item not found
  // -----------------------------------------------------------------
  describe('item not found', () => {
    it('returns 404 when item does not exist', async () => {
      vi.mocked(transitionStatus).mockRejectedValue(
        new NotFoundError('Item', 'item-1')
      );

      const response = await PATCH(
        patchRequest(JSON.stringify({ statusId: 'clstat2xxxxxxxxxxxxxxxxx' })),
        params
      );

      expect(response.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------
  // Authorization
  // -----------------------------------------------------------------
  describe('authorization', () => {
    it('returns 403 for non-owner', async () => {
      vi.mocked(transitionStatus).mockRejectedValue(new AuthorizationError());

      const response = await PATCH(
        patchRequest(JSON.stringify({ statusId: 'clstat2xxxxxxxxxxxxxxxxx' })),
        params
      );

      expect(response.status).toBe(403);
    });
  });

  // -----------------------------------------------------------------
  // Internal errors
  // -----------------------------------------------------------------
  describe('internal errors', () => {
    it('does not expose unexpected errors', async () => {
      vi.mocked(transitionStatus).mockRejectedValue(
        new Error('Prisma secret internal')
      );

      const response = await PATCH(
        patchRequest(JSON.stringify({ statusId: 'clstat2xxxxxxxxxxxxxxxxx' })),
        params
      );

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).not.toContain('Prisma');
    });
  });
});
