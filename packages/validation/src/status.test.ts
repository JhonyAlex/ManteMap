import { describe, it, expect } from 'vitest';
import {
  createStatusSchema,
  updateStatusSchema,
  reorderStatusesSchema,
} from './status';

// =============================================================================
// createStatusSchema
// =============================================================================
describe('createStatusSchema', () => {
  // --- Happy path ---
  it('accepts a valid status with all fields', () => {
    const result = createStatusSchema.safeParse({
      name: 'Operativo',
      key: 'operativo',
      color: '#22C55E',
      icon: '🟢',
      description: 'Equipo en funcionamiento normal',
      order: 1,
      isDefault: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Operativo');
      expect(result.data.key).toBe('operativo');
      expect(result.data.color).toBe('#22C55E');
      expect(result.data.icon).toBe('🟢');
      expect(result.data.order).toBe(1);
      expect(result.data.isDefault).toBe(true);
    }
  });

  it('accepts a minimal valid status (only required fields)', () => {
    const result = createStatusSchema.safeParse({
      name: 'Activo',
      key: 'activo',
      color: '#3B82F6',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Activo');
      expect(result.data.key).toBe('activo');
      expect(result.data.color).toBe('#3B82F6');
      expect(result.data.order).toBe(0);           // default
      expect(result.data.isDefault).toBe(false);    // default
    }
  });

  // --- Color validation: 6-char hex ---
  it('accepts a valid 6-character hex color', () => {
    const result = createStatusSchema.safeParse({
      name: 'En Mantenimiento',
      key: 'en-mantenimiento',
      color: '#F59E0B',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.color).toBe('#F59E0B');
    }
  });

  // --- Color validation: 3-char hex ---
  it('accepts a valid 3-character hex color', () => {
    const result = createStatusSchema.safeParse({
      name: 'Fuera de Servicio',
      key: 'fuera-de-servicio',
      color: '#F00',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.color).toBe('#F00');
    }
  });

  it('accepts lowercase hex with 3 chars', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: '#abc',
    });
    expect(result.success).toBe(true);
  });

  it('accepts mixed-case 6-char hex', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: '#AbCdeF',
    });
    expect(result.success).toBe(true);
  });

  // --- Color validation: invalid ---
  it('rejects a hex color without # prefix', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: 'FF5733',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a named color like "blue"', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: 'blue',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid hex color with GGG', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: '#GGG000',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a 4-character hex', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: '#1234',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a 7-character hex (should be 6 or 3)', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: '#1234567',
    });
    expect(result.success).toBe(false);
  });

  // --- Key validation ---
  it('accepts a valid kebab-case key', () => {
    const result = createStatusSchema.safeParse({
      name: 'En Revisión',
      key: 'en-revision',
      color: '#8B5CF6',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.key).toBe('en-revision');
    }
  });

  it('accepts a single-word key', () => {
    const result = createStatusSchema.safeParse({
      name: 'Draft',
      key: 'draft',
      color: '#6B7280',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.key).toBe('draft');
    }
  });

  it('rejects a key with uppercase letters', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'En-Revision',
      color: '#8B5CF6',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a key with underscores', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'en_revision',
      color: '#8B5CF6',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a key with spaces', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'en revision',
      color: '#8B5CF6',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an empty key', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: '',
      color: '#8B5CF6',
    });
    expect(result.success).toBe(false);
  });

  // --- Name validation ---
  it('rejects an empty name', () => {
    const result = createStatusSchema.safeParse({
      name: '',
      key: 'test',
      color: '#8B5CF6',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name exceeding 100 characters', () => {
    const result = createStatusSchema.safeParse({
      name: 'A'.repeat(101),
      key: 'test',
      color: '#8B5CF6',
    });
    expect(result.success).toBe(false);
  });

  // --- isDefault boolean ---
  it('rejects isDefault when it is a string', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: '#8B5CF6',
      isDefault: 'yes',
    });
    expect(result.success).toBe(false);
  });

  it('accepts isDefault as false', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: '#8B5CF6',
      isDefault: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isDefault).toBe(false);
    }
  });

  // --- Order validation ---
  it('rejects a negative order', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: '#8B5CF6',
      order: -1,
    });
    expect(result.success).toBe(false);
  });

  it('accepts order as 0', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: '#8B5CF6',
      order: 0,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(0);
    }
  });

  // --- Icon optional ---
  it('accepts missing icon (optional field)', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: '#8B5CF6',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.icon).toBeUndefined();
    }
  });

  it('accepts a string icon', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: '#8B5CF6',
      icon: '🔧',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.icon).toBe('🔧');
    }
  });

  // --- Description optional ---
  it('accepts missing description (optional field)', () => {
    const result = createStatusSchema.safeParse({
      name: 'Test',
      key: 'test',
      color: '#8B5CF6',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeUndefined();
    }
  });
});

// =============================================================================
// updateStatusSchema
// =============================================================================
describe('updateStatusSchema', () => {
  it('accepts a full update payload', () => {
    const result = updateStatusSchema.safeParse({
      name: 'Updated Name',
      key: 'updated-key',
      color: '#EF4444',
      icon: '🔴',
      description: 'Updated description',
      order: 5,
      isDefault: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Updated Name');
    }
  });

  it('accepts a partial update with a single field', () => {
    const result = updateStatusSchema.safeParse({
      name: 'Renamed Status',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Renamed Status');
      expect(Object.keys(result.data)).toHaveLength(1);
    }
  });

  it('rejects an empty object (at least one field required)', () => {
    const result = updateStatusSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('accepts only color update', () => {
    const result = updateStatusSchema.safeParse({ color: '#10B981' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.color).toBe('#10B981');
    }
  });

  it('accepts only order update', () => {
    const result = updateStatusSchema.safeParse({ order: 3 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(3);
    }
  });

  it('accepts only isDefault update', () => {
    const result = updateStatusSchema.safeParse({ isDefault: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isDefault).toBe(true);
    }
  });

  it('rejects an invalid color in update', () => {
    const result = updateStatusSchema.safeParse({ color: 'not-a-color' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid key in update', () => {
    const result = updateStatusSchema.safeParse({ key: 'Invalid Key' });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// reorderStatusesSchema
// =============================================================================
describe('reorderStatusesSchema', () => {
  it('accepts a valid array of status IDs', () => {
    const result = reorderStatusesSchema.safeParse({
      statusIds: ['abc123', 'def456', 'ghi789'],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.statusIds).toHaveLength(3);
    }
  });

  it('accepts a single status ID array', () => {
    const result = reorderStatusesSchema.safeParse({
      statusIds: ['abc123'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty statusIds array', () => {
    const result = reorderStatusesSchema.safeParse({ statusIds: [] });
    expect(result.success).toBe(false);
  });

  it('rejects when statusIds is missing entirely', () => {
    const result = reorderStatusesSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects statusIds containing an empty string', () => {
    const result = reorderStatusesSchema.safeParse({
      statusIds: ['abc123', '', 'def456'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects when statusIds is not an array', () => {
    const result = reorderStatusesSchema.safeParse({ statusIds: 'not-an-array' });
    expect(result.success).toBe(false);
  });
});
