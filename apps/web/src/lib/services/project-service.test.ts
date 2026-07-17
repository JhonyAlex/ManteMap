/**
 * RED tests for project lifecycle service.
 *
 * Strict TDD: these tests are written BEFORE the production code.
 * They reference functions that DO NOT EXIST yet — guaranteed RED.
 *
 * Acceptance criteria from specs/project-management/spec.md:
 *   1. Authenticated user can create a project with validated, normalized data
 *   2. Atomic creator ownership: ownerId + ProjectMember(OWNER) in one transaction
 *   3. Project code uniqueness with 409 on duplicate
 *   4. Transaction failure leaves neither project nor membership (rollback)
 *   5. Archive is non-destructive (status changes to ARCHIVED, data retained)
 *   6. Members can list/read; only owner can update/archive
 *
 * Disposable PostgreSQL must be running:
 *   docker compose -f docker-compose.dev.yml up -d
 */

import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import prisma from '@mantemap/database';
import {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  archiveProject,
} from './project-service';
import { ConflictError, NotFoundError, AuthorizationError } from '@mantemap/shared';

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

/** Create a project through the REAL production service path. */
async function createTestProject(
  ownerId: string,
  overrides: { code?: string; name?: string } = {}
) {
  return createProject(
    {
      code: overrides.code ?? `TEST-${Date.now()}`,
      name: overrides.name ?? 'Test Project',
      description: 'A test project',
    },
    ownerId
  );
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

beforeEach(async () => {
  // Clean in dependency order — disposable database only
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ===========================================================================
// Test 1: Authenticated create
// ===========================================================================
describe('createProject — authenticated creation', () => {
  it('creates a project and returns normalized data', async () => {
    const user = await createTestUser();

    const result = await createProject(
      {
        code: 'my-project',
        name: 'My Project',
        description: 'A description',
      },
      user.id
    );

    expect(result.project.code).toBe('MY-PROJECT');
    expect(result.project.name).toBe('My Project');
    expect(result.project.description).toBe('A description');
    expect(result.project.ownerId).toBe(user.id);
    expect(result.project.status).toBe('ACTIVE');
    expect(result.project.id).toBeDefined();
  });

  it('creates project with minimal data (no description)', async () => {
    const user = await createTestUser();

    const result = await createProject(
      { code: 'MINIMAL', name: 'Minimal Project' },
      user.id
    );

    expect(result.project.code).toBe('MINIMAL');
    expect(result.project.name).toBe('Minimal Project');
    expect(result.project.description).toBeNull();
  });
});

// ===========================================================================
// Test 2: Atomic ownerId + ProjectMember(OWNER)
// ===========================================================================
describe('createProject — atomic owner membership', () => {
  it('creates ProjectMember with OWNER role atomically with project', async () => {
    const user = await createTestUser();

    const result = await createProject(
      { code: 'OWNER-TEST', name: 'Owner Test' },
      user.id
    );

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: result.project.id },
    });
    expect(project).not.toBeNull();
    expect(project!.ownerId).toBe(user.id);

    // Verify OWNER membership exists
    const membership = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: result.project.id,
        },
      },
    });
    expect(membership).not.toBeNull();
    expect(membership!.role).toBe('OWNER');
  });

  it('rollback: onBeforeCommit failure leaves no project and no membership', async () => {
    const user = await createTestUser();

    await expect(
      createProject(
        { code: 'ROLLBACK', name: 'Will Rollback' },
        user.id,
        {
          onBeforeCommit: () => {
            throw new Error('Injected commit failure');
          },
        }
      )
    ).rejects.toThrow('Injected commit failure');

    // No project created
    const projects = await prisma.project.findMany({
      where: { code: 'ROLLBACK' },
    });
    expect(projects).toHaveLength(0);

    // No membership created
    const memberships = await prisma.projectMember.findMany({
      where: { userId: user.id },
    });
    expect(memberships).toHaveLength(0);
  });

  it('rollback: transaction failure on non-empty system does not affect existing data', async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();

    // Create a valid project first
    await createProject({ code: 'EXISTING', name: 'Existing' }, user1.id);

    // Second project creation fails
    await expect(
      createProject(
        { code: 'FAIL-NOW', name: 'Will Fail' },
        user2.id,
        {
          onBeforeCommit: () => {
            throw new Error('Injected failure');
          },
        }
      )
    ).rejects.toThrow('Injected failure');

    // Existing project still exists
    const existing = await prisma.project.findUnique({
      where: { code: 'EXISTING' },
    });
    expect(existing).not.toBeNull();

    // Failed project does not exist
    const failed = await prisma.project.findMany({
      where: { code: 'FAIL-NOW' },
    });
    expect(failed).toHaveLength(0);
  });
});

