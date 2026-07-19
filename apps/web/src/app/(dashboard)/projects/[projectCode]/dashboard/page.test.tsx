// @vitest-environment jsdom
/**
 * RED tests for Project Dashboard page.
 *
 * Verifies:
 *   - Authorized member sees KPIs, activity timeline, and export links
 *   - Non-member gets 404 (via notFound)
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "Project Dashboard Metrics" — authorized KPIs+timeline
 *   "Non-member cannot access project dashboard" — 404
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));

// Mock auth/session
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock metrics-service
vi.mock('@/lib/services/metrics-service', () => ({
  getProjectMetrics: vi.fn(),
  getRecentActivity: vi.fn(),
}));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn(),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

import ProjectDashboardPage from './page';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectMetrics, getRecentActivity } from '@/lib/services/metrics-service';
import { resolveProjectId } from '@/lib/services/project-service';
import { useSession } from 'next-auth/react';

const mockGetCurrentUser = getCurrentUser as Mock;
const mockGetProjectMetrics = getProjectMetrics as Mock;
const mockGetRecentActivity = getRecentActivity as Mock;
const mockResolveProjectId = resolveProjectId as Mock;
const mockUseSession = useSession as Mock;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'TECHNICIAN',
};

const mockMetrics = {
  totalItems: 42,
  statusCounts: [
    { statusId: 's1', name: 'Active', count: 30 },
  ],
  unassignedItems: 12,
  activeAlerts: 5,
  alertSeverityCounts: [
    { severity: 'WARNING', count: 3 },
    { severity: 'CRITICAL', count: 2 },
  ],
  totalDocuments: 18,
  documentsExpiringSoon: 3,
  upcomingEvents: 7,
  activeLocations: 12,
};

const mockActivity = [
  {
    id: 'item-1',
    kind: 'item_created',
    title: 'Pump A',
    href: '/projects/proj-1/items/item-1',
    timestamp: new Date('2026-07-18T10:00:00Z'),
  },
];

describe('ProjectDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockResolveProjectId.mockResolvedValue('proj-1');
    mockGetProjectMetrics.mockResolvedValue(mockMetrics);
    mockGetRecentActivity.mockResolvedValue(mockActivity);
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      status: 'authenticated',
    });
  });

  it('renders project metrics for authorized member', async () => {
    const ui = await ProjectDashboardPage({
      params: Promise.resolve({ projectCode: 'ALPHA' }),
    });
    render(ui);

    // KPI values should be visible
    expect(screen.getByText('42')).toBeInTheDocument(); // total items
    expect(screen.getByText('5')).toBeInTheDocument(); // active alerts
    expect(screen.getByText('18')).toBeInTheDocument(); // total documents
  });

  it('renders activity timeline', async () => {
    const ui = await ProjectDashboardPage({
      params: Promise.resolve({ projectCode: 'ALPHA' }),
    });
    render(ui);

    expect(screen.getByText('Pump A')).toBeInTheDocument();
  });

  it('renders CSV export links', async () => {
    const ui = await ProjectDashboardPage({
      params: Promise.resolve({ projectCode: 'ALPHA' }),
    });
    render(ui);

    expect(screen.getByRole('link', { name: /export items/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /export documents/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /export alerts/i })).toBeInTheDocument();
  });

  it('calls getProjectMetrics with correct project and user IDs', async () => {
    await ProjectDashboardPage({
      params: Promise.resolve({ projectCode: 'ALPHA' }),
    });

    expect(mockGetProjectMetrics).toHaveBeenCalledWith('proj-1', 'user-1');
    expect(mockResolveProjectId).toHaveBeenCalledWith('ALPHA');
  });

  it('calls getRecentActivity with correct project and user IDs', async () => {
    await ProjectDashboardPage({
      params: Promise.resolve({ projectCode: 'ALPHA' }),
    });

    expect(mockGetRecentActivity).toHaveBeenCalledWith('proj-1', 'user-1');
  });

  it('shows not-found for non-member', async () => {
    const { NotFoundError } = await import('@mantemap/shared');
    mockGetProjectMetrics.mockRejectedValue(new NotFoundError('Project', 'proj-999'));

    await expect(
      ProjectDashboardPage({
        params: Promise.resolve({ projectCode: 'UNKNOWN' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renders a page heading', async () => {
    const ui = await ProjectDashboardPage({
      params: Promise.resolve({ projectCode: 'ALPHA' }),
    });
    render(ui);

    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
