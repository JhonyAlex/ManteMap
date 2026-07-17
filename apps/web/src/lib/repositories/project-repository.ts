import prisma from '@mantemap/database';
import type { Project, ProjectMember, PrismaClient } from '@mantemap/database';

/**
 * Testing seams for project repository operations.
 * Production code MUST NOT set these options.
 */
export interface ProjectRepositoryOptions {
  /** Called after the transaction callback returns but before commit. */
  onBeforeCommit?: () => void;
}

/**
 * Create a project with atomic owner membership in a single transaction.
 *
 * The transaction creates:
 *   1. The Project record with ownerId set to the creator
 *   2. A ProjectMember record with role OWNER for the creator
 *
 * Both writes succeed or both are rolled back.
 *
 * @param data     - validated project data (code already normalized)
 * @param ownerId  - the authenticated user creating the project
 * @param tx       - optional transaction client (for nested transactions)
 * @param options  - optional testing seams
 * @returns the created project and membership
 */
export async function createProjectWithOwner(
  data: { code: string; name: string; description?: string },
  ownerId: string,
  tx?: PrismaClient,
  options?: ProjectRepositoryOptions
): Promise<{ project: Project; membership: ProjectMember }> {
  const client = tx ?? prisma;

  const project = await client.project.create({
    data: {
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      ownerId,
    },
  });

  const membership = await client.projectMember.create({
    data: {
      userId: ownerId,
      projectId: project.id,
      role: 'OWNER',
    },
  });

  // Testing seam: inject failure before commit
  if (options?.onBeforeCommit) {
    options.onBeforeCommit();
  }

  return { project, membership };
}

/**
 * Find a project by its unique code.
 * Returns null when no project matches.
 */
export async function findProjectByCode(
  code: string,
  tx?: PrismaClient
): Promise<Project | null> {
  const client = tx ?? prisma;
  return client.project.findUnique({
    where: { code },
  });
}

/**
 * Find a project by ID.
 * Returns null when no project matches.
 */
export async function findProjectById(
  id: string,
  tx?: PrismaClient
): Promise<Project | null> {
  const client = tx ?? prisma;
  return client.project.findUnique({
    where: { id },
  });
}

/**
 * List projects where the user is a member.
 * Returns projects ordered by creation date (newest first).
 */
export async function findProjectsByMember(
  userId: string,
  tx?: PrismaClient
): Promise<Project[]> {
  const client = tx ?? prisma;
  const memberships = await client.projectMember.findMany({
    where: { userId },
    include: { project: true },
    orderBy: { project: { createdAt: 'desc' } },
  });
  return memberships.map((m) => m.project);
}

/**
 * Check if a user is a member of a project.
 */
export async function isProjectMember(
  userId: string,
  projectId: string,
  tx?: PrismaClient
): Promise<boolean> {
  const client = tx ?? prisma;
  const membership = await client.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
  });
  return membership !== null;
}

/**
 * Check if a user is the OWNER of a project.
 */
export async function isProjectOwner(
  userId: string,
  projectId: string,
  tx?: PrismaClient
): Promise<boolean> {
  const client = tx ?? prisma;
  const membership = await client.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
  });
  return membership?.role === 'OWNER';
}

/**
 * Update a project's mutable fields.
 * Only name and description can be updated; code and ownerId are immutable.
 */
export async function updateProject(
  id: string,
  data: { name?: string; description?: string },
  tx?: PrismaClient
): Promise<Project> {
  const client = tx ?? prisma;
  return client.project.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
  });
}

/**
 * Archive a project (non-destructive).
 * Sets status to ARCHIVED; data is retained for future governed handling.
 */
export async function archiveProject(
  id: string,
  tx?: PrismaClient
): Promise<Project> {
  const client = tx ?? prisma;
  return client.project.update({
    where: { id },
    data: { status: 'ARCHIVED' },
  });
}
