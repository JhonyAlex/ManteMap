import { z } from 'zod';

export const DEFAULT_PROJECT_TIMEZONE = 'Europe/Madrid';
export const DEFAULT_MAINTENANCE_GENERATION_HORIZON_DAYS = 90;
export const MIN_MAINTENANCE_GENERATION_HORIZON_DAYS = 30;
export const MAX_MAINTENANCE_GENERATION_HORIZON_DAYS = 365;

export const ianaTimezoneSchema = z
  .string()
  .trim()
  .min(1)
  .refine((timezone) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  }, 'Timezone must be a valid IANA timezone');

export const maintenanceGenerationHorizonDaysSchema = z
  .number()
  .int()
  .min(MIN_MAINTENANCE_GENERATION_HORIZON_DAYS)
  .max(MAX_MAINTENANCE_GENERATION_HORIZON_DAYS);

export const workOrderStatusSchema = z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

const revisionBaseSchema = z.object({
  effectiveFrom: z.coerce.date(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(2_000).optional(),
  scheduleKind: z.enum(['FIXED', 'RRULE']),
  scheduledAt: z.coerce.date().optional(),
  startsAt: z.coerce.date().optional(),
  rrule: z.string().trim().min(1).max(2_000).optional(),
  dueOffsetMinutes: z.number().int().min(0).optional(),
  assigneeId: z.string().cuid().optional(),
  definition: z.record(z.unknown()).optional(),
});

export const maintenancePlanRevisionSchema = revisionBaseSchema.superRefine((revision, ctx) => {
  const fixedIsValid =
    revision.scheduleKind === 'FIXED' &&
    revision.scheduledAt !== undefined &&
    revision.startsAt === undefined &&
    revision.rrule === undefined;
  const rruleIsValid =
    revision.scheduleKind === 'RRULE' &&
    revision.scheduledAt === undefined &&
    revision.startsAt !== undefined &&
    revision.rrule !== undefined;

  if (!fixedIsValid && !rruleIsValid) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'FIXED requires scheduledAt only; RRULE requires startsAt and rrule only',
      path: ['scheduleKind'],
    });
  }
});

export const updateProjectSchedulingSchema = z
  .object({
    timezone: ianaTimezoneSchema.optional(),
    maintenanceGenerationHorizonDays: maintenanceGenerationHorizonDaysSchema.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, 'At least one scheduling field is required');

export type MaintenancePlanRevisionInput = z.infer<typeof maintenancePlanRevisionSchema>;
export type UpdateProjectSchedulingInput = z.infer<typeof updateProjectSchedulingSchema>;
