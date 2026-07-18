/**
 * Integration tests for GET+PATCH+DELETE /api/projects/[projectId]/webhooks/[webhookId]
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/webhooks/spec.md
 *   WH-005 WebhookEndpoint model, secret exclusion
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetAuthUser = vi.fn();
const mockRequireProjectMember = vi.fn();

const mockFindById = vi.fn();
const mockUpdateWebhook = vi.fn();
const mockDeleteWebhook = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: (...args: unknown[]) => mockRequireProjectMember(...args),
}));

vi.mock('@/lib/repositories/webhook-repository', () => ({
  findById: (...args: unknown[]) => mockFindById(...args),
  updateWebhook: (...args: unknown[]) => mockUpdateWebhook(...args),
  deleteWebhook: (...args: unknown[]) => mockDeleteWebhook(...args),
}));

import { GET, PATCH, DELETE } from '../route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'proj-webhook-1';
const ENDPOINT_ID = 'clwebhook001xxxxxxxxxxxxx';

const mockEndpoint = {
  id: ENDPOINT_ID,
  projectId: PROJECT_ID,
  name: 'Slack Bridge',
  url: 'https://hooks.slack.com/services/TEST',
  secret: 'sk_secret_abc',
  eventTypes: ['STATUS_INCIDENT', 'DOCUMENT_EXPIRING'],
  active: true,
  retryCount: 3,
  createdAt: new Date('2026-07-15'),
};

function makeRequest(
  method: string,
  projectId: string,
  webhookId: string,
  body?: unknown,
): Request {
  return new Request(
    `http://localhost/api/projects/${projectId}/webhooks/${webhookId}`,
    {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Single Webhook Endpoint Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/projects/[projectId]/webhooks/[webhookId]', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

      const request = makeRequest('GET', PROJECT_ID, ENDPOINT_ID);
      const response = await GET(request, {
        params: Promise.resolve({ projectId: PROJECT_ID, webhookId: ENDPOINT_ID }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 when endpoint not found', async () => {
      mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
      mockRequireProjectMember.mockResolvedValue(undefined);
      mockFindById.mockResolvedValue(null);

      const request = makeRequest('GET', PROJECT_ID, 'nonexistent');
      const response = await GET(request, {
        params: Promise.resolve({ projectId: PROJECT_ID, webhookId: 'nonexistent' }),
      });

      expect(response.status).toBe(404);
    });

    it('should return endpoint excluding secret field', async () => {
      mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
      mockRequireProjectMember.mockResolvedValue(undefined);
      mockFindById.mockResolvedValue(mockEndpoint);

      const request = makeRequest('GET', PROJECT_ID, ENDPOINT_ID);
      const response = await GET(request, {
        params: Promise.resolve({ projectId: PROJECT_ID, webhookId: ENDPOINT_ID }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.id).toBe(ENDPOINT_ID);
      expect(json.data.name).toBe('Slack Bridge');
      // Secret MUST be excluded per WH-005
      expect(json.data.secret).toBeUndefined();
    });
  });

  describe('PATCH /api/projects/[projectId]/webhooks/[webhookId]', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

      const request = makeRequest('PATCH', PROJECT_ID, ENDPOINT_ID, { active: false });
      const response = await PATCH(request, {
        params: Promise.resolve({ projectId: PROJECT_ID, webhookId: ENDPOINT_ID }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 when endpoint not found', async () => {
      mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
      mockRequireProjectMember.mockResolvedValue(undefined);
      mockFindById.mockResolvedValue(null);

      const request = makeRequest('PATCH', PROJECT_ID, 'nonexistent', { active: false });
      const response = await PATCH(request, {
        params: Promise.resolve({ projectId: PROJECT_ID, webhookId: 'nonexistent' }),
      });

      expect(response.status).toBe(404);
    });

    it('should update endpoint fields and exclude secret in response', async () => {
      mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
      mockRequireProjectMember.mockResolvedValue(undefined);
      mockFindById.mockResolvedValue(mockEndpoint);
      mockUpdateWebhook.mockResolvedValue({
        ...mockEndpoint,
        name: 'Updated Bridge',
        active: false,
      });

      const request = makeRequest('PATCH', PROJECT_ID, ENDPOINT_ID, {
        name: 'Updated Bridge',
        active: false,
      });
      const response = await PATCH(request, {
        params: Promise.resolve({ projectId: PROJECT_ID, webhookId: ENDPOINT_ID }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.data.name).toBe('Updated Bridge');
      expect(json.data.active).toBe(false);
      expect(json.data.secret).toBeUndefined();
    });
  });

  describe('DELETE /api/projects/[projectId]/webhooks/[webhookId]', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

      const request = makeRequest('DELETE', PROJECT_ID, ENDPOINT_ID);
      const response = await DELETE(request, {
        params: Promise.resolve({ projectId: PROJECT_ID, webhookId: ENDPOINT_ID }),
      });

      expect(response.status).toBe(401);
    });

    it('should return 404 when endpoint not found', async () => {
      mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
      mockRequireProjectMember.mockResolvedValue(undefined);
      mockFindById.mockResolvedValue(null);

      const request = makeRequest('DELETE', PROJECT_ID, 'nonexistent');
      const response = await DELETE(request, {
        params: Promise.resolve({ projectId: PROJECT_ID, webhookId: 'nonexistent' }),
      });

      expect(response.status).toBe(404);
    });

    it('should delete the endpoint and return 200', async () => {
      mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
      mockRequireProjectMember.mockResolvedValue(undefined);
      mockFindById.mockResolvedValue(mockEndpoint);
      mockDeleteWebhook.mockResolvedValue(undefined);

      const request = makeRequest('DELETE', PROJECT_ID, ENDPOINT_ID);
      const response = await DELETE(request, {
        params: Promise.resolve({ projectId: PROJECT_ID, webhookId: ENDPOINT_ID }),
      });
      const json = await response.json();

      expect(response.status).toBe(200);
      expect(json.message).toBeDefined();
    });
  });
});
