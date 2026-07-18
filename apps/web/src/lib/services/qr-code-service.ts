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
// Helpers
// ---------------------------------------------------------------------------

interface QREntry {
  name: string;
  dataUrl: string;
}

/**
 * Build a complete HTML document with a grid of QR codes for printing.
 */
function buildSheetHtml(entries: QREntry[]): string {
  const cells = entries
    .map(
      (entry) => `
    <div class="qr-cell">
      <img src="${entry.dataUrl}" alt="QR for ${entry.name}" class="qr-image" />
      <p class="qr-label">${escapeHtml(entry.name)}</p>
    </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QR Code Sheet</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 20px;
      color: #1f2937;
    }
    h1 { text-align: center; font-size: 1.25rem; margin-bottom: 16px; }
    .qr-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .qr-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px;
      border: 1px dashed #d1d5db;
      border-radius: 8px;
      break-inside: avoid;
    }
    .qr-image { width: 150px; height: 150px; }
    .qr-label {
      margin-top: 8px;
      font-size: 0.75rem;
      text-align: center;
      word-break: break-word;
      color: #4b5563;
    }
    @media print {
      body { padding: 0; }
      h1 { font-size: 14pt; }
      .qr-grid { gap: 12px; max-width: 100%; }
      .qr-cell { border: 1px dashed #9ca3af; page-break-inside: avoid; }
      .qr-image { width: 120px; height: 120px; }
      @page { margin: 10mm; size: A4; }
    }
  </style>
</head>
<body>
  <h1>QR Code Sheet (${entries.length} item${entries.length !== 1 ? 's' : ''})</h1>
  <div class="qr-grid">
${cells}
  </div>
</body>
</html>`;
}

/**
 * Return an HTML page for the empty-items case.
 */
function getEmptySheetHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>QR Code Sheet — No Items</title>
  <style>
    body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; color: #6b7280; }
  </style>
</head>
<body>
  <p>No items to generate QR codes for.</p>
</body>
</html>`;
}

/**
 * Escape HTML special characters to prevent XSS in labels.
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

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

  /**
   * Generate an HTML page with a grid of QR codes for multiple items.
   *
   * Each item gets a QR code + its name as a label beneath. The HTML is
   * print-optimized with @media print styles. Returns an empty page with
   * a "No items" message when the array is empty.
   *
   * @param items — array of { id, slug, projectSlug }
   * @returns a complete HTML document string
   */
  async generateQRSheet(
    items: Array<{ id: string; slug: string; projectSlug: string }>
  ): Promise<string> {
    if (items.length === 0) {
      return getEmptySheetHtml();
    }

    // Generate QR codes for all items in parallel
    const qrEntries = await Promise.all(
      items.map(async (item) => {
        const dataUrl = await this.generateQRForItem(item.projectSlug, item.slug);
        return { name: item.slug, dataUrl };
      })
    );

    return buildSheetHtml(qrEntries);
  },
};
