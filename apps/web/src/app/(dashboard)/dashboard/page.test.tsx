// @vitest-environment jsdom
/**
 * RED tests for Dashboard page.
 *
 * Verifies:
 *   - Renders a welcome message with user context
 *   - Renders a heading
 *   - Shows project count or empty state
 *
 * Spec: specs/application-shell/spec.md — "Authenticated workspace navigation"
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  redirect: vi.fn(() => { throw new Error('NEXT_REDIRECT'); }),
}));

// Mock auth/session
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock dashboard service
vi.mock('@/lib/services/dashboard-service', () => ({
  getDashboardProjects: vi.fn(),
}));

// Mock metrics service
vi.mock('@/lib/services/metrics-service', () => ({
  getProjectMetrics: vi.fn(),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

import DashboardPage from './page';
import { getCurrentUser } from '@/lib/auth/session';
import { getDashboardProjects } from '@/lib/services/dashboard-service';
import { getProjectMetrics } from '@/lib/services/metrics-service';
import { useSession } from 'next-auth/react';

const mockGetCurrentUser = getCurrentUser as Mock;
const mockGetDashboardProjects = getDashboardProjects as Mock;
const mockGetProjectMetrics = getProjectMetrics as Mock;
const mockUseSession = useSession as Mock;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'TECHNICIAN',
};

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetDashboardProjects.mockResolvedValue({ projects: [] });
    mockGetProjectMetrics.mockResolvedValue({
      totalItems: 10,
      statusCounts: [],
      unassignedItems: 0,
      activeAlerts: 2,
      alertSeverityCounts: [],
      totalDocuments: 5,
      documentsExpiringSoon: 1,
      upcomingEvents: 3,
      activeLocations: 4,
    });
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      status: 'authenticated',
    });
  });

  it('renders a heading', async () => {
    const ui = await DashboardPage();
    render(ui);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('renders welcome content with user name', async () => {
    const ui = await DashboardPage();
    render(ui);

    expect(screen.getByText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/welcome back.*test user/i)).toBeInTheDocument();
  });

  it('shows empty state when user has no projects', async () => {
    mockGetDashboardProjects.mockResolvedValue({ projects: [] });

    const ui = await DashboardPage();
    render(ui);

    expect(screen.getByText(/don't have any projects/i)).toBeInTheDocument();
  });

  it('renders project summary cards when user has projects', async () => {
    mockGetDashboardProjects.mockResolvedValue({
      projects: [
        { id: 'proj-1', code: 'ALPHA', name: 'Alpha Project' },
      ],
    });

    const ui = await DashboardPage();
    render(ui);

    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    expect(screen.getByText('ALPHA')).toBeInTheDocument();
  });

  it('calls getDashboardProjects with the current user ID', async () => {
    await DashboardPage();

    expect(mockGetDashboardProjects).toHaveBeenCalledWith('user-1');
  });
});
