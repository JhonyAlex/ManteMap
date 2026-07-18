import { z } from 'zod';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Allowed file extensions for floor plan uploads.
 * Spec: "Supported formats: PNG, JPG, SVG"
 */
export const ALLOWED_FLOOR_PLAN_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.svg'];

/**
 * Maximum floor plan file size: 10MB.
 * Spec: "Max file size MUST be enforced (default 10MB)"
 */
export const MAX_FLOOR_PLAN_SIZE_BYTES = 10 * 1024 * 1024;

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

const cuidSchema = z.string().cuid();

const floorPlanNameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(200, 'Name cannot exceed 200 characters');

const coordinateSchema = z
  .number()
  .min(0, 'Coordinate must be >= 0')
  .max(1, 'Coordinate must be <= 1');

const markerLabelSchema = z
  .string()
  .trim()
  .min(1, 'Label cannot be empty')
  .max(100, 'Label cannot exceed 100 characters');

const colorSchema = z.string().trim().max(20);

const markerTypeSchema = z.enum(['POINT', 'POLYGON']).default('POINT');

const pointSchema = z.object({
  x: z.number(),
  y: z.number(),
});

const pointsSchema = z.array(pointSchema);

const polygonValidation = z
  .array(pointSchema)
  .min(3, 'Polygon requires at least 3 vertices')
  .optional();

// ---------------------------------------------------------------------------
// createFloorPlanSchema
// ---------------------------------------------------------------------------

export const createFloorPlanSchema = z.object({
  locationId: cuidSchema,
  name: floorPlanNameSchema,
  imageUrl: z.string().min(1, 'Image URL is required'),
  width: z.number().int().positive('Width must be a positive integer'),
  height: z.number().int().positive('Height must be a positive integer'),
});

export type CreateFloorPlanInput = z.infer<typeof createFloorPlanSchema>;

// ---------------------------------------------------------------------------
// updateFloorPlanSchema
// ---------------------------------------------------------------------------

export const updateFloorPlanSchema = z
  .object({
    name: floorPlanNameSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateFloorPlanInput = z.infer<typeof updateFloorPlanSchema>;

// ---------------------------------------------------------------------------
// createMarkerSchema
// ---------------------------------------------------------------------------

export const createMarkerSchema = z
  .object({
    x: coordinateSchema,
    y: coordinateSchema,
    label: markerLabelSchema.optional(),
    color: colorSchema.optional(),
    itemId: cuidSchema.optional(),
    type: markerTypeSchema,
    points: pointsSchema.optional(),
    fillColor: colorSchema.optional(),
    strokeColor: colorSchema.optional(),
    strokeWidth: z.number().positive().optional(),
  })
  .refine(
    (data) => {
      // If type is POLYGON, points must be provided with ≥ 3 vertices
      if (data.type === 'POLYGON') {
        if (!data.points || data.points.length < 3) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Polygon markers require points array with at least 3 vertices',
      path: ['points'],
    }
  );

export type CreateMarkerInput = z.infer<typeof createMarkerSchema>;

// ---------------------------------------------------------------------------
// updateMarkerSchema
// ---------------------------------------------------------------------------

export const updateMarkerSchema = z
  .object({
    x: coordinateSchema.optional(),
    y: coordinateSchema.optional(),
    label: markerLabelSchema.optional(),
    color: colorSchema.optional(),
    itemId: cuidSchema.optional(),
    type: markerTypeSchema.optional(),
    points: pointsSchema.optional(),
    fillColor: colorSchema.optional(),
    strokeColor: colorSchema.optional(),
    strokeWidth: z.number().positive().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
  })
  .refine(
    (data) => {
      // If type is being changed to POLYGON, points must be valid
      if (data.type === 'POLYGON' && data.points !== undefined) {
        if (data.points.length < 3) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Polygon markers require points array with at least 3 vertices',
      path: ['points'],
    }
  );

export type UpdateMarkerInput = z.infer<typeof updateMarkerSchema>;
