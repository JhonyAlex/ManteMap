/**
 * RED tests for project access control service.
 *
 * Strict TDD: these tests are written BEFORE the production code.
 * They reference functions that DO NOT EXIST yet — guaranteed RED.
 *
 * Acceptance criteria from specs/project-access-control/spec.md:
 *   1. Member reads a project → success
 *   2. Non-member reads → 404 (project existence hidden)
 *   3. Owner mutation → success
 *   4. Non-owner mutation → 403
 *   5. Invalid session → 401 (tested at route layer, not here)
 *   6. ADMIN has NO implicit project bypass
 *
 * Disposable PostgreSQL must be running:
 *   docker compose -f docker-compose.dev.yml up -d
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import prisma from '@mantemap/database';
import { NotFoundError, AuthorizationError } from '@mantemap/shared';
import {
  requireProjectMember,
  requireProjectOwner,
} from './project-access-service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a test user directly in the database. */
async function createTestUser(
  overrides: { role?: 'ADMIN' | 'PROJECT_MANAGER' | 'TECHNICIAN' | 'VIEWER'; email?: string } = {}
) {
  const email = overrides.email ?? `test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.com`;
  return prisma.user.create({
    data: {
      name: 'Test User',
      email,
      passwordHash: '$2a$12$0000000000000000000000000000000000000000000000000000',
      role: overrides.role ?? 'TECHNICIAN',
      status: 'ACTIVE',
    },
  });
}

/** Create a project with atomic owner membership via repository. */
async function createTestProjectWithOwner(
  ownerId: string,
  overrides: { code?: string; name?: string } = {}
) {
  const code = overrides.code ?? `ACC-${Date.now()}`;
  const name = overrides.name ?? 'Access Test Project';

  const project = await prisma.project.create({
    data: { code, name, ownerId },
  });

  await prisma.projectMember.create({
    data: { userId: ownerId, projectId: project.id, role: 'OWNER' },
  });

  return project;
}

