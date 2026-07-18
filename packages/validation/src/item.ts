import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const slugSchema = z
  .string()
  .trim()
  .min(2, 'Slug must be at least 2 characters')
  .max(80, 'Slug cannot exceed 80 characters')
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'Slug can only contain lowercase letters, numbers, and hyphens'
  );

const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(200, 'Name cannot exceed 200 characters');

// ---------------------------------------------------------------------------
// Field value entry (dynamicFieldId + raw value)
// ---------------------------------------------------------------------------

const fieldValuesSchema = z.array(
  z.object({
    dynamicFieldId: z.string().cuid(),
    value: z.unknown(),
  })
);

// ---------------------------------------------------------------------------
// createItemSchema
// ---------------------------------------------------------------------------

export const createItemSchema = z.object({
  name: nameSchema,
  slug: slugSchema.optional(),
  itemTypeId: z.string().cuid(),
  statusId: z.string().cuid().optional(),
  fieldValues: fieldValuesSchema.optional(),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

// ---------------------------------------------------------------------------
// updateItemSchema
// ---------------------------------------------------------------------------

export const updateItemSchema = z
  .object({
    name: nameSchema.optional(),
    statusId: z.string().cuid().optional(),
    fieldValues: fieldValuesSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateItemInput = z.infer<typeof updateItemSchema>;

// ---------------------------------------------------------------------------
// transitionStatusSchema
// ---------------------------------------------------------------------------

export const transitionStatusSchema = z.object({
  statusId: z.string().cuid(),
});

export type TransitionStatusInput = z.infer<typeof transitionStatusSchema>;
