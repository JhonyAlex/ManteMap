import { z } from 'zod';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Maximum file size: 50 MB.
 * Enforced at validation layer AND API route layer.
 */
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;

/**
 * Allowed MIME types for document uploads.
 * Maps file extensions from spec: pdf, png, jpg, jpeg, gif, doc, docx, xls, xlsx, csv, txt, dwg, dxf
 */
export const ALLOWED_MIME_TYPES = [
  'application/pdf', // .pdf
  'image/png', // .png
  'image/jpeg', // .jpg, .jpeg
  'image/gif', // .gif
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/csv', // .csv
  'text/plain', // .txt
  'application/acad', // .dwg
  'application/dxf', // .dxf
] as const;

// ---------------------------------------------------------------------------
// uploadDocumentSchema
// ---------------------------------------------------------------------------

export const uploadDocumentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Document name is required')
    .max(255, 'Document name cannot exceed 255 characters'),
  sizeBytes: z
    .number()
    .int()
    .positive('File size must be positive')
    .max(MAX_FILE_SIZE_BYTES, 'File size cannot exceed 50 MB'),
  mimeType: z.enum(ALLOWED_MIME_TYPES as unknown as [string, ...string[]], {
    errorMap: () => ({
      message: `File type not allowed. Allowed types: pdf, png, jpg, jpeg, gif, doc, docx, xls, xlsx, csv, txt, dwg, dxf`,
    }),
  }),
  expiresAt: z
    .string()
    .datetime({ message: 'Invalid datetime format' })
    .nullable()
    .optional(),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;

// ---------------------------------------------------------------------------
// documentFilterSchema
// ---------------------------------------------------------------------------

export const documentFilterSchema = z.object({
  search: z.string().trim().optional(),
  expiringSoon: z.boolean().optional(),
  expired: z.boolean().optional(),
});

export type DocumentFilterInput = z.infer<typeof documentFilterSchema>;
