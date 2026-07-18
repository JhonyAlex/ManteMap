/**
 * QRCodeService — server-side QR code generation.
 *
 * Wraps the `qrcode` library for PNG data URL generation.
 * Encodes item detail URLs per spec QR-004: {APP_URL}/p/{projectSlug}/i/{itemSlug}.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/qr-codes/spec.md
 * Design: openspec/changes/phase-11-advanced-features/design.md
 */

import QRCode from 'qrcode';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/** Default QR options per spec QR-003 — error correction level M */
const DEFAULT_QR_OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  type: 'image/png' as const,
  margin: 1,
};

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const QRCodeService = {
  /**
   * Generate a QR code as a base64 data URL for the given text.
   *
   * @param text — the text to encode in the QR code
   * @returns a data URL string (e.g. data:image/png;base64,...)
   */
  async generateQRDataURL(text: string): Promise<string> {
    return QRCode.toDataURL(text, DEFAULT_QR_OPTIONS);
  },

  /**
   * Generate a QR code for a specific item, encoding its detail page URL.
   *
   * URL format per QR-004: {APP_URL}/p/{projectSlug}/i/{itemSlug}
   *
   * @param projectSlug — the project's slug (not UUID)
   * @param itemSlug    — the item's slug (not UUID)
   * @returns a PNG data URL encoding the item detail page URL
   */
  async generateQRForItem(projectSlug: string, itemSlug: string): Promise<string> {
    const url = `${APP_URL}/p/${projectSlug}/i/${itemSlug}`;
    return QRCode.toDataURL(url, DEFAULT_QR_OPTIONS);
  },
};
