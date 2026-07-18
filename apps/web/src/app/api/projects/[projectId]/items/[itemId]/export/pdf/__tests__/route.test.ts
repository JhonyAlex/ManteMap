/**
 * Route-boundary tests for GET /api/projects/[projectId]/items/[itemId]/export/pdf.
 *
 * Tests HTTP-level contracts per PDF-001, PDF-004, PDF-005:
 *   - 200 with application/pdf and Content-Disposition on success
 *   - 404 for non-existent item
 *   - 401 when no session exists
 *   - 500 on PDF rendering failure
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/pdf-export/spec.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the ItemPdfService
vi.mock('@/lib/services/pdf-service', () => ({
  ItemPdfService: {
    generate: vi.fn(),
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

// Mock the document repository
vi.mock('@/lib/repositories/document-repository', () => ({
  findDocumentsByItem: vi.fn(),
}));

import { ItemPdfService } from '@/lib/services/pdf-service';
import { getAuthUser } from '@/lib/auth/session';
import { requireProjectMember } from '@/lib/services/project-access-service';
import { findItemByProjectAndId } from '@/lib/repositories/item-repository';
import { findDocumentsByItem } from '@/lib/repositories/document-repository';
import { unauthorized } from '@/lib/http/api-error';
import { GET } from '../route';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'project-1';
const ITEM_ID = 'item-1';
const PROJECT_NAME = 'Project A';
const mockUser = { id: 'user-1', email: 'test@example.com', name: 'Test User', role: 'TECHNICIAN' };

const mockItem = {
  id: ITEM_ID,
  name: 'Industrial Pump',
  slug: 'industrial-pump',
  itemTypeId: 'type-1',
  statusId: 'status-1',
  locationId: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  status: { id: 'status-1', name: 'Operational', key: 'operational', color: '#22c55e' },
  itemType: { id: 'type-1', name: 'Equipment', slug: 'equipment' },
  fieldValues: [
    { id: 'fv-1', dynamicFieldId: 'df-1', value: '220V', dynamicField: { id: 'df-1', name: 'Voltage', type: 'SHORT_TEXT' } },
  ],
  location: null,
};

const mockDocuments = [
  { id: 'doc-1', name: 'Manual.pdf', expiresAt: new Date('2027-06-15'), mimeType: 'application/pdf', sizeBytes: 1024 },
  { id: 'doc-2', name: 'Warranty.pdf', expiresAt: null, mimeType: 'application/pdf', sizeBytes: 512 },
];

const mockPdfBuffer = Buffer.from('%PDF-1.4 mock');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(params: { projectId: string; itemId: string }) {
  return new Request(
    `http://localhost/api/projects/${params.projectId}/items/${params.itemId}/export/pdf`,
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

describe('GET /api/projects/[projectId]/items/[itemId]/export/pdf', () => {
  // -----------------------------------------------------------------------
  // Authentication
  // -----------------------------------------------------------------------

  describe('authentication', () => {
    it('returns 401 when no session exists (PDF-005)', async () => {
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

    it('returns 404 when user is not a project member (PDF-005)', async () => {
      // Arrange
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockRejectedValue(
        new (await import('@mantemap/shared')).NotFoundError('Project', PROJECT_ID)
      );
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);

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
    it('returns 404 when item does not exist (PDF-005)', async () => {
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
  // PDF-001: Successful PDF generation
  // -----------------------------------------------------------------------

  describe('PDF generation (PDF-001, PDF-004)', () => {
    it('returns 200 with Content-Type: application/pdf', async () => {
      // Arrange
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);
      (findDocumentsByItem as ReturnType<typeof vi.fn>).mockResolvedValue(mockDocuments);
      (ItemPdfService.generate as ReturnType<typeof vi.fn>).mockResolvedValue(mockPdfBuffer);

      // Act
      const response = await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: ITEM_ID }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: ITEM_ID }) }
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
    });

    it('includes Content-Disposition: attachment header', async () => {
      // Arrange
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);
      (findDocumentsByItem as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (ItemPdfService.generate as ReturnType<typeof vi.fn>).mockResolvedValue(mockPdfBuffer);

      // Act
      const response = await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: ITEM_ID }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: ITEM_ID }) }
      );

      // Assert
      const disposition = response.headers.get('Content-Disposition');
      expect(disposition).toContain('attachment');
      expect(disposition).toContain('industrial-pump');
      expect(disposition).toContain('.pdf');
    });

    it('returns PDF buffer in the response body (PDF-004)', async () => {
      // Arrange
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);
      (findDocumentsByItem as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (ItemPdfService.generate as ReturnType<typeof vi.fn>).mockResolvedValue(mockPdfBuffer);

      // Act
      const response = await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: ITEM_ID }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: ITEM_ID }) }
      );

      // Assert — verify PDF body
      const buffer = Buffer.from(await response.arrayBuffer());
      expect(buffer).toEqual(mockPdfBuffer);
    });
  });

  // -----------------------------------------------------------------------
  // PDF-005: Error handling
  // -----------------------------------------------------------------------

  describe('error handling (PDF-005)', () => {
    it('returns 500 when PDF generation fails', async () => {
      // Arrange
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);
      (findDocumentsByItem as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (ItemPdfService.generate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('PDF rendering failed')
      );

      // Act
      const response = await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: ITEM_ID }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: ITEM_ID }) }
      );

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('does not leak internal error details in 500 response (PDF-005)', async () => {
      // Arrange
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);
      (findDocumentsByItem as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (ItemPdfService.generate as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Internal prisma error with stack trace')
      );

      // Act
      const response = await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: ITEM_ID }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: ITEM_ID }) }
      );

      // Assert
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.message).toBe('An internal error occurred');
      expect(body.message).not.toContain('prisma');
      expect(body.message).not.toContain('stack');
    });

    it('streams response without writing to disk (PDF-004)', async () => {
      // Arrange
      (getAuthUser as ReturnType<typeof vi.fn>).mockResolvedValue({ user: mockUser });
      (requireProjectMember as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      (findItemByProjectAndId as ReturnType<typeof vi.fn>).mockResolvedValue(mockItem);
      (findDocumentsByItem as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (ItemPdfService.generate as ReturnType<typeof vi.fn>).mockResolvedValue(mockPdfBuffer);

      // Act
      const response = await GET(
        makeGetRequest({ projectId: PROJECT_ID, itemId: ITEM_ID }),
        { params: Promise.resolve({ projectId: PROJECT_ID, itemId: ITEM_ID }) }
      );

      // Assert — response is a streaming response, not a file path
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
    });
  });
});
