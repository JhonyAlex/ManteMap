/**
 * 🔴 RED tests for resolveProjectId and getProjectByCode (Phase 3 — PR 3).
 *
 * Strict TDD: these tests are written BEFORE production code.
 * They reference functions that DO NOT EXIST yet — guaranteed RED.
 *
 * These are PURE UNIT tests with mocked repository functions.
 * No database required.
 *
 * Spec: openspec/changes/human-readable-urls-and-floor-plan-fixes/specs/application-shell/spec.md
 * Design: design.md — "API routes accept both code and CUID"
 * Design: design.md — "New: resolveProjectId (API helper)"
 * Design: design.md — "New: getProjectByCode"
 */

import { describe, it, expect, beforeAll, beforeEach, vi, type Mock } from 'vitest';
import { NotFoundError } from '@mantemap/shared';

// ── Mock repository ──────────────────────────────────────────────────────
vi.mock('@/lib/repositories/project-repository', () => ({
  findProjectByCode: vi.fn(),
  findProjectById: vi.fn(),
}));

// ── Mock project access service ──────────────────────────────────────────
vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: vi.fn(),
}));

import {
  findProjectByCode,
  findProjectById,
} from '@/lib/repositories/project-repository';
import { requireProjectMember } from '@/lib/services/project-access-service';

const mockFindProjectByCode = findProjectByCode as Mock;
const mockFindProjectById = findProjectById as Mock;
const mockRequireProjectMember = requireProjectMember as Mock;

// ── Lazy-import the functions UNDER TEST (they don't exist yet — RED) ────
let resolveProjectId: (param: string) => Promise<string>;
let getProjectByCode: (projectCode: string, userId: string) => Promise<{
  project: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    status: string;
    ownerId: string;
    createdAt: Date;
    updatedAt: Date;
  };
}>;

beforeAll(async () => {
  const mod = await import('../project-service');
  resolveProjectId = (mod as any).resolveProjectId;
  getProjectByCode = (mod as any).getProjectByCode;
});

// =========================================================================
// resolveProjectId — dual resolution (code-first, fallback to CUID)
// =========================================================================
describe('resolveProjectId — dual resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('resolves by code when code matches', async () => {
    mockFindProjectByCode.mockResolvedValue({
      id: 'proj-123',
      code: 'MAP-001',
      name: 'Test',
    });
    mockFindProjectById.mockResolvedValue(null);

    const result = await resolveProjectId('MAP-001');

    expect(result).toBe('proj-123');
    expect(mockFindProjectByCode).toHaveBeenCalledWith('MAP-001');
    expect(mockFindProjectById).not.toHaveBeenCalled();
  });

  it('falls back to CUID when code does not match', async () => {
    mockFindProjectByCode.mockResolvedValue(null);
    mockFindProjectById.mockResolvedValue({
      id: 'clx999',
      code: 'MAP-002',
      name: 'Test',
    });

    const result = await resolveProjectId('clx999');

    expect(result).toBe('clx999');
    expect(mockFindProjectByCode).toHaveBeenCalledWith('clx999');
    expect(mockFindProjectById).toHaveBeenCalledWith('clx999');
  });

  it('throws NotFoundError when neither code nor CUID match', async () => {
    mockFindProjectByCode.mockResolvedValue(null);
    mockFindProjectById.mockResolvedValue(null);

    await expect(resolveProjectId('nonexistent')).rejects.toThrow(NotFoundError);
    // Verify error message contains the entity type
    await expect(resolveProjectId('nonexistent')).rejects.toThrow(/Project/);
  });

  it('prefers code over CUID when both would match (code takes priority)', async () => {
    mockFindProjectByCode.mockResolvedValue({
      id: 'proj-123',
      code: 'MAP-001',
      name: 'Code Match',
    });
    mockFindProjectById.mockResolvedValue({
      id: 'MAP-001',
      code: 'OTHER',
      name: 'CUID Match',
    });

    const result = await resolveProjectId('MAP-001');

    expect(result).toBe('proj-123');
    expect(mockFindProjectByCode).toHaveBeenCalledWith('MAP-001');
    // Should NOT fall through to findProjectById when code matches
    expect(mockFindProjectById).not.toHaveBeenCalled();
  });

  it('resolves by CUID when code lookup returns null and CUID matches', async () => {
    mockFindProjectByCode.mockResolvedValue(null);
    mockFindProjectById.mockResolvedValue({
      id: 'clx000',
      code: 'OTHER-CODE',
      name: 'By ID',
    });

    const result = await resolveProjectId('clx000');

    expect(result).toBe('clx000');
    expect(mockFindProjectByCode).toHaveBeenCalledWith('clx000');
    expect(mockFindProjectById).toHaveBeenCalledWith('clx000');
  });
});

// =========================================================================
// getProjectByCode — code lookup with membership guard
// =========================================================================
describe('getProjectByCode — code lookup with membership guard', () => {
  const userId = 'user-1';
  const mockProject = {
    id: 'proj-abc',
    code: 'MAP-001',
    name: 'Map Project',
    description: null as string | null,
    status: 'ACTIVE' as string,
    ownerId: 'owner-1',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns project when code matches and user is member', async () => {
    mockFindProjectByCode.mockResolvedValue(mockProject);
    mockRequireProjectMember.mockResolvedValue(undefined);

    const result = await getProjectByCode('MAP-001', userId);

    expect(result.project.id).toBe('proj-abc');
    expect(result.project.code).toBe('MAP-001');
    expect(result.project.name).toBe('Map Project');
    expect(mockFindProjectByCode).toHaveBeenCalledWith('MAP-001');
    // requireProjectMember should be called with the resolved project ID
    expect(mockRequireProjectMember).toHaveBeenCalledWith('proj-abc', userId);
  });

  it('throws NotFoundError when code does not match any project (before membership check)', async () => {
    mockFindProjectByCode.mockResolvedValue(null);

    await expect(getProjectByCode('NONEXISTENT', userId)).rejects.toThrow(
      NotFoundError
    );
    expect(mockFindProjectByCode).toHaveBeenCalledWith('NONEXISTENT');
    // Should not check membership for a non-existent project
    expect(mockRequireProjectMember).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when project exists but user is not a member', async () => {
    mockFindProjectByCode.mockResolvedValue(mockProject);
    mockRequireProjectMember.mockRejectedValue(
      new NotFoundError('Project', 'proj-abc')
    );

    await expect(getProjectByCode('MAP-001', userId)).rejects.toThrow(
      NotFoundError
    );
    expect(mockFindProjectByCode).toHaveBeenCalledWith('MAP-001');
    expect(mockRequireProjectMember).toHaveBeenCalledWith('proj-abc', userId);
  });
});
