import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared sub-schemas
// ---------------------------------------------------------------------------
const keySchema = z
  .string()
  .min(1, 'Key is required')
  .max(100, 'Key cannot exceed 100 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Key must be lowercase letters, numbers, and hyphens (kebab-case)');

const nameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(100, 'Name cannot exceed 100 characters');

const colorSchema = z
  .string()
  .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, 'Color must be a valid hex color (#RGB or #RRGGBB)');

// ---------------------------------------------------------------------------
// createStatusSchema
// ---------------------------------------------------------------------------
export const createStatusSchema = z.object({
  name: nameSchema,
  key: keySchema,
  color: colorSchema,
  icon: z.string().max(50, 'Icon cannot exceed 50 characters').optional(),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
  order: z.number().int().min(0, 'Order must be a non-negative integer').optional().default(0),
  isDefault: z.boolean().optional().default(false),
});

export type CreateStatusInput = z.infer<typeof createStatusSchema>;

// ---------------------------------------------------------------------------
// updateStatusSchema
// ---------------------------------------------------------------------------
export const updateStatusSchema = z
  .object({
    name: nameSchema.optional(),
    key: keySchema.optional(),
    color: colorSchema.optional(),
    icon: z.string().max(50, 'Icon cannot exceed 50 characters').optional(),
    description: z.string().max(500, 'Description cannot exceed 500 characters').optional(),
    order: z.number().int().min(0, 'Order must be a non-negative integer').optional(),
    isDefault: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;

// ---------------------------------------------------------------------------
// reorderStatusesSchema
// ---------------------------------------------------------------------------
export const reorderStatusesSchema = z.object({
  statusIds: z.array(z.string().min(1, 'Status ID cannot be empty')).min(1, 'At least one status ID is required'),
});

export type ReorderStatusesInput = z.infer<typeof reorderStatusesSchema>;
