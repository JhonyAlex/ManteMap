import { createProjectSchema, updateProjectSchema, type CreateProjectInput, type UpdateProjectInput } from '@mantemap/validation';
import { ConflictError, NotFoundError } from '@mantemap/shared';
import {
  createProjectWithOwner,
  findProjectByCode,
  findProjectById,
  findProjectsByMember,
  updateProject as updateProjectRepo,
  archiveProject as archiveProjectRepo,
  type ProjectRepositoryOptions,
} from '@/lib/repositories/project-repository';
import { runSerializable } from '@/lib/repositories/transaction-repository';
import { requireProjectMember, requireProjectOwner } from '@/lib/services/project-access-service';

/**
 * Testing seams forwarded to the repository.
 * Production code MUST NOT set these options.
 */
export type ProjectServiceOptions = Pick<ProjectRepositoryOptions, 'onBeforeCommit'>;

/**
 * Create a project with atomic owner membership.
 *
 * Business rules:
 *   - Any authenticated user can create a project.
 *   - Code is normalized to uppercase before uniqueness check.
 *   - Creator is atomically assigned as ownerId and ProjectMember(OWNER).
 *   - Duplicate normalized code throws ConflictError (409).
 *   - Transaction failure leaves neither project nor membership.
 *
 * @param input   - validated creation DTO (code already normalized by Zod)
 * @param ownerId - the authenticated user's ID
 * @param options - optional testing seams
 * @returns the created project (without exposing internal fields)
 */
export async function createProject(
  input: CreateProjectInput,
  ownerId: string,
  options?: ProjectServiceOptions
): Promise<{ project: { id: string; code: string; name: string; description: string | null; status: string; ownerId: string; createdAt: Date; updatedAt: Date } }> {
  // Validate and normalize
  const parsed = createProjectSchema.parse(input);

  // Check for duplicate code BEFORE the transaction
  const existing = await findProjectByCode(parsed.code);
  if (existing) {
    throw new ConflictError('A project with this code already exists');
  }

  // Serializable transaction: create project + owner membership atomically
  const { project } = await runSerializable(async (tx) => {
    return createProjectWithOwner(
      {
        code: parsed.code,
        name: parsed.name,
        description: parsed.description,
      },
      ownerId,
      tx,
      options
    );
  });

  return {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      description: project.description,
      status: project.status,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  };
}

/**
 * List projects where the authenticated user is a member.
 *
 * @param userId - the authenticated user's ID
 * @returns array of projects the user belongs to
 */
export async function listProjects(
  userId: string
): Promise<{ projects: Array<{ id: string; code: string; name: string; description: string | null; status: string; ownerId: string; createdAt: Date; updatedAt: Date }> }> {
  const projects = await findProjectsByMember(userId);

  return {
    projects: projects.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      status: p.status,
      ownerId: p.ownerId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  };
}

/**
 * Get a project by ID, scoped to membership.
 *
 * Non-members receive NotFoundError (404) to avoid disclosing project existence.
 *
 * @param projectId - the project ID
 * @param userId    - the authenticated user's ID
 * @returns the project data
 */
export async function getProjectById(
  projectId: string,
  userId: string
): Promise<{ project: { id: string; code: string; name: string; description: string | null; status: string; ownerId: string; createdAt: Date; updatedAt: Date } }> {
  // Delegate membership check to access service (handles 404 for non-members, including ADMIN)
  await requireProjectMember(projectId, userId);

  const project = await findProjectById(projectId);
  // requireProjectMember already verified existence, so project is non-null
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  return {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      description: project.description,
      status: project.status,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  };
}

/**
 * Update a project. Only the owner can update.
 *
 * @param projectId - the project ID
 * @param input     - validated update DTO
 * @param userId    - the authenticated user's ID
 * @returns the updated project
 */
export async function updateProject(
  projectId: string,
  input: UpdateProjectInput,
  userId: string
): Promise<{ project: { id: string; code: string; name: string; description: string | null; status: string; ownerId: string; createdAt: Date; updatedAt: Date } }> {
  // Validate input
  const parsed = updateProjectSchema.parse(input);

  // Check project exists and user is owner (delegates 404/403 to access service)
  await requireProjectOwner(projectId, userId);

  const project = await findProjectById(projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  // Archived projects cannot be updated
  if (project.status === 'ARCHIVED') {
    throw new NotFoundError('Project', projectId);
  }

  const updated = await updateProjectRepo(projectId, {
    name: parsed.name,
    description: parsed.description,
  });

  return {
    project: {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description,
      status: updated.status,
      ownerId: updated.ownerId,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  };
}

/**
 * Archive a project (non-destructive). Only the owner can archive.
 *
 * Sets status to ARCHIVED. Data is retained for future governed handling.
 * Archived projects cannot be updated or re-archived.
 *
 * @param projectId - the project ID
 * @param userId    - the authenticated user's ID
 * @returns the archived project
 */
export async function archiveProject(
  projectId: string,
  userId: string
): Promise<{ project: { id: string; code: string; name: string; description: string | null; status: string; ownerId: string; createdAt: Date; updatedAt: Date } }> {
  // Check project exists and user is owner (delegates 404/403 to access service)
  await requireProjectOwner(projectId, userId);

  const project = await findProjectById(projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  // Already archived — not found (idempotent-safe: don't disclose state)
  if (project.status === 'ARCHIVED') {
    throw new NotFoundError('Project', projectId);
  }

  const archived = await archiveProjectRepo(projectId);

  return {
    project: {
      id: archived.id,
      code: archived.code,
      name: archived.name,
      description: archived.description,
      status: archived.status,
      ownerId: archived.ownerId,
      createdAt: archived.createdAt,
      updatedAt: archived.updatedAt,
    },
  };
}
