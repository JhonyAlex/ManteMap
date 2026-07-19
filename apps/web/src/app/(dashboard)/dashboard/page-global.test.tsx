// @vitest-environment jsdom
/**
 * RED tests for Global Dashboard page modifications.
 *
 * Verifies:
 *   - Renders cross-project summaries when user has projects
 *   - Shows empty state when user has no projects
 *   - Each summary card shows project metrics
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "Cross-Project Summary Dashboard" — per-project summaries, empty state
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

const mockProjects = [
  { id: 'proj-1', code: 'ALPHA', name: 'Alpha Project', description: 'Test', status: 'ACTIVE', ownerId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
  { id: 'proj-2', code: 'BETA', name: 'Beta Project', description: 'Test', status: 'ACTIVE', ownerId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
];

const mockMetrics = {
  totalItems: 42,
  statusCounts: [],
  unassignedItems: 0,
  activeAlerts: 3,
  alertSeverityCounts: [],
  totalDocuments: 10,
  documentsExpiringSoon: 2,
  upcomingEvents: 5,
  activeLocations: 8,
};

describe('Global Dashboard Page — Cross-Project Summaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetDashboardProjects.mockResolvedValue({ projects: mockProjects });
    mockGetProjectMetrics.mockResolvedValue(mockMetrics);
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      status: 'authenticated',
    });
  });

  it('renders project summary cards for each project', async () => {
    const ui = await DashboardPage();
    render(ui);

    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
    expect(screen.getByText('Beta Project')).toBeInTheDocument();
  });

  it('shows empty state when user has no projects', async () => {
    mockGetDashboardProjects.mockResolvedValue({ projects: [] });

    const ui = await DashboardPage();
    render(ui);

    expect(screen.getByText(/don't have any projects/i)).toBeInTheDocument();
  });

  it('renders project codes in summary cards', async () => {
    const ui = await DashboardPage();
    render(ui);

    expect(screen.getByText('ALPHA')).toBeInTheDocument();
    expect(screen.getByText('BETA')).toBeInTheDocument();
  });
});
