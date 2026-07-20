import { describe, expect, it } from 'vitest';
import {
  ianaTimezoneSchema,
  maintenanceGenerationHorizonDaysSchema,
  maintenancePlanRevisionSchema,
  workOrderStatusSchema,
} from './maintenance';

describe('maintenance validation', () => {
  it('accepts IANA timezones and rejects unknown zones', () => {
    expect(ianaTimezoneSchema.safeParse('Europe/Madrid').success).toBe(true);
    expect(ianaTimezoneSchema.safeParse('America/Argentina/Buenos_Aires').success).toBe(true);
    expect(ianaTimezoneSchema.safeParse('Mars/Olympus').success).toBe(false);
  });

  it('accepts only the configured generation horizon bounds', () => {
    expect(maintenanceGenerationHorizonDaysSchema.parse(30)).toBe(30);
    expect(maintenanceGenerationHorizonDaysSchema.parse(90)).toBe(90);
    expect(maintenanceGenerationHorizonDaysSchema.parse(365)).toBe(365);
    expect(maintenanceGenerationHorizonDaysSchema.safeParse(29).success).toBe(false);
    expect(maintenanceGenerationHorizonDaysSchema.safeParse(366).success).toBe(false);
  });

  it('requires exactly the four persisted work-order statuses', () => {
    expect(workOrderStatusSchema.options).toEqual([
      'PENDING',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
    ]);
    expect(workOrderStatusSchema.safeParse('OVERDUE').success).toBe(false);
  });

  it('enforces the fixed-versus-rrule schedule XOR', () => {
    const fixed = maintenancePlanRevisionSchema.safeParse({
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      scheduleKind: 'FIXED',
      scheduledAt: new Date('2026-01-02T09:00:00.000Z'),
    });
    const recurring = maintenancePlanRevisionSchema.safeParse({
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      scheduleKind: 'RRULE',
      startsAt: new Date('2026-01-02T09:00:00.000Z'),
      rrule: 'FREQ=MONTHLY',
    });

    expect(fixed.success).toBe(true);
    expect(recurring.success).toBe(true);
    expect(
      maintenancePlanRevisionSchema.safeParse({
        effectiveFrom: new Date(),
        scheduleKind: 'FIXED',
        rrule: 'FREQ=DAILY',
      }).success
    ).toBe(false);
    expect(
      maintenancePlanRevisionSchema.safeParse({
        effectiveFrom: new Date(),
        scheduleKind: 'RRULE',
        startsAt: new Date(),
      }).success
    ).toBe(false);
  });
});
