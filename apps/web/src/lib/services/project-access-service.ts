/**
 * Project access control service.
 *
 * Provides server-authoritative authorization guards for project-scoped operations.
 * Every scoped project handler MUST call these guards before performing mutations.
 *
 * Design decision: ADMIN role has NO implicit project bypass.
 * Access is determined solely by ProjectMember records.
 *
 * Spec: specs/project-access-control/spec.md
 */

import { NotFoundError, AuthorizationError } from '@mantemap/shared';
import {
  isProjectMember,
  isProjectOwner,
  findProjectById,
} from '@/lib/repositories/project-repository';

/**
 * Require the user to be a member of the project.
 *
 * Non-members receive NotFoundError (404) to avoid disclosing project existence.
 * This applies to ALL roles including ADMIN — no implicit bypass.
 *
 * @param projectId - the project ID to check
 * @param userId    - the authenticated user's ID
 * @throws NotFoundError if the project doesn't exist or the user is not a member
 */
export async function requireProjectMember(
  projectId: string,
  userId: string
): Promise<void> {
  // Check project exists first
  const project = await findProjectById(projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  // Check membership — ADMIN role does NOT bypass this check
  const isMember = await isProjectMember(userId, projectId);
  if (!isMember) {
    throw new NotFoundError('Project', projectId);
  }
}

/**
 * Require the user to be the OWNER of the project.
 *
 * Authorization boundary:
 *   - Non-members → NotFoundError (404) — project existence hidden
 *   - Members who are not owner → AuthorizationError (403)
 *   - Owner → success (no error)
 *
 * This applies to ALL roles including ADMIN — no implicit bypass.
 *
 * @param projectId - the project ID to check
 * @param userId    - the authenticated user's ID
 * @throws NotFoundError if the project doesn't exist or the user is not a member
 * @throws AuthorizationError if the user is a member but not the owner
 */
export async function requireProjectOwner(
  projectId: string,
  userId: string
): Promise<void> {
  // Check project exists first
  const project = await findProjectById(projectId);
  if (!project) {
    throw new NotFoundError('Project', projectId);
  }

  // Check membership first — hide project from non-members
  const isMember = await isProjectMember(userId, projectId);
  if (!isMember) {
    throw new NotFoundError('Project', projectId);
  }

  // Check ownership — members who are not owner get 403
  const isOwner = await isProjectOwner(userId, projectId);
  if (!isOwner) {
    throw new AuthorizationError('Only the project owner can perform this action');
  }
}