/** Add a user as a MEMBER of a project. */
async function addMember(userId: string, projectId: string, role: 'MEMBER' | 'OWNER' = 'MEMBER') {
  return prisma.projectMember.create({
    data: { userId, projectId, role },
  });
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

beforeEach(async () => {
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ===========================================================================
// requireProjectMember — member access
// ===========================================================================
describe('requireProjectMember — member access', () => {
  it('succeeds when user is the project owner', async () => {
    const owner = await createTestUser();
    const project = await createTestProjectWithOwner(owner.id, { code: 'MEM-OWNER' });

    // Should not throw
    await expect(requireProjectMember(project.id, owner.id)).resolves.toBeUndefined();
  });

  it('succeeds when user is a project member', async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const project = await createTestProjectWithOwner(owner.id, { code: 'MEM-MEMBER' });
    await addMember(member.id, project.id, 'MEMBER');

    // Should not throw
    await expect(requireProjectMember(project.id, member.id)).resolves.toBeUndefined();
  });

  it('throws NotFoundError when user is not a member', async () => {
    const owner = await createTestUser();
    const outsider = await createTestUser();
    const project = await createTestProjectWithOwner(owner.id, { code: 'MEM-OUT' });

    await expect(requireProjectMember(project.id, outsider.id)).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError for non-existent project', async () => {
    const user = await createTestUser();

    await expect(requireProjectMember('non-existent-id', user.id)).rejects.toThrow(NotFoundError);
  });
});

// ===========================================================================
// requireProjectMember — ADMIN has no bypass
// ===========================================================================
describe('requireProjectMember — ADMIN has no bypass', () => {
  it('throws NotFoundError when ADMIN is not a member of the project', async () => {
    const owner = await createTestUser();
    const admin = await createTestUser({ role: 'ADMIN' });
    const project = await createTestProjectWithOwner(owner.id, { code: 'ADMIN-NOBYPASS' });

    // ADMIN who is NOT a member must get 404, not access
    await expect(requireProjectMember(project.id, admin.id)).rejects.toThrow(NotFoundError);
  });

  it('succeeds when ADMIN is also a member of the project', async () => {
    const owner = await createTestUser();
    const admin = await createTestUser({ role: 'ADMIN' });
    const project = await createTestProjectWithOwner(owner.id, { code: 'ADMIN-MEMBER' });
    await addMember(admin.id, project.id, 'MEMBER');

    // ADMIN who IS a member can access
    await expect(requireProjectMember(project.id, admin.id)).resolves.toBeUndefined();
  });
});

// ===========================================================================
// requireProjectOwner — owner mutation
// ===========================================================================
describe('requireProjectOwner — owner mutation', () => {
  it('succeeds when user is the project owner', async () => {
    const owner = await createTestUser();
    const project = await createTestProjectWithOwner(owner.id, { code: 'OWN-OK' });

    // Should not throw
    await expect(requireProjectOwner(project.id, owner.id)).resolves.toBeUndefined();
  });

  it('throws AuthorizationError when user is a member but not the owner', async () => {
    const owner = await createTestUser();
    const member = await createTestUser();
    const project = await createTestProjectWithOwner(owner.id, { code: 'OWN-MEMBER' });
    await addMember(member.id, project.id, 'MEMBER');

    await expect(requireProjectOwner(project.id, member.id)).rejects.toThrow(AuthorizationError);

    // Project remains unchanged in the database after 403
    const dbProject = await prisma.project.findUnique({ where: { id: project.id } });
    expect(dbProject).not.toBeNull();
    expect(dbProject!.code).toBe('OWN-MEMBER');
    expect(dbProject!.name).toBe('Access Test Project');
    expect(dbProject!.ownerId).toBe(owner.id);
  });

  it('throws NotFoundError when user is not a member at all', async () => {
    const owner = await createTestUser();
    const outsider = await createTestUser();
    const project = await createTestProjectWithOwner(owner.id, { code: 'OWN-OUT' });

    // Non-member gets NotFoundError (not AuthorizationError) to hide project existence
    await expect(requireProjectOwner(project.id, outsider.id)).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError for non-existent project', async () => {
    const user = await createTestUser();

    await expect(requireProjectOwner('non-existent-id', user.id)).rejects.toThrow(NotFoundError);
  });
});

// ===========================================================================
// requireProjectOwner — ADMIN has no bypass
// ===========================================================================
describe('requireProjectOwner — ADMIN has no bypass', () => {
  it('throws NotFoundError when ADMIN is not a member of the project', async () => {
    const owner = await createTestUser();
    const admin = await createTestUser({ role: 'ADMIN' });
    const project = await createTestProjectWithOwner(owner.id, { code: 'ADMIN-OWN-OUT' });

    // ADMIN who is NOT a member must get NotFoundError
    await expect(requireProjectOwner(project.id, admin.id)).rejects.toThrow(NotFoundError);
  });

  it('throws AuthorizationError when ADMIN is a member but not the owner', async () => {
    const owner = await createTestUser();
    const admin = await createTestUser({ role: 'ADMIN' });
    const project = await createTestProjectWithOwner(owner.id, { code: 'ADMIN-OWN-MEM' });
    await addMember(admin.id, project.id, 'MEMBER');

    // ADMIN who is a MEMBER but not OWNER must get AuthorizationError
    await expect(requireProjectOwner(project.id, admin.id)).rejects.toThrow(AuthorizationError);

    // Project remains unchanged — no implicit ADMIN bypass
    const dbProject = await prisma.project.findUnique({ where: { id: project.id } });
    expect(dbProject).not.toBeNull();
    expect(dbProject!.code).toBe('ADMIN-OWN-MEM');
    expect(dbProject!.name).toBe('Access Test Project');
    expect(dbProject!.ownerId).toBe(owner.id);
  });

  it('succeeds when ADMIN is also the project owner', async () => {
    const admin = await createTestUser({ role: 'ADMIN' });
    const project = await createTestProjectWithOwner(admin.id, { code: 'ADMIN-OWNER' });

    // ADMIN who IS the owner can mutate
    await expect(requireProjectOwner(project.id, admin.id)).resolves.toBeUndefined();
  });
});
