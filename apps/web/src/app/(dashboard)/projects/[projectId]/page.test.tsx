/**
 * Unit tests for project CUID redirect route.
 *
 * Tests that:
 *   1. CUID → code redirect via permanentRedirect
 *   2. Invalid CUID returns notFound
 *
 * Vitest + React Testing Library.
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

// Mock repository
vi.mock('@/lib/repositories/project-repository', () => ({
  findProjectById: vi.fn(),
}));

// Mock next/navigation
const mockPermanentRedirect = vi.fn();
const mockNotFound = vi.fn();

vi.mock('next/navigation', () => ({
  permanentRedirect: mockPermanentRedirect,
  notFound: mockNotFound,
}));

import { findProjectById } from '@/lib/repositories/project-repository';
const mockFindProjectById = findProjectById as Mock;

// Dynamic import after mocks
let ProjectRedirectPage: any;

beforeAll(async () => {
  const mod = await import('./page');
  ProjectRedirectPage = mod.default;
});

describe('Project CUID redirect route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects CUID to project code when project exists', async () => {
    mockFindProjectById.mockResolvedValue({
      id: 'clxabc123',
      code: 'MAP-001',
      name: 'Test Project',
    });

    await ProjectRedirectPage({
      params: Promise.resolve({ projectId: 'clxabc123' }),
    });

    expect(mockFindProjectById).toHaveBeenCalledWith('clxabc123');
    expect(mockPermanentRedirect).toHaveBeenCalledWith('/projects/MAP-001');
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it('returns notFound when project does not exist', async () => {
    mockFindProjectById.mockResolvedValue(null);

    await ProjectRedirectPage({
      params: Promise.resolve({ projectId: 'nonexistent' }),
    });

    expect(mockFindProjectById).toHaveBeenCalledWith('nonexistent');
    expect(mockPermanentRedirect).not.toHaveBeenCalled();
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('redirects different CUID to its corresponding code', async () => {
    mockFindProjectById.mockResolvedValue({
      id: 'clxdef456',
      code: 'FAC-2024',
      name: 'Facility 2024',
    });

    await ProjectRedirectPage({
      params: Promise.resolve({ projectId: 'clxdef456' }),
    });

    expect(mockPermanentRedirect).toHaveBeenCalledWith('/projects/FAC-2024');
  });
});
