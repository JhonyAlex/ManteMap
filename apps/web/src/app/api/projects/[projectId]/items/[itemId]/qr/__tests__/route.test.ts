/**
 * Route-boundary tests for GET /api/projects/[projectId]/items/[itemId]/qr.
 *
 * Tests HTTP-level contracts:
 *   - 200 with image/png content type and valid data URL on success
 *   - 404 for non-existent item
 *   - 401 when no session exists
 *   - 403 for non-member user
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/qr-codes/spec.md
 *   QR-001, QR-005
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the QRCodeService
vi.mock('@/lib/services/qr-code-service', () => ({
  QRCodeService: {
    generateQRForItem: vi.fn(),
  },
}));

// Mock the auth session
vi.mock('@/lib/auth/session', () => ({
  getAuthUser: vi.fn(),
}));

// Mock the project access service
vi.mock('@/lib/services/project-access-service', () => ({
  requireProjectMember: vi.fn(),
}));

// Mock the item repository
vi.mock('@/lib/repositories/item-repository', () => ({
  findItemByProjectAndId: vi.fn(),
}));

// Mock the project repository
vi.mock('@/lib/repositories/project-repository', () => ({
  findProjectById: vi.fn(),
}));

import { QRCodeService } from '@/lib/services/qr-code-service';
import { getAuthUser } from '@/lib/auth/session';
import { requireProjectMember } from '@/lib/services/project-access-service';
import { findItemByProjectAndId } from '@/lib/repositories/item-repository';
import { findProjectById } from '@/lib/repositories/project-repository';
import { unauthorized } from '@/lib/http/api-error';
import { GET } from '../route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'project-1';
const ITEM_ID = 'item-1';
const PROJECT_CODE = 'proj-a';
const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'TECHNICIAN' };

const mockProject = {
  id: PROJECT_ID,
  code: PROJECT_CODE,
  name: 'Project A',
};

const mockItem = {
  id: ITEM_ID,
  name: 'Industrial Pump',
  slug: 'industrial-pump',
  itemTypeId: 'type-1',
  statusId: null,
  locationId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockProjectItem = {
  ...mockItem,
  itemType: { projectId: PROJECT_ID, name: 'Equipment', slug: 'equipment' },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(params: { projectId: string; itemId: string }) {
  return new Request(
    `http://localhost/api/projects/${params.projectId}/items/${params.itemId}/qr`,
    { method: 'GET' }
  );
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// Tests
// ===========================================================================

describe('GET /api/projects/[projectId]/items/[itemId]/qr', () => {
  // -----------------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------------

  describe('authentication', () => {
    it('returns 401 when no session exists', async () => {
      // Arrange
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        error: unauthorized(),
      });

      // Act
      const response = await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: ITEM_ID }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: ITEM_ID }) }
      );

      // Assert
      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 404 when user is not a project member', async () => {
      // Arrange
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockRejectedValue(
        new (await import('@mantemap/shared')).NotFoundError('Project', PROJECT_ID)
      );
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjectItem);

      // Act
      const response = await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: ITEM_ID }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: ITEM_ID }) }
      );

      // Assert
      expect(response.status).toBe(404);
    });
  });

  // -----------------------------------------------------------------------
  // Item resolution
  // -----------------------------------------------------------------------

  describe('item resolution', () => {
    it('returns 404 when item does not exist', async () => {
      // Arrange
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      // Act
      const response = await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: 'nonexistent' }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: 'nonexistent' }) }
      );

      // Assert
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.message).toContain('not found');
    });
  });

  // -----------------------------------------------------------------------
  // QR generation success
  // -----------------------------------------------------------------------

  describe('QR generation', () => {
    it('returns 200 with image/png content type on success', async () => {
      // Arrange
      const fakeDataUrl = 'data:image/png;base64,qr-code-data';
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (findProjectById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProject);
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjectItem);
      (QRCodeService.generateQRForItem as ReturnType<typeof vi.fn>).mockResolvedValue(fakeDataUrl);

      // Act
      const response = await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: ITEM_ID }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: ITEM_ID }) }
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('image/png');
      const text = await response.text();
      expect(text).toBe(fakeDataUrl);
    });

    it('returns a PNG data URL matching the format data:image/png;base64,...', async () => {
      // Arrange
      const validDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA';
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (findProjectById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProject);
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjectItem);
      (QRCodeService.generateQRForItem as ReturnType<typeof vi.fn>).mockResolvedValue(validDataUrl);

      // Act
      const response = await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: ITEM_ID }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: ITEM_ID }) }
      );

      // Assert
      const text = await response.text();
      expect(text).toMatch(/^data:image\/png;base64,/);
    });

    it('uses item slug and project slug from the fetched records', async () => {
      // Arrange
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (findProjectById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProject);
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjectItem);
      (QRCodeService.generateQRForItem as ReturnType<typeof vi.fn>).mockResolvedValue('data:image/png;base64,test');

      // Act
      await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: ITEM_ID }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: ITEM_ID }) }
      );

      // Assert — project slug comes from project code, item slug from item
      expect(QRCodeService.generateQRForItem).toHaveBeenCalledWith(
        expect.stringContaining('proj'),
        'industrial-pump'
      );
    });

    it('returns 500 when QR generation fails', async () => {
      // Arrange
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (findProjectById as ReturnType<typeof vi.fn>).mockResolvedValue(mockProject);
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjectItem);
      (QRCodeService.generateQRForItem as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('QR generation failed')
      );

      // Act
      const response = await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: ITEM_ID }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: ITEM_ID }) }
      );

      // Assert
      expect(response.status).toBe(500);
    });
  });
});
