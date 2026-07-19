// @vitest-environment jsdom
/**
 * RED tests for Project layout — breadcrumbs with entity maps.
 *
 * Verifies:
 *   - Breadcrumbs component receives entityMaps with resolved names
 *   - Project header still renders (backward compat)
 *
 * Spec: specs/application-shell/spec.md — "Breadcrumb name resolution"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

// Mock auth/session
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock project service
vi.mock('@/lib/services/project-service', () => ({
  getProjectById: vi.fn(),
}));

// Mock repositories
vi.mock('@/lib/repositories/floor-plan-repository', () => ({
  findFloorPlansByProject: vi.fn(),
}));

vi.mock('@/lib/repositories/item-type-repository', () => ({
  findItemTypesByProject: vi.fn(),
}));

vi.mock('@/lib/repositories/location-repository', () => ({
  findLocationsByProject: vi.fn(),
}));

// Mock prisma
vi.mock('@mantemap/database', () => {
  const mockPrisma = {
    item: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
  };
  return { default: mockPrisma };
  resolveProjectId: vi.fn((id: string) => Promise.resolve(id)),
});

// Mock shared error
vi.mock('@mantemap/shared', () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(entity: string, id: string) {
      super(`${entity} ${id} not found`);
      this.name = 'NotFoundError';
    }
  },
}));

// Mock the Breadcrumbs component to capture its props
vi.mock('@/components/layout/breadcrumbs', () => ({
  Breadcrumbs: ({
    entityMaps,
    projectNames,
  }: {
    entityMaps?: Record<string, Record<string, string>>;
    projectNames?: Record<string, string>;
  }) => (
    <nav aria-label="Breadcrumb" data-testid="breadcrumbs">
      <span data-testid="breadcrumbs-entity-maps">
        {JSON.stringify(entityMaps)}
      </span>
      <span data-testid="breadcrumbs-project-names">
        {JSON.stringify(projectNames)}
      </span>
    </nav>
  ),
}));

// Mock AlertBell (not relevant to breadcrumbs)
vi.mock('@/components/alerts/alert-bell', () => ({
  AlertBell: () => <div data-testid="alert-bell" />,
}));

import ProjectLayout from './layout';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectById } from '@/lib/services/project-service';
import { findFloorPlansByProject } from '@/lib/repositories/floor-plan-repository';
import { findItemTypesByProject } from '@/lib/repositories/item-type-repository';
import { findLocationsByProject } from '@/lib/repositories/location-repository';
import prisma from '@mantemap/database';

const mockGetCurrentUser = getCurrentUser as Mock;
const mockGetProjectById = getProjectById as Mock;
const mockFindFloorPlansByProject = findFloorPlansByProject as Mock;
const mockFindItemTypesByProject = findItemTypesByProject as Mock;
const mockFindLocationsByProject = findLocationsByProject as Mock;

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
};

describe('ProjectLayout — breadcrumbs with entity maps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockGetProjectById.mockResolvedValue({ project: mockProject });
    mockFindFloorPlansByProject.mockResolvedValue([]);
    mockFindItemTypesByProject.mockResolvedValue([]);
    mockFindLocationsByProject.mockResolvedValue([]);
    (prisma.item.findMany as Mock).mockResolvedValue([]);
    (prisma.event.findMany as Mock).mockResolvedValue([]);
  });

  it('renders the project name in header', async () => {
    const ui = await ProjectLayout({
      children: <div>Content</div>,
      params: Promise.resolve({ projectId: 'proj-1' }),
    });
    render(ui);

    expect(screen.getByText('Alpha Project')).toBeInTheDocument();
  });

  it('renders breadcrumbs component', async () => {
    const ui = await ProjectLayout({
      children: <div>Content</div>,
      params: Promise.resolve({ projectId: 'proj-1' }),
    });
    render(ui);

    expect(screen.getByTestId('breadcrumbs')).toBeInTheDocument();
  });

  it('passes project name to breadcrumbs projectNames', async () => {
    const ui = await ProjectLayout({
      children: <div>Content</div>,
      params: Promise.resolve({ projectId: 'proj-1' }),
    });
    render(ui);

    const projectNamesStr =
      screen.getByTestId('breadcrumbs-project-names').textContent;
    const parsed = JSON.parse(projectNamesStr ?? '{}');
    expect(parsed['proj-1']).toBe('Alpha Project');
  });

  it('passes empty entity maps when no entities exist', async () => {
    const ui = await ProjectLayout({
      children: <div>Content</div>,
      params: Promise.resolve({ projectId: 'proj-1' }),
    });
    render(ui);

    const entityMapsStr =
      screen.getByTestId('breadcrumbs-entity-maps').textContent;
    const parsed = JSON.parse(entityMapsStr ?? '{}');
    expect(parsed.floorPlans).toEqual({});
    expect(parsed.items).toEqual({});
    expect(parsed.itemTypes).toEqual({});
    expect(parsed.locations).toEqual({});
    expect(parsed.events).toEqual({});
  });

  it('passes resolved entity maps when entities exist', async () => {
    mockFindFloorPlansByProject.mockResolvedValue([
      { id: 'fp-1', name: 'Ground Floor' },
    ]);
    mockFindItemTypesByProject.mockResolvedValue([
      { id: 'it-1', name: 'Fire Equipment' },
    ]);
    mockFindLocationsByProject.mockResolvedValue([
      { id: 'loc-1', name: 'Building A' },
    ]);
    (prisma.item.findMany as Mock).mockResolvedValue([
      { id: 'item-1', name: 'Extinguisher A' },
    ]);
    (prisma.event.findMany as Mock).mockResolvedValue([
      { id: 'ev-1', title: 'Quarterly Inspection' },
    ]);

    const ui = await ProjectLayout({
      children: <div>Content</div>,
      params: Promise.resolve({ projectId: 'proj-1' }),
    });
    render(ui);

    const entityMapsStr =
      screen.getByTestId('breadcrumbs-entity-maps').textContent;
    const parsed = JSON.parse(entityMapsStr ?? '{}');
    expect(parsed.floorPlans).toEqual({ 'fp-1': 'Ground Floor' });
    expect(parsed.itemTypes).toEqual({ 'it-1': 'Fire Equipment' });
    expect(parsed.locations).toEqual({ 'loc-1': 'Building A' });
    expect(parsed.items).toEqual({ 'item-1': 'Extinguisher A' });
    expect(parsed.events).toEqual({ 'ev-1': 'Quarterly Inspection' });
  });

  it('renders children inside the layout', async () => {
    const ui = await ProjectLayout({
      children: <div>Child Content</div>,
      params: Promise.resolve({ projectId: 'proj-1' }),
    });
    render(ui);

    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });
});