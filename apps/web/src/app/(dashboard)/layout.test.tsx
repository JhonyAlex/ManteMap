// @vitest-environment jsdom
/**
 * RED tests for dashboard layout.
 *
 * Verifies:
 *   - Renders a skip-to-content link
 *   - Renders a main landmark
 *   - Renders sidebar with accessible projects
 *   - Renders breadcrumbs
 *   - Sidebar gets projects from server-side auth check
 *
 * Spec: specs/application-shell/spec.md
 * Design: design.md — "Server Components by default"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

// Mock the auth/session module (server-side)
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock the project service
vi.mock('@/lib/services/project-service', () => ({
  listProjects: vi.fn(),
}));

// Mock next/dynamic or child components that are client-only
vi.mock('@/components/layout/sidebar', () => ({
  Sidebar: ({ projects }: { projects: Array<{ id: string; code: string; name: string }> }) => (
    <nav aria-label="Projects" data-testid="sidebar">
      {projects.length === 0 ? (
        <p>No projects</p>
      ) : (
        <ul>
          {projects.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>
      )}
    </nav>
  ),
}));

vi.mock('@/components/layout/breadcrumbs', () => ({
  Breadcrumbs: () => (
    <nav aria-label="Breadcrumb" data-testid="breadcrumbs">
      <ol>
        <li>Dashboard</li>
      </ol>
    </nav>
  ),
}));

import DashboardLayout from './layout';
import { getCurrentUser } from '@/lib/auth/session';
import { listProjects } from '@/lib/services/project-service';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

const mockGetCurrentUser = getCurrentUser as Mock;
const mockListProjects = listProjects as Mock;
const mockUsePathname = usePathname as Mock;
const mockUseSession = useSession as Mock;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'TECHNICIAN',
};

const mockProjects = [
  { id: 'proj-1', code: 'ALPHA', name: 'Alpha Project', description: null, status: 'ACTIVE', ownerId: 'user-1', createdAt: new Date(), updatedAt: new Date() },
];

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockListProjects.mockResolvedValue({ projects: mockProjects });
    mockUsePathname.mockReturnValue('/dashboard');
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      status: 'authenticated',
    });
  });

  it('renders a skip-to-content link', async () => {
    const ui = await DashboardLayout({ children: <div>Content</div> });
    render(ui);

    const skipLink = screen.getByRole('link', { name: /skip to content/i });
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute('href', '#content');
  });

  it('renders a main landmark with id="content"', async () => {
    const ui = await DashboardLayout({ children: <div>Content</div> });
    render(ui);

    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'content');
  });

  it('renders children inside main', async () => {
    const ui = await DashboardLayout({ children: <div>Child Content</div> });
    render(ui);

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });

  it('renders the sidebar with accessible projects', async () => {
    const ui = await DashboardLayout({ children: <div>Content</div> });
    render(ui);

    const sidebars = screen.getAllByTestId('sidebar');
    expect(sidebars.length).toBe(1);
    const alphaTexts = screen.getAllByText('Alpha Project');
    expect(alphaTexts.length).toBe(1);
  });

  it('renders breadcrumbs', async () => {
    const ui = await DashboardLayout({ children: <div>Content</div> });
    render(ui);

    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
  });

  it('calls listProjects with the current user ID', async () => {
    await DashboardLayout({ children: <div>Content</div> });

    expect(mockListProjects).toHaveBeenCalledWith('user-1');
  });

  it('renders the membership-scoped background with an id for drawer inertness', async () => {
    const ui = await DashboardLayout({ children: <div>Content</div> });
    render(ui);

    expect(document.getElementById('dashboard-background')).toBeInTheDocument();
  });
});