// ===========================================================================
// Test 3: Normalized unique project code conflict (409)
// ===========================================================================
describe('createProject — unique code conflict', () => {
  it('throws ConflictError on duplicate normalized code', async () => {
    const user = await createTestUser();

    await createProject({ code: 'UNIQUE-1', name: 'First' }, user.id);

    await expect(
      createProject({ code: 'UNIQUE-1', name: 'Duplicate' }, user.id)
    ).rejects.toThrow(ConflictError);
  });

  it('normalizes code before uniqueness check (case-insensitive)', async () => {
    const user = await createTestUser();

    await createProject({ code: 'my-code', name: 'First' }, user.id);

    // Same code different casing must still be a conflict
    await expect(
      createProject({ code: 'MY-CODE', name: 'Duplicate' }, user.id)
    ).rejects.toThrow(ConflictError);
  });

  it('does not create project or membership on code conflict', async () => {
    const user = await createTestUser();

    await createProject({ code: 'DUP-CHECK', name: 'First' }, user.id);
    const beforeProjectCount = await prisma.project.count();
    const beforeMemberCount = await prisma.projectMember.count();

    await expect(
      createProject({ code: 'DUP-CHECK', name: 'Duplicate' }, user.id)
    ).rejects.toThrow(ConflictError);

    // No new project or membership created
    const afterProjectCount = await prisma.project.count();
    const afterMemberCount = await prisma.projectMember.count();
    expect(afterProjectCount).toBe(beforeProjectCount);
    expect(afterMemberCount).toBe(beforeMemberCount);
  });
});

// ===========================================================================
// Test 4: Archive retention (non-destructive)
// ===========================================================================
describe('archiveProject — non-destructive archive', () => {
  it('sets project status to ARCHIVED and retains data', async () => {
    const user = await createTestUser();
    const { project } = await createTestProject(user.id, {
      code: 'ARCHIVE-1',
    });

    const archived = await archiveProject(project.id, user.id);

    expect(archived.project.status).toBe('ARCHIVED');
    expect(archived.project.id).toBe(project.id);

    // Data is retained in the database
    const dbProject = await prisma.project.findUnique({
      where: { id: project.id },
    });
    expect(dbProject).not.toBeNull();
    expect(dbProject!.status).toBe('ARCHIVED');
    expect(dbProject!.name).toBe(project.name);
  });

  it('preserves membership after archive', async () => {
    const user = await createTestUser();
    const { project } = await createTestProject(user.id, {
      code: 'ARCHIVE-MEM',
    });

    await archiveProject(project.id, user.id);

    // Membership still exists
    const membership = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: project.id,
        },
      },
    });
    expect(membership).not.toBeNull();
    expect(membership!.role).toBe('OWNER');
  });

  it('throws AuthorizationError when non-owner tries to archive', async () => {
    const owner = await createTestUser();
    const nonOwner = await createTestUser();
    const { project } = await createTestProject(owner.id, {
      code: 'ARCHIVE-NO',
    });

    // Add nonOwner as a member
    await prisma.projectMember.create({
      data: {
        userId: nonOwner.id,
        projectId: project.id,
        role: 'MEMBER',
      },
    });

    await expect(
      archiveProject(project.id, nonOwner.id)
    ).rejects.toThrow(AuthorizationError);

    // Project remains ACTIVE — not archived by non-owner
    const dbProject = await prisma.project.findUnique({ where: { id: project.id } });
    expect(dbProject).not.toBeNull();
    expect(dbProject!.status).toBe('ACTIVE');
    expect(dbProject!.code).toBe('ARCHIVE-NO');
    expect(dbProject!.ownerId).toBe(owner.id);
  });

  it('throws NotFoundError when archiving non-existent project', async () => {
    const user = await createTestUser();

    await expect(
      archiveProject('non-existent-id', user.id)
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when archiving already-archived project', async () => {
    const user = await createTestUser();
    const { project } = await createTestProject(user.id, {
      code: 'ARCHIVE-TWICE',
    });

    await archiveProject(project.id, user.id);

    await expect(
      archiveProject(project.id, user.id)
    ).rejects.toThrow(NotFoundError);
  });
});

