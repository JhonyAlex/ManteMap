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

// Mock project service
vi.mock('@/lib/services/project-service', () => ({
  listProjects: vi.fn(),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

import DashboardPage from './page';
import { getCurrentUser } from '@/lib/auth/session';
import { listProjects } from '@/lib/services/project-service';
import { useSession } from 'next-auth/react';

const mockGetCurrentUser = getCurrentUser as Mock;
const mockListProjects = listProjects as Mock;
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
    mockListProjects.mockResolvedValue({ projects: [] });
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
    mockListProjects.mockResolvedValue({ projects: [] });

    const ui = await DashboardPage();
    render(ui);

    expect(screen.getByText(/don't have any projects/i)).toBeInTheDocument();
  });

  it('renders project cards when user has projects', async () => {
    mockListProjects.mockResolvedValue({
      projects: [
        { id: 'proj-1', code: 'ALPHA', name: 'Alpha Project', description: 'Test', status: 'ACTIVE', ownerId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
      ],
    });

    const ui = await DashboardPage();
    render(ui);

    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
  });

  it('calls listProjects with the current user ID', async () => {
    await DashboardPage();

    expect(mockListProjects).toHaveBeenCalledWith('user-1');
  });
});
