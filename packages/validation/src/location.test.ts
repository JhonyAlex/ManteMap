import { describe, expect, it } from 'vitest';
import {
  createLocationSchema,
  updateLocationSchema,
  reorderLocationsSchema,
} from './location';

// ---------------------------------------------------------------------------
// createLocationSchema
// ---------------------------------------------------------------------------
describe('createLocationSchema', () => {
  const validRootInput = {
    name: 'Main Center',
    level: 0,
  };

  const validChildInput = {
    name: 'Building A',
    parentId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
    level: 1,
  };

  it('accepts valid root location (parentId omitted)', () => {
    const result = createLocationSchema.safeParse(validRootInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Main Center');
      expect(result.data.level).toBe(0);
      expect(result.data.parentId).toBeUndefined();
      expect(result.data.order).toBeUndefined();
    }
  });

  it('accepts valid child location with parentId', () => {
    const result = createLocationSchema.safeParse(validChildInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Building A');
      expect(result.data.parentId).toBe('clxxxxxxxxxxxxxxxxxxxxxxxx');
      expect(result.data.level).toBe(1);
    }
  });

  it('accepts explicit order', () => {
    const result = createLocationSchema.safeParse({
      name: 'Floor 1',
      parentId: 'clxxxxxxxxxxxxxxxxxxxxxxxx',
      level: 2,
      order: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(5);
    }
  });

  it('accepts all valid levels (0-4)', () => {
    for (let level = 0; level <= 4; level++) {
      const result = createLocationSchema.safeParse({
        name: `Level ${level}`,
        level,
      });
      expect(result.success).toBe(true);
    }
  });

  it('trims name whitespace', () => {
    const result = createLocationSchema.safeParse({
      name: '  Main Center  ',
      level: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Main Center');
    }
  });

  it('rejects empty name', () => {
    const result = createLocationSchema.safeParse({
      name: '',
      level: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = createLocationSchema.safeParse({
      level: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 200 characters', () => {
    const result = createLocationSchema.safeParse({
      name: 'A'.repeat(201),
      level: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing level', () => {
    const result = createLocationSchema.safeParse({
      name: 'Main Center',
    });
    expect(result.success).toBe(false);
  });

  it('rejects level below 0', () => {
    const result = createLocationSchema.safeParse({
      name: 'Invalid',
      level: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects level above 4', () => {
    const result = createLocationSchema.safeParse({
      name: 'Too Deep',
      level: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid parentId format', () => {
    const result = createLocationSchema.safeParse({
      name: 'Building',
      parentId: 'not-a-cuid',
      level: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative order', () => {
    const result = createLocationSchema.safeParse({
      name: 'Floor',
      level: 2,
      order: -1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer order', () => {
    const result = createLocationSchema.safeParse({
      name: 'Floor',
      level: 2,
      order: 1.5,
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateLocationSchema
// ---------------------------------------------------------------------------
describe('updateLocationSchema', () => {
  it('accepts partial update with name only', () => {
    const result = updateLocationSchema.safeParse({ name: 'Updated Center' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Updated Center');
    }
  });

  it('accepts partial update with order only', () => {
    const result = updateLocationSchema.safeParse({ order: 3 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(3);
    }
  });

  it('accepts partial update with active only', () => {
    const result = updateLocationSchema.safeParse({ active: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.active).toBe(false);
    }
  });

  it('accepts update with all fields', () => {
    const result = updateLocationSchema.safeParse({
      name: 'Updated',
      order: 2,
      active: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty update (no fields provided)', () => {
    const result = updateLocationSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects name exceeding 200 characters', () => {
    const result = updateLocationSchema.safeParse({ name: 'A'.repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = updateLocationSchema.safeParse({ name: '' });
    expect(result.success).toBe(false);
  });

  it('trims name whitespace', () => {
    const result = updateLocationSchema.safeParse({ name: '  Updated  ' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Updated');
    }
  });

  it('rejects negative order', () => {
    const result = updateLocationSchema.safeParse({ order: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer order', () => {
    const result = updateLocationSchema.safeParse({ order: 1.5 });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// reorderLocationsSchema
// ---------------------------------------------------------------------------
describe('reorderLocationsSchema', () => {
  it('accepts valid array of location IDs', () => {
    const result = reorderLocationsSchema.safeParse({
      locationIds: ['claaaaaaaaaaaaaaaaaaaaaa', 'clbbbbbbbbbbbbbbbbbbbbbb', 'clcccccccccccccccccccccc'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.locationIds).toHaveLength(3);
    }
  });

  it('accepts single location ID', () => {
    const result = reorderLocationsSchema.safeParse({
      locationIds: ['clxxxxxxxxxxxxxxxxxxxxxxxx'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty array', () => {
    const result = reorderLocationsSchema.safeParse({
      locationIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing locationIds', () => {
    const result = reorderLocationsSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects invalid ID format', () => {
    const result = reorderLocationsSchema.safeParse({
      locationIds: ['not-a-cuid'],
    });
    expect(result.success).toBe(false);
  });
});
