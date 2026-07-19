// @vitest-environment jsdom
/**
 * RED tests for Floor Plan View page.
 *
 * Verifies:
 *   - Authorized member sees floor plan name and viewer
 *   - Non-member / not found gets 404 (via notFound)
 *   - Image URL is the API endpoint (not storage path)
 *
 * Spec: openspec/changes/human-readable-urls-and-floor-plan-fixes/specs/floor-plan-view/spec.md
 *   "Floor plan view page" — renders with markers
 *   "Image URL resolution" — API endpoint URL
 *   "Unauthorized access" — 404 for non-members
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';

// Hoist mock component factory (vi.mock is hoisted, so this must be too)
const { mockViewerFactory } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MockFloorPlanViewer = (props: Record<string, any>) =>
    React.createElement('div', {
      'data-testid': 'floor-plan-viewer',
      'data-props': JSON.stringify(props),
    }, 'Mocked FloorPlanViewer');
  return { mockViewerFactory: () => ({ FloorPlanViewer: MockFloorPlanViewer }) };
});

// Mock next/navigation
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => { throw new Error('NEXT_NOT_FOUND'); }),
}));

// Mock auth/session
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
}));

// Mock floor-plan-service
vi.mock('@/lib/services/floor-plan-service', () => ({
  getFloorPlan: vi.fn(),
  listMarkers: vi.fn(),
}));

vi.mock('@/lib/services/project-service', () => ({
  resolveProjectId: vi.fn(),
}));

// Mock FloorPlanViewer (Konva won't work in jsdom)
vi.mock('@/components/floor-plans/floor-plan-viewer', mockViewerFactory);

import FloorPlanViewPage from './page';
import { getCurrentUser } from '@/lib/auth/session';
import { getFloorPlan, listMarkers } from '@/lib/services/floor-plan-service';
import { resolveProjectId } from '@/lib/services/project-service';

const mockGetCurrentUser = getCurrentUser as Mock;
const mockGetFloorPlan = getFloorPlan as Mock;
const mockListMarkers = listMarkers as Mock;
const mockResolveProjectId = resolveProjectId as Mock;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'TECHNICIAN',
};

const mockFloorPlan = {
  id: 'fp-1',
  locationId: 'loc-1',
  name: 'Ground Floor',
  imageUrl: 'loc-1/1234-ground-floor.png',
  width: 1920,
  height: 1080,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockMarkers = [
  {
    id: 'm1',
    floorPlanId: 'fp-1',
    itemId: null,
    x: 0.5,
    y: 0.3,
    label: 'Room 101',
    color: '#ff0000',
  },
  {
    id: 'm2',
    floorPlanId: 'fp-1',
    itemId: 'item-1',
    x: 0.7,
    y: 0.6,
    label: 'Server Rack',
    color: '#00ff00',
  },
];

describe('FloorPlanViewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockResolveProjectId.mockResolvedValue('proj-1');
    mockGetFloorPlan.mockResolvedValue({ floorPlan: mockFloorPlan });
    mockListMarkers.mockResolvedValue({ markers: mockMarkers });
  });

  it('renders the floor plan name as page title', async () => {
    const ui = await FloorPlanViewPage({
      params: Promise.resolve({ projectCode: 'ALPHA', floorPlanId: 'fp-1' }),
    });
    render(ui);

    expect(screen.getByText('Ground Floor')).toBeInTheDocument();
  });

  it('renders the FloorPlanViewer component', async () => {
    const ui = await FloorPlanViewPage({
      params: Promise.resolve({ projectCode: 'ALPHA', floorPlanId: 'fp-1' }),
    });
    render(ui);

    expect(screen.getByTestId('floor-plan-viewer')).toBeInTheDocument();
  });

  it('passes API endpoint URL as imageUrl prop', async () => {
    const ui = await FloorPlanViewPage({
      params: Promise.resolve({ projectCode: 'ALPHA', floorPlanId: 'fp-1' }),
    });
    render(ui);

    const viewer = screen.getByTestId('floor-plan-viewer');
    const props = JSON.parse(viewer.getAttribute('data-props')!);
    expect(props.imageUrl).toBe('/api/projects/proj-1/floor-plans/fp-1/image');
  });

  it('passes floor plan dimensions to viewer', async () => {
    const ui = await FloorPlanViewPage({
      params: Promise.resolve({ projectCode: 'ALPHA', floorPlanId: 'fp-1' }),
    });
    render(ui);

    const viewer = screen.getByTestId('floor-plan-viewer');
    const props = JSON.parse(viewer.getAttribute('data-props')!);
    expect(props.imageWidth).toBe(1920);
    expect(props.imageHeight).toBe(1080);
  });

  it('passes markers to viewer', async () => {
    const ui = await FloorPlanViewPage({
      params: Promise.resolve({ projectCode: 'ALPHA', floorPlanId: 'fp-1' }),
    });
    render(ui);

    const viewer = screen.getByTestId('floor-plan-viewer');
    const props = JSON.parse(viewer.getAttribute('data-props')!);
    expect(props.markers).toHaveLength(2);
    expect(props.canDrag).toBe(false);
  });

  it('calls getFloorPlan with correct IDs', async () => {
    await FloorPlanViewPage({
      params: Promise.resolve({ projectCode: 'ALPHA', floorPlanId: 'fp-1' }),
    });

    expect(mockGetFloorPlan).toHaveBeenCalledWith('proj-1', 'fp-1', 'user-1');
  });

  it('calls listMarkers with correct IDs', async () => {
    await FloorPlanViewPage({
      params: Promise.resolve({ projectCode: 'ALPHA', floorPlanId: 'fp-1' }),
    });

    expect(mockListMarkers).toHaveBeenCalledWith('proj-1', 'fp-1', 'user-1');
  });

  it('shows not-found when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(
      FloorPlanViewPage({
        params: Promise.resolve({ projectCode: 'ALPHA', floorPlanId: 'fp-1' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('shows not-found when floor plan does not exist', async () => {
    const { NotFoundError } = await import('@mantemap/shared');
    mockGetFloorPlan.mockRejectedValue(new NotFoundError('FloorPlan', 'fp-nonexistent'));

    await expect(
      FloorPlanViewPage({
        params: Promise.resolve({ projectCode: 'ALPHA', floorPlanId: 'fp-nonexistent' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('shows not-found when user is not a project member', async () => {
    const { AuthorizationError } = await import('@mantemap/shared');
    mockGetFloorPlan.mockRejectedValue(new AuthorizationError());

    await expect(
      FloorPlanViewPage({
        params: Promise.resolve({ projectCode: 'ALPHA', floorPlanId: 'fp-1' }),
      })
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
