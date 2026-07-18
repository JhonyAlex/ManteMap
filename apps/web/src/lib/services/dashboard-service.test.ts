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

vi.mock('@/lib/services/metrics-service', () => ({
  getProjectMetrics: vi.fn(),
}));

import { listProjects } from '@/lib/services/project-service';
import { getProjectMetrics } from '@/lib/services/metrics-service';
import { getDashboardProjects, getCrossProjectMetrics } from './dashboard-service';

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

describe('getCrossProjectMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns per-project metrics for accessible projects', async () => {
    // listProjects must be set BEFORE getCrossProjectMetrics calls getDashboardProjects
    (listProjects as ReturnType<typeof vi.fn>).mockResolvedValue({
      projects: [
        { id: 'proj-1', code: 'ALPHA', name: 'Alpha' },
        { id: 'proj-2', code: 'BETA', name: 'Beta' },
      ],
    });
    (getProjectMetrics as ReturnType<typeof vi.fn>).mockResolvedValue({
      totalItems: 10,
      activeAlerts: 2,
      documentsExpiringSoon: 1,
    });

    const result = await getCrossProjectMetrics('user-3');

    expect(result).toHaveLength(2);
    expect(result[0].projectId).toBe('proj-1');
    expect(result[0].projectName).toBe('Alpha');
    expect(result[0].totalItems).toBe(10);
  });

  it('returns empty array when user has no projects', async () => {
    (listProjects as ReturnType<typeof vi.fn>).mockResolvedValue({ projects: [] });

    const result = await getCrossProjectMetrics('user-4');

    expect(result).toEqual([]);
  });

  it('skips projects where metrics fetch fails', async () => {
    (listProjects as ReturnType<typeof vi.fn>).mockResolvedValue({
      projects: [
        { id: 'proj-1', code: 'ALPHA', name: 'Alpha' },
        { id: 'proj-2', code: 'BETA', name: 'Beta' },
      ],
    });
    (getProjectMetrics as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        totalItems: 10,
        activeAlerts: 2,
        documentsExpiringSoon: 1,
      })
      .mockRejectedValueOnce(new Error('DB error'));

    const result = await getCrossProjectMetrics('user-5');

    expect(result).toHaveLength(1);
    expect(result[0].projectId).toBe('proj-1');
  });
});
