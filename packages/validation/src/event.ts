import { z } from 'zod';

// ---------------------------------------------------------------------------
// createEventSchema
// ---------------------------------------------------------------------------

export const createEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(200, 'Title cannot exceed 200 characters'),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').optional(),
    startAt: z.string().datetime({ message: 'Invalid datetime format' }),
    endAt: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
    allDay: z.boolean().optional().default(false),
    itemId: z.string().cuid().optional(),
    rrule: z.string().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color (e.g. #FF5733)')
      .optional(),
  })
  .refine(
    (data) => {
      if (data.endAt && data.startAt) {
        return new Date(data.endAt) > new Date(data.startAt);
      }
      return true;
    },
    { message: 'endDate must be after startDate', path: ['endAt'] }
  );

export type CreateEventInput = z.infer<typeof createEventSchema>;

// ---------------------------------------------------------------------------
// updateEventSchema
// ---------------------------------------------------------------------------

export const updateEventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title cannot be empty')
      .max(200, 'Title cannot exceed 200 characters')
      .optional(),
    description: z.string().max(2000, 'Description cannot exceed 2000 characters').nullable().optional(),
    startAt: z.string().datetime({ message: 'Invalid datetime format' }).optional(),
    endAt: z.string().datetime({ message: 'Invalid datetime format' }).nullable().optional(),
    allDay: z.boolean().optional(),
    rrule: z.string().nullable().optional(),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color (e.g. #FF5733)')
      .nullable()
      .optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided for update',
  });

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

// ---------------------------------------------------------------------------
// eventFilterSchema
// ---------------------------------------------------------------------------

export const eventFilterSchema = z.object({
  start: z.string().datetime({ message: 'Invalid datetime format' }),
  end: z.string().datetime({ message: 'Invalid datetime format' }),
  type: z.enum(['manual', 'document_expiration']).optional(),
});

export type EventFilterInput = z.infer<typeof eventFilterSchema>;
