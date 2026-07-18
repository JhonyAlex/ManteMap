/**
 * Integration tests for GET+POST /api/projects/[projectId]/webhooks
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/webhooks/spec.md
 *   WH-005 WebhookEndpoint model, WH-001 channel registration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthorizationError } from '@mantemap/shared';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetAuthUser = vi.fn();
const mockRequireProjectMember = vi.fn();

const mockFindByProjectId = vi.fn();
const mockCreateWebhook = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getAuthUser: () => mockGetAuthUser(),
}));

vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: (...args: unknown[]) => mockRequireProjectMember(...args),
}));

vi.mock('@/lib/repositories/webhook-repository', () => ({
  findByProjectId: (...args: unknown[]) => mockFindByProjectId(...args),
  createWebhook: (...args: unknown[]) => mockCreateWebhook(...args),
}));

import { GET, POST } from '../route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'proj-webhook-1';

const mockEndpoint = {
  id: 'clwebhook001xxxxxxxxxxxxx',
  projectId: PROJECT_ID,
  name: 'Slack Bridge',
  url: 'https://hooks.slack.com/services/TEST',
  secret: 'sk_secret_abc',
  eventTypes: ['STATUS_INCIDENT', 'DOCUMENT_EXPIRING'],
  active: true,
  retryCount: 3,
  createdAt: new Date('2026-07-15'),
};

function makeRequest(method: string, projectId: string, body?: unknown): Request {
  return new Request(`http://localhost/api/projects/${projectId}/webhooks`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/projects/[projectId]/webhooks', () => {
  const projectId = PROJECT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const request = makeRequest('GET', projectId);
    const response = await GET(request, { params: Promise.resolve({ projectId }) });

    expect(response.status).toBe(401);
  });

  it('should return 403 when user is not a project member', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
    mockRequireProjectMember.mockRejectedValue(
      new AuthorizationError('Not a member'),
    );

    const request = makeRequest('GET', projectId);
    const response = await GET(request, { params: Promise.resolve({ projectId }) });

    expect(response.status).toBe(403);
  });

  it('should list webhook endpoints excluding secret field', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
    mockRequireProjectMember.mockResolvedValue(undefined);
    mockFindByProjectId.mockResolvedValue([mockEndpoint]);

    const request = makeRequest('GET', projectId);
    const response = await GET(request, { params: Promise.resolve({ projectId }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('clwebhook001xxxxxxxxxxxxx');
    expect(json.data[0].name).toBe('Slack Bridge');
    expect(json.data[0].url).toBe('https://hooks.slack.com/services/TEST');
    // Secret MUST be excluded per WH-005
    expect(json.data[0].secret).toBeUndefined();
  });

  it('should return empty array when no endpoints exist', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
    mockRequireProjectMember.mockResolvedValue(undefined);
    mockFindByProjectId.mockResolvedValue([]);

    const request = makeRequest('GET', projectId);
    const response = await GET(request, { params: Promise.resolve({ projectId }) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data).toEqual([]);
  });
});

describe('POST /api/projects/[projectId]/webhooks', () => {
  const projectId = PROJECT_ID;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 when user is not authenticated', async () => {
    mockGetAuthUser.mockResolvedValue({ error: new Response(null, { status: 401 }) });

    const request = makeRequest('POST', projectId, { name: 'Test', url: 'https://example.com' });
    const response = await POST(request, { params: Promise.resolve({ projectId }) });

    expect(response.status).toBe(401);
  });

  it('should return 201 and create a webhook endpoint', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
    mockRequireProjectMember.mockResolvedValue(undefined);
    mockCreateWebhook.mockResolvedValue({
      ...mockEndpoint,
      name: 'New Webhook',
      url: 'https://hooks.example.com/new',
      eventTypes: ['STATUS_INCIDENT'],
    });

    const request = makeRequest('POST', projectId, {
      name: 'New Webhook',
      url: 'https://hooks.example.com/new',
      secret: 'sk_new_secret',
      eventTypes: ['STATUS_INCIDENT'],
      active: true,
    });
    const response = await POST(request, { params: Promise.resolve({ projectId }) });
    const json = await response.json();

    expect(response.status).toBe(201);
    expect(json.data.name).toBe('New Webhook');
    expect(json.data.url).toBe('https://hooks.example.com/new');
    // Secret must be excluded from POST response too
    expect(json.data.secret).toBeUndefined();
  });

  it('should return 400 when body is missing required fields', async () => {
    mockGetAuthUser.mockResolvedValue({ user: { id: 'user-1', email: 'test@test.com' } });
    mockRequireProjectMember.mockResolvedValue(undefined);

    const request = makeRequest('POST', projectId, { name: 'No URL' }); // missing url
    const response = await POST(request, { params: Promise.resolve({ projectId }) });

    expect(response.status).toBe(400);
  });
});
