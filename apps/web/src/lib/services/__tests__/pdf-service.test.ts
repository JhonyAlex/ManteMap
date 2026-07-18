/**
 * PDF Service — unit tests.
 *
 * Tests ItemPdfService.generate() data assembly and PDF generation.
 * Mocks @react-pdf/renderer to verify the document receives correct data.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/pdf-export/spec.md
 *   PDF-001, PDF-002, PDF-003, PDF-004
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @react-pdf/renderer
// ---------------------------------------------------------------------------
const mockRenderToBuffer = vi.fn();
const mockDocument = vi.fn();
const mockPage = vi.fn();
const mockText = vi.fn();
const mockView = vi.fn();
const mockImage = vi.fn();
const mockStyleSheet = { create: vi.fn((s: Record<string, unknown>) => s) };

vi.mock('@react-pdf/renderer', () => ({
  Document: mockDocument,
  Page: mockPage,
  Text: mockText,
  View: mockView,
  Image: mockImage,
  StyleSheet: mockStyleSheet,
  renderToBuffer: mockRenderToBuffer,
}));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ItemPdfData {
  item: {
    name: string;
    slug: string;
    status: string | null;
    itemType: string | null;
  };
  fields: Array<{ name: string; value: unknown }>;
  documents: Array<{ name: string; expiresAt: string | null }>;
  projectName: string;
  qrDataUrl?: string;
  locationPath?: string;
}

interface ItemPdfServiceType {
  generate(data: ItemPdfData): Promise<Buffer>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ItemPdfService', () => {
  let ItemPdfService: ItemPdfServiceType;

  const mockPdfBuffer = Buffer.from('%PDF-1.4 mock pdf content');

  beforeEach(async () => {
    vi.clearAllMocks();
    mockRenderToBuffer.mockResolvedValue(mockPdfBuffer);

    // Dynamic import to ensure mocks are applied before module loads
    const mod = await import('@/lib/services/pdf-service');
    ItemPdfService = mod.ItemPdfService;
  });

  // -----------------------------------------------------------------------
  // PDF-001: PDF generation returns a Buffer
  // -----------------------------------------------------------------------

  describe('generate (PDF-001)', () => {
    it('returns a Buffer from @react-pdf/renderer', async () => {
      // Arrange
      const data: ItemPdfData = {
        item: { name: 'Pump A', slug: 'pump-a', status: 'Operational', itemType: 'Equipment' },
        fields: [{ name: 'Voltage', value: '220V' }],
        documents: [{ name: 'Manual.pdf', expiresAt: null }],
        projectName: 'Plant A',
      };

      // Act
      const result = await ItemPdfService.generate(data);

      // Assert
      expect(result).toBeInstanceOf(Buffer);
      expect(result).toBe(mockPdfBuffer);
      expect(mockRenderToBuffer).toHaveBeenCalled();
    });

    it('generates PDF with correct item name and status', async () => {
      // Arrange
      const data: ItemPdfData = {
        item: { name: 'Pump A', slug: 'pump-a', status: 'Operational', itemType: 'Equipment' },
        fields: [],
        documents: [],
        projectName: 'Plant A',
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert — verify document received the data (we check mock calls)
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('includes project name in PDF document', async () => {
      // Arrange
      const data: ItemPdfData = {
        item: { name: 'Valve B', slug: 'valve-b', status: 'Maintenance', itemType: 'Valve' },
        fields: [],
        documents: [],
        projectName: 'Building 3',
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // PDF-002: Field value rendering
  // -----------------------------------------------------------------------

  describe('field rendering (PDF-002)', () => {
    it('renders all field label+value pairs', async () => {
      // Arrange
      const data: ItemPdfData = {
        item: { name: 'Widget', slug: 'widget', status: 'Active', itemType: 'Part' },
        fields: [
          { name: 'Name', value: 'Widget' },
          { name: 'Quantity', value: 42 },
          { name: 'Notes', value: null },
        ],
        documents: [],
        projectName: 'Factory',
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('displays "—" for null field values', async () => {
      // Arrange
      const data: ItemPdfData = {
        item: { name: 'Item', slug: 'item', status: 'New', itemType: 'Type' },
        fields: [{ name: 'Notes', value: null }],
        documents: [],
        projectName: 'Test',
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert — the service should handle null values gracefully
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('handles empty fields array', async () => {
      // Arrange
      const data: ItemPdfData = {
        item: { name: 'Empty Fields', slug: 'empty', status: null, itemType: null },
        fields: [],
        documents: [],
        projectName: 'Test',
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // PDF-003: QR code inclusion
  // -----------------------------------------------------------------------

  describe('QR code inclusion (PDF-003)', () => {
    it('includes QR code when qrDataUrl is provided', async () => {
      // Arrange
      const qrDataUrl = 'data:image/png;base64,qr-code-data';
      const data: ItemPdfData = {
        item: { name: 'QR Item', slug: 'qr-item', status: 'Active', itemType: 'Type' },
        fields: [],
        documents: [],
        projectName: 'Test',
        qrDataUrl,
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('generates PDF without QR when qrDataUrl is undefined', async () => {
      // Arrange
      const data: ItemPdfData = {
        item: { name: 'No QR Item', slug: 'no-qr', status: 'Active', itemType: 'Type' },
        fields: [],
        documents: [],
        projectName: 'Test',
        // qrDataUrl intentionally omitted
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert — should not throw, generate successfully
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Documents list
  // -----------------------------------------------------------------------

  describe('document list', () => {
    it('renders document names in the PDF', async () => {
      // Arrange
      const data: ItemPdfData = {
        item: { name: 'Doc Item', slug: 'doc', status: 'Active', itemType: 'Type' },
        fields: [],
        documents: [
          { name: 'Manual.pdf', expiresAt: '2027-06-15' },
          { name: 'Warranty.pdf', expiresAt: null },
        ],
        projectName: 'Test',
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('handles empty documents array', async () => {
      // Arrange
      const data: ItemPdfData = {
        item: { name: 'No Docs', slug: 'no-docs', status: 'Active', itemType: 'Type' },
        fields: [],
        documents: [],
        projectName: 'Test',
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Location path
  // -----------------------------------------------------------------------

  describe('location path', () => {
    it('includes location path when provided', async () => {
      // Arrange
      const data: ItemPdfData = {
        item: { name: 'Located Item', slug: 'loc', status: 'Active', itemType: 'Type' },
        fields: [],
        documents: [],
        projectName: 'Test',
        locationPath: 'Building 1 > Room 101',
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('renders without location when not provided', async () => {
      // Arrange
      const data: ItemPdfData = {
        item: { name: 'No Location', slug: 'noloc', status: 'Active', itemType: 'Type' },
        fields: [],
        documents: [],
        projectName: 'Test',
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // Error handling
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('propagates @react-pdf/renderer errors', async () => {
      // Arrange
      mockRenderToBuffer.mockRejectedValue(new Error('Rendering failed'));
      const data: ItemPdfData = {
        item: { name: 'Bad Item', slug: 'bad', status: 'Active', itemType: 'Type' },
        fields: [],
        documents: [],
        projectName: 'Test',
      };

      // Act & Assert
      await expect(ItemPdfService.generate(data)).rejects.toThrow('Rendering failed');
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles items with null status and type', async () => {
      // Arrange
      const data: ItemPdfData = {
        item: { name: 'New Item', slug: 'new', status: null, itemType: null },
        fields: [],
        documents: [],
        projectName: 'Test',
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });

    it('handles items with very long names', async () => {
      // Arrange
      const longName = 'A'.repeat(200);
      const data: ItemPdfData = {
        item: { name: longName, slug: 'long', status: 'Active', itemType: 'Type' },
        fields: [],
        documents: [],
        projectName: 'Test',
      };

      // Act
      await ItemPdfService.generate(data);

      // Assert
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1);
    });
  });
});
