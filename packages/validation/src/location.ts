import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const locationNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(200, 'Name cannot exceed 200 characters');

const cuidSchema = z.string().cuid();

// ---------------------------------------------------------------------------
// Location level enum (0=Center, 1=Building, 2=Floor, 3=Room, 4=Zone)
// ---------------------------------------------------------------------------

const locationLevelSchema = z
  .number()
  .int()
  .min(0, 'Level must be at least 0')
  .max(4, 'Level cannot exceed 4');

const orderSchema = z
  .number()
  .int()
  .min(0, 'Order must be non-negative');

// ---------------------------------------------------------------------------
// createLocationSchema
// ---------------------------------------------------------------------------

export const createLocationSchema = z.object({
  name: locationNameSchema,
  parentId: cuidSchema.optional(),
  level: locationLevelSchema,
  order: orderSchema.optional(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

// ---------------------------------------------------------------------------
// updateLocationSchema
// ---------------------------------------------------------------------------

export const updateLocationSchema = z
  .object({
    name: locationNameSchema.optional(),
    order: orderSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// ---------------------------------------------------------------------------
// reorderLocationsSchema
// ---------------------------------------------------------------------------

export const reorderLocationsSchema = z.object({
  locationIds: z.array(cuidSchema).min(1, 'At least one location ID is required'),
});

export type ReorderLocationsInput = z.infer<typeof reorderLocationsSchema>;
