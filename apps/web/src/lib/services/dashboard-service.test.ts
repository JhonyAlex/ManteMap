import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react', () => ({
  cache: (fn: (userId: string) => Promise<unknown>) => {
    const results = new Map<string, Promise<unknown>>();
    return (userId: string) => {
      const cached = results.get(userId);
      if (cached) return cached;
      const result = fn(userId);
      results.set(userId, result);
      return result;
    };
  },
}));

vi.mock('@/lib/services/project-service', () => ({
  listProjects: vi.fn(),
}));

import { listProjects } from '@/lib/services/project-service';
import { getDashboardProjects } from './dashboard-service';

describe('getDashboardProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (listProjects as ReturnType<typeof vi.fn>).mockResolvedValue({ projects: [] });
  });

  it('uses the membership-scoped project service for the dashboard data flow', async () => {
    await getDashboardProjects('user-1');

    expect(listProjects).toHaveBeenCalledWith('user-1');
  });

  it('shares the same cached lookup for repeated calls in one server render', async () => {
    await Promise.all([getDashboardProjects('user-2'), getDashboardProjects('user-2')]);

    expect(listProjects).toHaveBeenCalledTimes(1);
  });
});
