/**
 * QRCodeService — unit tests.
 *
 * Tests the QR generation service (URL construction, data URL generation).
 * Spec: openspec/changes/phase-11-advanced-features/specs/qr-codes/spec.md
 *   QR-001, QR-004
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock the qrcode library
// ---------------------------------------------------------------------------
const mockToDataURL = vi.fn();
vi.mock('qrcode', () => ({
  default: {
    toDataURL: (...args: unknown[]) => mockToDataURL(...args),
  },
}));

// ---------------------------------------------------------------------------
// Mock APP_URL via process.env
// ---------------------------------------------------------------------------
const APP_URL = 'https://mante.saharapro.team';

// ---------------------------------------------------------------------------
// Types for the service (will import when service exists)
// ---------------------------------------------------------------------------
type QRCodeServiceType = {
  generateQRDataURL(text: string): Promise<string>;
  generateQRForItem(projectSlug: string, itemSlug: string): Promise<string>;
  generateQRSheet(
    items: Array<{ id: string; slug: string; projectSlug: string }>
  ): Promise<string>;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QRCodeService', () => {
  let QRCodeService: QRCodeServiceType;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('APP_URL', APP_URL);
    mockToDataURL.mockReset();
    // Dynamic import to ensure the mock is set up before module loads
    const mod = await import('@/lib/services/qr-code-service');
    QRCodeService = mod.QRCodeService;
  });

  // -----------------------------------------------------------------------
  // generateQRDataURL
  // -----------------------------------------------------------------------

  describe('generateQRDataURL', () => {
    it('returns a valid base64 data URL for a given text', async () => {
      // Arrange
      const fakeDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA';
      mockToDataURL.mockResolvedValue(fakeDataUrl);

      // Act
      const result = await QRCodeService.generateQRDataURL('https://example.com');

      // Assert
      expect(result).toBe(fakeDataUrl);
      expect(mockToDataURL).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({
          errorCorrectionLevel: 'M',
        })
      );
    });

    it('passes the correct error correction level M by default', async () => {
      // Arrange
      mockToDataURL.mockResolvedValue('data:image/png;base64,abc');

      // Act
      await QRCodeService.generateQRDataURL('test-url');

      // Assert
      expect(mockToDataURL).toHaveBeenCalledWith(
        'test-url',
        expect.objectContaining({ errorCorrectionLevel: 'M' })
      );
    });

    it('handles qrcode library errors gracefully by propagating them', async () => {
      // Arrange
      const error = new Error('QR generation failed');
      mockToDataURL.mockRejectedValue(error);

      // Act & Assert
      await expect(
        QRCodeService.generateQRDataURL('bad')
      ).rejects.toThrow('QR generation failed');
    });
  });

  // -----------------------------------------------------------------------
  // generateQRForItem
  // -----------------------------------------------------------------------

  describe('generateQRForItem', () => {
    it('constructs the correct item URL from project slug and item slug', async () => {
      // Arrange
      mockToDataURL.mockResolvedValue('data:image/png;base64,xyz');
      const projectSlug = 'plant-a';
      const itemSlug = 'industrial-pump';

      // Act
      await QRCodeService.generateQRForItem(projectSlug, itemSlug);

      // Assert — URL must follow QR-004: {APP_URL}/p/{projectSlug}/i/{itemSlug}
      expect(mockToDataURL).toHaveBeenCalledWith(
        `${APP_URL}/p/plant-a/i/industrial-pump`,
        expect.objectContaining({ errorCorrectionLevel: 'M' })
      );
    });

    it('returns a valid PNG data URL', async () => {
      // Arrange
      const expectedUrl = 'data:image/png;base64,qr-data';
      mockToDataURL.mockResolvedValue(expectedUrl);

      // Act
      const result = await QRCodeService.generateQRForItem('proj', 'item-1');

      // Assert
      expect(result).toBe(expectedUrl);
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('handles special characters in slugs (URL-safe encoding)', async () => {
      // Arrange
      mockToDataURL.mockResolvedValue('data:image/png;base64,special');
      const projectSlug = 'building-b';
      const itemSlug = 'valve-type-3/4"';

      // Act
      await QRCodeService.generateQRForItem(projectSlug, itemSlug);

      // Assert — URL must not break on special chars
      const calledUrl: string = mockToDataURL.mock.calls[0][0];
      expect(calledUrl).toContain(`${APP_URL}/p/building-b/i/`);
      expect(calledUrl).toContain('valve-type-3');
    });
  });

  // -----------------------------------------------------------------------
  // generateQRSheet
  // -----------------------------------------------------------------------

  describe('generateQRSheet', () => {
    const items = [
      { id: 'item-1', slug: 'pump-a', projectSlug: 'plant-1' },
      { id: 'item-2', slug: 'valve-b', projectSlug: 'plant-1' },
    ];

    beforeEach(() => {
      mockToDataURL.mockResolvedValue('data:image/png;base64,mock-qr');
    });

    it('returns an HTML string containing all item names', async () => {
      // Act
      const html = await QRCodeService.generateQRSheet(items);

      // Assert — HTML must contain item names as labels
      expect(html).toContain('pump-a');
      expect(html).toContain('valve-b');
    });

    it('generates QR codes for each item', async () => {
      // Act
      await QRCodeService.generateQRSheet(items);

      // Assert — called once per item with correct URLs
      expect(mockToDataURL).toHaveBeenCalledTimes(2);
      expect(mockToDataURL).toHaveBeenCalledWith(
        `${APP_URL}/p/plant-1/i/pump-a`,
        expect.any(Object)
      );
      expect(mockToDataURL).toHaveBeenCalledWith(
        `${APP_URL}/p/plant-1/i/valve-b`,
        expect.any(Object)
      );
    });

    it('returns valid HTML with print-optimized styles', async () => {
      // Act
      const html = await QRCodeService.generateQRSheet(items);

      // Assert — HTML must have print media query
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('@media print');
      expect(html).toContain('<style>');
    });

    it('returns empty HTML page when items array is empty', async () => {
      // Act
      const html = await QRCodeService.generateQRSheet([]);

      // Assert — must be valid HTML document with no QR codes
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('No items to generate');
      expect(mockToDataURL).not.toHaveBeenCalled();
    });

    it('handles single item batch', async () => {
      // Act
      const html = await QRCodeService.generateQRSheet([items[0]]);

      // Assert
      expect(html).toContain('pump-a');
      expect(mockToDataURL).toHaveBeenCalledTimes(1);
    });
  });
});
