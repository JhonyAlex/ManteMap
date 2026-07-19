// @vitest-environment jsdom
/**
 * RED tests for Project page.
 *
 * Verifies:
 *   - Renders project details for accessible projects
 *   - Shows not-found for inaccessible projects (non-member)
 *   - Shows not-found for non-existent projects
 *   - No project data is leaked to non-members
 *
 * Spec: specs/application-shell/spec.md — "Inaccessible context"
 * Design: design.md — "Non-members receive 404 to avoid disclosing project existence"
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

// Mock project service
vi.mock('@/lib/services/project-service', () => ({
  getProjectById: vi.fn(),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
}));

import ProjectPage from './page';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectById } from '@/lib/services/project-service';
import { useSession } from 'next-auth/react';

const mockGetCurrentUser = getCurrentUser as Mock;
const mockGetProjectById = getProjectById as Mock;
const mockUseSession = useSession as Mock;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'TECHNICIAN',
};

const mockProject = {
  id: 'proj-1',
  code: 'ALPHA',
  name: 'Alpha Project',
  description: 'Test project description',
  status: 'ACTIVE',
  ownerId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('ProjectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockUseSession.mockReturnValue({
      data: { user: mockUser },
      status: 'authenticated',
    });
  });

  it('renders project name for accessible projects', async () => {
    mockGetProjectById.mockResolvedValue({ project: mockProject });

    const ui = await ProjectPage({ params: Promise.resolve({ projectId: 'proj-1' }) });
    render(ui);

    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
  });

  it('renders project code for accessible projects', async () => {
    mockGetProjectById.mockResolvedValue({ project: mockProject });

    const ui = await ProjectPage({ params: Promise.resolve({ projectId: 'proj-1' }) });
    render(ui);

    // Code appears in both the header badge and the details section
    const codeElements = screen.getAllByText('ALPHA');
    expect(codeElements.length).toBeGreaterThanOrEqual(1);
  });

  it('calls getProjectById with correct project and user IDs', async () => {
    mockGetProjectById.mockResolvedValue({ project: mockProject });

    await ProjectPage({ params: Promise.resolve({ projectId: 'proj-1' }) });

    expect(mockGetProjectById).toHaveBeenCalledWith('proj-1', 'user-1');
  });

  it('shows not-found for inaccessible projects (non-member)', async () => {
    // getProjectById throws NotFoundError for non-members (hides project existence)
    const { NotFoundError } = await import('@mantemap/shared');
    mockGetProjectById.mockRejectedValue(new NotFoundError('Project', 'proj-999'));

    await expect(
      ProjectPage({ params: Promise.resolve({ projectId: 'proj-999' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('shows not-found for non-existent projects', async () => {
    const { NotFoundError } = await import('@mantemap/shared');
    mockGetProjectById.mockRejectedValue(new NotFoundError('Project', 'nonexistent'));

    await expect(
      ProjectPage({ params: Promise.resolve({ projectId: 'nonexistent' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('does not leak project data to non-members', async () => {
    const { NotFoundError } = await import('@mantemap/shared');
    mockGetProjectById.mockRejectedValue(new NotFoundError('Project', 'proj-999'));

    try {
      await ProjectPage({ params: Promise.resolve({ projectId: 'proj-999' }) });
    } catch {
      // Expected — not-found is thrown
    }

    // The page should NOT render any project content
    expect(screen.queryByText('Alpha Project')).not.toBeInTheDocument();
    expect(screen.queryByText('ALPHA')).not.toBeInTheDocument();
  });
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
});