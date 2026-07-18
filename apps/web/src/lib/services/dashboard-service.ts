import { cache } from 'react';
import { listProjects } from '@/lib/services/project-service';
import { getProjectMetrics } from '@/lib/services/metrics-service';

/**
 * Request-scoped dashboard data. Layout and page call this independently,
 * but React cache shares the membership query during one server render.
 */
export const getDashboardProjects = cache(async (userId: string) => {
  return listProjects(userId);
});

/**
 * Cross-project metrics summary for the global dashboard.
 *
 * Fetches per-project metrics for all accessible projects concurrently.
 * Projects whose metrics fetch fails are silently skipped.
 *
 * @param userId - the authenticated user's ID
 */
export async function getCrossProjectMetrics(userId: string) {
  const { projects } = await getDashboardProjects(userId);

  if (projects.length === 0) {
    return [];
  }

  const results = await Promise.allSettled(
    projects.map(async (project) => {
      const metrics = await getProjectMetrics(project.id, userId);
      return {
        projectId: project.id,
        projectCode: project.code,
        projectName: project.name,
        totalItems: metrics.totalItems,
        activeAlerts: metrics.activeAlerts,
        documentsExpiringSoon: metrics.documentsExpiringSoon,
      };
    })
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<{
        projectId: string;
        projectCode: string;
        projectName: string;
        totalItems: number;
        activeAlerts: number;
        documentsExpiringSoon: number;
      }> => r.status === 'fulfilled'
    )
    .map((r) => r.value);
}
