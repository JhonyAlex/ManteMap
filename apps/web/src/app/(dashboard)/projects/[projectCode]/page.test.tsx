// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const { mockNotFound, mockPermanentRedirect } = vi.hoisted(() => ({
  mockNotFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  mockPermanentRedirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
  permanentRedirect: mockPermanentRedirect,
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/services/project-service', () => ({
  getProjectById: vi.fn(),
  resolveProjectId: vi.fn(),
}));

vi.mock('@/lib/services/metrics-service', () => ({
  getProjectMetrics: vi.fn(),
}));

vi.mock('@/components/project-settings', () => ({
  ProjectSettings: ({ projectId }: { projectId: string }) => (
    <div data-testid="project-settings">{projectId}</div>
  ),
}));

import ProjectPage from './page';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectById, resolveProjectId } from '@/lib/services/project-service';
import { getProjectMetrics } from '@/lib/services/metrics-service';

const mockGetCurrentUser = getCurrentUser as Mock;
const mockGetProjectById = getProjectById as Mock;
const mockResolveProjectId = resolveProjectId as Mock;
const mockGetProjectMetrics = getProjectMetrics as Mock;

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
    mockResolveProjectId.mockResolvedValue('proj-1');
    mockGetProjectById.mockResolvedValue({ project: mockProject });
    mockGetProjectMetrics.mockResolvedValue({
      totalItems: 3,
      activeAlerts: 1,
      documentsExpiringSoon: 2,
    });
  });

  it('renders the project hub for the canonical code URL', async () => {
    const ui = await ProjectPage({
      params: Promise.resolve({ projectCode: 'ALPHA' }),
    });
    render(ui);

    expect(screen.getByText('Test project description')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Quick Actions' })).toBeInTheDocument();
    expect(screen.getByTestId('project-settings')).toHaveTextContent('proj-1');
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });

  it('resolves the route parameter before loading membership-scoped data', async () => {
    await ProjectPage({ params: Promise.resolve({ projectCode: 'ALPHA' }) });

    expect(mockResolveProjectId).toHaveBeenCalledWith('ALPHA');
    expect(mockGetProjectById).toHaveBeenCalledWith('proj-1', 'user-1');
  });

  it('uses the canonical project code in quick-action links', async () => {
    const ui = await ProjectPage({
      params: Promise.resolve({ projectCode: 'ALPHA' }),
    });
    render(ui);

    expect(screen.getByRole('link', { name: /dashboard/i })).toHaveAttribute(
      'href',
      '/projects/ALPHA/dashboard'
    );
  });

  it('permanently redirects a legacy CUID base URL to the code URL', async () => {
    await expect(
      ProjectPage({ params: Promise.resolve({ projectCode: 'proj-1' }) })
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockResolveProjectId).toHaveBeenCalledWith('proj-1');
    expect(mockPermanentRedirect).toHaveBeenCalledWith('/projects/ALPHA');
  });

  it('returns not-found for an unauthenticated request without resolving the project', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(
      ProjectPage({ params: Promise.resolve({ projectCode: 'ALPHA' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockResolveProjectId).not.toHaveBeenCalled();
  });

  it('returns not-found when the code or CUID cannot be resolved', async () => {
    const { NotFoundError } = await import('@mantemap/shared');
    mockResolveProjectId.mockRejectedValue(new NotFoundError('Project', 'missing'));

    await expect(
      ProjectPage({ params: Promise.resolve({ projectCode: 'missing' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(mockGetProjectById).not.toHaveBeenCalled();
  });

  it('does not leak project content when membership lookup returns not-found', async () => {
    const { NotFoundError } = await import('@mantemap/shared');
    mockGetProjectById.mockRejectedValue(new NotFoundError('Project', 'proj-1'));

    await expect(
      ProjectPage({ params: Promise.resolve({ projectCode: 'ALPHA' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');

    expect(screen.queryByText('Test project description')).not.toBeInTheDocument();
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
  });
});
