/**
 * Tests for FloorPlan and LocationMarker validation schemas.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-management/spec.md
 *   "FloorPlan model with image upload" — format, size, coordinates
 *   "LocationMarker model with normalized coordinates" — 0–1 range
 * Design: openspec/changes/phase-7-locations/design.md
 *   "Zod schemas for FloorPlan upload"
 */

import { describe, expect, it } from 'vitest';
import {
  createFloorPlanSchema,
  updateFloorPlanSchema,
  createMarkerSchema,
  updateMarkerSchema,
  ALLOWED_FLOOR_PLAN_EXTENSIONS,
  MAX_FLOOR_PLAN_SIZE_BYTES,
} from './floor-plan';

// ---------------------------------------------------------------------------
// createFloorPlanSchema
// ---------------------------------------------------------------------------

describe('createFloorPlanSchema', () => {
  const validInput = {
    locationId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
    name: 'Ground Floor Plan',
    imageUrl: '/storage/proj1/floor-plans/1234-plan.png',
    width: 1920,
    height: 1080,
  };

  it('accepts valid floor plan data', () => {
    const result = createFloorPlanSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Ground Floor Plan');
      expect(result.data.width).toBe(1920);
      expect(result.data.height).toBe(1080);
    }
  });

  it('requires locationId', () => {
    const { locationId: _, ...noLocation } = validInput;
    const result = createFloorPlanSchema.safeParse(noLocation);
    expect(result.success).toBe(false);
  });

  it('rejects invalid locationId format', () => {
    const result = createFloorPlanSchema.safeParse({
      ...validInput,
      locationId: 'not-a-cuid',
    });
    expect(result.success).toBe(false);
  });

  it('requires name', () => {
    const { name: _, ...noName } = validInput;
    const result = createFloorPlanSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createFloorPlanSchema.safeParse({ ...validInput, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 200 characters', () => {
    const result = createFloorPlanSchema.safeParse({
      ...validInput,
      name: 'A'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('trims name whitespace', () => {
    const result = createFloorPlanSchema.safeParse({
      ...validInput,
      name: '  Ground Floor  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Ground Floor');
    }
  });

  it('requires imageUrl', () => {
    const { imageUrl: _, ...noUrl } = validInput;
    const result = createFloorPlanSchema.safeParse(noUrl);
    expect(result.success).toBe(false);
  });

  it('requires width as positive integer', () => {
    const result = createFloorPlanSchema.safeParse({ ...validInput, width: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative width', () => {
    const result = createFloorPlanSchema.safeParse({ ...validInput, width: -100 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer width', () => {
    const result = createFloorPlanSchema.safeParse({ ...validInput, width: 1.5 });
    expect(result.success).toBe(false);
  });

  it('requires height as positive integer', () => {
    const result = createFloorPlanSchema.safeParse({ ...validInput, height: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative height', () => {
    const result = createFloorPlanSchema.safeParse({ ...validInput, height: -50 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer height', () => {
    const result = createFloorPlanSchema.safeParse({ ...validInput, height: 2.5 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateFloorPlanSchema
// ---------------------------------------------------------------------------

describe('updateFloorPlanSchema', () => {
  it('accepts partial update with name only', () => {
    const result = updateFloorPlanSchema.safeParse({ name: 'Updated Plan' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Updated Plan');
    }
  });

  it('accepts update with active flag', () => {
    const result = updateFloorPlanSchema.safeParse({ active: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.active).toBe(false);
    }
  });

  it('rejects empty update', () => {
    const result = updateFloorPlanSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = updateFloorPlanSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createMarkerSchema
// ---------------------------------------------------------------------------

describe('createMarkerSchema', () => {
  const validMarker = {
    x: 0.5,
    y: 0.3,
    label: 'Server Rack A',
    color: '#ff0000',
  };

  it('accepts valid marker with all fields', () => {
    const result = createMarkerSchema.safeParse(validMarker);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.x).toBe(0.5);
      expect(result.data.y).toBe(0.3);
      expect(result.data.label).toBe('Server Rack A');
      expect(result.data.color).toBe('#ff0000');
    }
  });

  it('accepts marker with minimum coordinates (0, 0)', () => {
    const result = createMarkerSchema.safeParse({ x: 0, y: 0 });
    expect(result.success).toBe(true);
  });

  it('accepts marker with maximum coordinates (1, 1)', () => {
    const result = createMarkerSchema.safeParse({ x: 1, y: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts marker without optional fields', () => {
    const result = createMarkerSchema.safeParse({ x: 0.5, y: 0.5 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.label).toBeUndefined();
      expect(result.data.color).toBeUndefined();
      expect(result.data.itemId).toBeUndefined();
    }
  });

  it('accepts marker with itemId', () => {
    const result = createMarkerSchema.safeParse({
      x: 0.5,
      y: 0.5,
      itemId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.itemId).toBe('clxxxxxxxxxxxxxxxxxxxxxxxx');
    }
  });

  it('rejects x > 1', () => {
    const result = createMarkerSchema.safeParse({ x: 1.5, y: 0.5 });
    expect(result.success).toBe(false);
  });

  it('rejects x < 0', () => {
    const result = createMarkerSchema.safeParse({ x: -0.1, y: 0.5 });
    expect(result.success).toBe(false);
  });

  it('rejects y > 1', () => {
    const result = createMarkerSchema.safeParse({ x: 0.5, y: 1.1 });
    expect(result.success).toBe(false);
  });

  it('rejects y < 0', () => {
    const result = createMarkerSchema.safeParse({ x: 0.5, y: -0.1 });
    expect(result.success).toBe(false);
  });

  it('rejects missing x', () => {
    const result = createMarkerSchema.safeParse({ y: 0.5 });
    expect(result.success).toBe(false);
  });

  it('rejects missing y', () => {
    const result = createMarkerSchema.safeParse({ x: 0.5 });
    expect(result.success).toBe(false);
  });

  it('rejects label exceeding 100 characters', () => {
    const result = createMarkerSchema.safeParse({
      x: 0.5,
      y: 0.5,
      label: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('accepts label at exactly 100 characters', () => {
    const result = createMarkerSchema.safeParse({
      x: 0.5,
      y: 0.5,
      label: 'A'.repeat(100),
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid itemId format', () => {
    const result = createMarkerSchema.safeParse({
      x: 0.5,
      y: 0.5,
      itemId: 'not-a-cuid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects out-of-range coordinates (spec scenario)', () => {
    const result = createMarkerSchema.safeParse({ x: 1.5, y: -0.1 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateMarkerSchema
// ---------------------------------------------------------------------------

describe('updateMarkerSchema', () => {
  it('accepts partial update with x only', () => {
    const result = updateMarkerSchema.safeParse({ x: 0.7 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.x).toBe(0.7);
    }
  });

  it('accepts partial update with label only', () => {
    const result = updateMarkerSchema.safeParse({ label: 'New Label' });
    expect(result.success).toBe(true);
  });

  it('accepts update with all fields', () => {
    const result = updateMarkerSchema.safeParse({
      x: 0.5,
      y: 0.5,
      label: 'Updated',
      color: '#00ff00',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty update', () => {
    const result = updateMarkerSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects x > 1', () => {
    const result = updateMarkerSchema.safeParse({ x: 1.5 });
    expect(result.success).toBe(false);
  });

  it('rejects y < 0', () => {
    const result = updateMarkerSchema.safeParse({ y: -0.1 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('floor plan constants', () => {
  it('defines allowed extensions', () => {
    expect(ALLOWED_FLOOR_PLAN_EXTENSIONS).toContain('.png');
    expect(ALLOWED_FLOOR_PLAN_EXTENSIONS).toContain('.jpg');
    expect(ALLOWED_FLOOR_PLAN_EXTENSIONS).toContain('.jpeg');
    expect(ALLOWED_FLOOR_PLAN_EXTENSIONS).toContain('.svg');
  });

  it('defines max file size (10MB)', () => {
    expect(MAX_FLOOR_PLAN_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});