// ===========================================================================
// Test 5: listProjects — member-scoped
// ===========================================================================
describe('listProjects — member-scoped listing', () => {
  it('returns projects where user is a member', async () => {
    const user = await createTestUser();
    await createTestProject(user.id, { code: 'LIST-1' });
    await createTestProject(user.id, { code: 'LIST-2' });

    const result = await listProjects(user.id);

    expect(result.projects).toHaveLength(2);
    expect(result.projects.map((p) => p.code).sort()).toEqual([
      'LIST-1',
      'LIST-2',
    ]);
  });

  it('returns empty array when user has no projects', async () => {
    const user = await createTestUser();

    const result = await listProjects(user.id);

    expect(result.projects).toHaveLength(0);
  });

  it('does not return projects where user is not a member', async () => {
    const user1 = await createTestUser();
    const user2 = await createTestUser();
    await createTestProject(user1.id, { code: 'USER1-ONLY' });

    const result = await listProjects(user2.id);

    expect(result.projects).toHaveLength(0);
  });
});

// ===========================================================================
// Test 6: getProjectById — member access
// ===========================================================================
describe('getProjectById — member access', () => {
  it('returns project when user is a member', async () => {
    const user = await createTestUser();
    const { project } = await createTestProject(user.id, {
      code: 'GET-1',
    });

    const result = await getProjectById(project.id, user.id);

    expect(result.project.id).toBe(project.id);
    expect(result.project.code).toBe('GET-1');
  });

  it('throws NotFoundError when user is not a member', async () => {
    const owner = await createTestUser();
    const nonMember = await createTestUser();
    const { project } = await createTestProject(owner.id, {
      code: 'GET-NONMEM',
    });

    await expect(
      getProjectById(project.id, nonMember.id)
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError for non-existent project', async () => {
    const user = await createTestUser();

    await expect(
      getProjectById('non-existent-id', user.id)
    ).rejects.toThrow(NotFoundError);
  });
});

// ===========================================================================
// Test 7: updateProject — owner-only
// ===========================================================================
describe('updateProject — owner-only mutation', () => {
  it('allows owner to update project name and description', async () => {
    const user = await createTestUser();
    const { project } = await createTestProject(user.id, {
      code: 'UPD-1',
    });

    const result = await updateProject(
      project.id,
      { name: 'Updated Name', description: 'Updated description' },
      user.id
    );

    expect(result.project.name).toBe('Updated Name');
    expect(result.project.description).toBe('Updated description');
    expect(result.project.code).toBe('UPD-1'); // code unchanged
  });

  it('throws AuthorizationError when non-owner tries to update', async () => {
    const owner = await createTestUser();
    const nonOwner = await createTestUser();
    const { project } = await createTestProject(owner.id, {
      code: 'UPD-NO',
    });

    // Add nonOwner as a member
    await prisma.projectMember.create({
      data: {
        userId: nonOwner.id,
        projectId: project.id,
        role: 'MEMBER',
      },
    });

    await expect(
      updateProject(project.id, { name: 'Hacked' }, nonOwner.id)
    ).rejects.toThrow(AuthorizationError);

    // Project remains unchanged in the database after 403
    const dbProject = await prisma.project.findUnique({ where: { id: project.id } });
    expect(dbProject).not.toBeNull();
    expect(dbProject!.name).toBe('Test Project');
    expect(dbProject!.code).toBe('UPD-NO');
    expect(dbProject!.ownerId).toBe(owner.id);
  });

  it('throws NotFoundError when updating non-existent project', async () => {
    const user = await createTestUser();

    await expect(
      updateProject('non-existent-id', { name: 'Nope' }, user.id)
    ).rejects.toThrow(NotFoundError);
  });

  it('throws NotFoundError when updating archived project', async () => {
    const user = await createTestUser();
    const { project } = await createTestProject(user.id, {
      code: 'UPD-ARCH',
    });

    await archiveProject(project.id, user.id);

    await expect(
      updateProject(project.id, { name: 'Nope' }, user.id)
    ).rejects.toThrow(NotFoundError);
  });
});
