import { describe, expect, it } from 'vitest';
import { uploadDocumentSchema, documentFilterSchema } from './document';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VALID_NAME = 'Maintenance Report 2026';
const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

// Allowed MIME types from spec
const ALLOWED_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/acad',
  'application/dxf',
];

// ---------------------------------------------------------------------------
// uploadDocumentSchema
// ---------------------------------------------------------------------------
describe('uploadDocumentSchema', () => {
  it('accepts valid input with required fields only', () => {
    const result = uploadDocumentSchema.safeParse({
      name: VALID_NAME,
      sizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe(VALID_NAME);
      expect(result.data.sizeBytes).toBe(1024);
      expect(result.data.mimeType).toBe('application/pdf');
      expect(result.data.expiresAt).toBeUndefined();
    }
  });

  it('accepts valid input with optional expiresAt', () => {
    const result = uploadDocumentSchema.safeParse({
      name: VALID_NAME,
      sizeBytes: 1024,
      mimeType: 'application/pdf',
      expiresAt: '2026-12-31T23:59:59.000Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiresAt).toBe('2026-12-31T23:59:59.000Z');
    }
  });

  it('rejects empty name', () => {
    const result = uploadDocumentSchema.safeParse({
      name: '',
      sizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = uploadDocumentSchema.safeParse({
      sizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 255 characters', () => {
    const result = uploadDocumentSchema.safeParse({
      name: 'A'.repeat(256),
      sizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    expect(result.success).toBe(false);
  });

  it('trims name whitespace', () => {
    const result = uploadDocumentSchema.safeParse({
      name: '  Report  ',
      sizeBytes: 1024,
      mimeType: 'application/pdf',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Report');
    }
  });

  it('rejects file exceeding 50 MB', () => {
    const result = uploadDocumentSchema.safeParse({
      name: VALID_NAME,
      sizeBytes: MAX_SIZE_BYTES + 1,
      mimeType: 'application/pdf',
    });
    expect(result.success).toBe(false);
  });

  it('accepts file at exactly 50 MB', () => {
    const result = uploadDocumentSchema.safeParse({
      name: VALID_NAME,
      sizeBytes: MAX_SIZE_BYTES,
      mimeType: 'application/pdf',
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero-byte file', () => {
    const result = uploadDocumentSchema.safeParse({
      name: VALID_NAME,
      sizeBytes: 0,
      mimeType: 'application/pdf',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative file size', () => {
    const result = uploadDocumentSchema.safeParse({
      name: VALID_NAME,
      sizeBytes: -1,
      mimeType: 'application/pdf',
    });
    expect(result.success).toBe(false);
  });

  it('rejects .exe MIME type', () => {
    const result = uploadDocumentSchema.safeParse({
      name: VALID_NAME,
      sizeBytes: 1024,
      mimeType: 'application/x-msdownload',
    });
    expect(result.success).toBe(false);
  });

  it('rejects application/octet-stream (generic binary)', () => {
    const result = uploadDocumentSchema.safeParse({
      name: VALID_NAME,
      sizeBytes: 1024,
      mimeType: 'application/octet-stream',
    });
    expect(result.success).toBe(false);
  });

  it.each(ALLOWED_TYPES)('accepts MIME type: %s', (mimeType) => {
    const result = uploadDocumentSchema.safeParse({
      name: VALID_NAME,
      sizeBytes: 1024,
      mimeType,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid expiresAt format', () => {
    const result = uploadDocumentSchema.safeParse({
      name: VALID_NAME,
      sizeBytes: 1024,
      mimeType: 'application/pdf',
      expiresAt: 'not-a-date',
    });
    expect(result.success).toBe(false);
  });

  it('accepts null expiresAt (no expiration)', () => {
    const result = uploadDocumentSchema.safeParse({
      name: VALID_NAME,
      sizeBytes: 1024,
      mimeType: 'application/pdf',
      expiresAt: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiresAt).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// documentFilterSchema
// ---------------------------------------------------------------------------
describe('documentFilterSchema', () => {
  it('accepts empty filter (all optional)', () => {
    const result = documentFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts filter with name search', () => {
    const result = documentFilterSchema.safeParse({ search: 'report' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe('report');
    }
  });

  it('accepts filter with expiringSoon flag', () => {
    const result = documentFilterSchema.safeParse({ expiringSoon: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expiringSoon).toBe(true);
    }
  });

  it('accepts filter with expired flag', () => {
    const result = documentFilterSchema.safeParse({ expired: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expired).toBe(true);
    }
  });

  it('accepts filter with all fields', () => {
    const result = documentFilterSchema.safeParse({
      search: 'maintenance',
      expiringSoon: true,
      expired: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe('maintenance');
      expect(result.data.expiringSoon).toBe(true);
      expect(result.data.expired).toBe(false);
    }
  });
});
