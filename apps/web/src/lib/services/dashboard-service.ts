import { cache } from 'react';
import { listProjects } from '@/lib/services/project-service';

/**
 * Request-scoped dashboard data. Layout and page call this independently,
 * but React cache shares the membership query during one server render.
 */
export const getDashboardProjects = cache(async (userId: string) => {
  return listProjects(userId);
});
