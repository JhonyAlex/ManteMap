/**
 * Tests for floor-plan-utils polygon coordinate functions.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/polygons-floor-plans/spec.md
 *   POLY-006 "Normalized coordinate storage" — convert normalized to pixel and back
 *   POLY-005 "Polygon validation" — minimum 3 vertices
 */

import { describe, it, expect } from 'vitest';
import {
  normalizedToPixel,
  pixelToNormalized,
  normalizedVerticesToPixel,
  pixelToNormalizedVertices,
  validatePolygonVertices,
} from '../floor-plan-utils';

// ---------------------------------------------------------------------------
// Existing functions — regression safety net
// ---------------------------------------------------------------------------

describe('normalizedToPixel (existing)', () => {
  it('converts (0.5, 0.5) on 800x600 to (400, 300)', () => {
    const result = normalizedToPixel(0.5, 0.5, 800, 600);
    expect(result).toEqual({ x: 400, y: 300 });
  });

  it('converts (0, 0) to (0, 0)', () => {
    const result = normalizedToPixel(0, 0, 800, 600);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('converts (1, 1) to image dimensions', () => {
    const result = normalizedToPixel(1, 1, 800, 600);
    expect(result).toEqual({ x: 800, y: 600 });
  });
});

describe('pixelToNormalized (existing)', () => {
  it('converts (400, 300) on 800x600 to (0.5, 0.5)', () => {
    const result = pixelToNormalized(400, 300, 800, 600);
    expect(result).toEqual({ x: 0.5, y: 0.5 });
  });

  it('converts (0, 0) to (0, 0)', () => {
    const result = pixelToNormalized(0, 0, 800, 600);
    expect(result).toEqual({ x: 0, y: 0 });
  });
});

// ---------------------------------------------------------------------------
// normalizedVerticesToPixel
// ---------------------------------------------------------------------------

describe('normalizedVerticesToPixel', () => {
  it('converts a single vertex from normalized to pixel', () => {
    const vertices = [{ x: 0.5, y: 0.5 }];
    const result = normalizedVerticesToPixel(vertices, 800, 600);
    expect(result).toEqual([{ x: 400, y: 300 }]);
  });

  it('converts multiple vertices', () => {
    const vertices = [
      { x: 0.2, y: 0.2 },
      { x: 0.5, y: 0.2 },
      { x: 0.5, y: 0.5 },
      { x: 0.2, y: 0.5 },
    ];
    const result = normalizedVerticesToPixel(vertices, 800, 600);
    expect(result).toEqual([
      { x: 160, y: 120 },
      { x: 400, y: 120 },
      { x: 400, y: 300 },
      { x: 160, y: 300 },
    ]);
  });

  it('returns empty array for empty input', () => {
    const result = normalizedVerticesToPixel([], 800, 600);
    expect(result).toEqual([]);
  });

  it('handles zero-dimension image gracefully', () => {
    const vertices = [{ x: 0.5, y: 0.5 }];
    const result = normalizedVerticesToPixel(vertices, 0, 0);
    expect(result).toEqual([{ x: 0, y: 0 }]);
  });

  it('handles boundary vertices (0,0) and (1,1)', () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ];
    const result = normalizedVerticesToPixel(vertices, 1000, 500);
    expect(result).toEqual([
      { x: 0, y: 0 },
      { x: 1000, y: 500 },
    ]);
  });

  it('does not mutate the input array', () => {
    const vertices = [{ x: 0.5, y: 0.3 }];
    const original = JSON.stringify(vertices);
    normalizedVerticesToPixel(vertices, 800, 600);
    expect(JSON.stringify(vertices)).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// pixelToNormalizedVertices
// ---------------------------------------------------------------------------

describe('pixelToNormalizedVertices', () => {
  it('converts a single vertex from pixel to normalized', () => {
    const vertices = [{ x: 400, y: 300 }];
    const result = pixelToNormalizedVertices(vertices, 800, 600);
    expect(result).toEqual([{ x: 0.5, y: 0.5 }]);
  });

  it('converts multiple vertices', () => {
    const vertices = [
      { x: 160, y: 120 },
      { x: 400, y: 120 },
      { x: 400, y: 300 },
      { x: 160, y: 300 },
    ];
    const result = pixelToNormalizedVertices(vertices, 800, 600);
    // Use toBeCloseTo for floating point precision
    expect(result).toHaveLength(4);
    expect(result[0].x).toBeCloseTo(0.2, 10);
    expect(result[0].y).toBeCloseTo(0.2, 10);
    expect(result[1].x).toBeCloseTo(0.5, 10);
    expect(result[1].y).toBeCloseTo(0.2, 10);
  });

  it('returns empty array for empty input', () => {
    const result = pixelToNormalizedVertices([], 800, 600);
    expect(result).toEqual([]);
  });

  it('round-trips: normalized → pixel → normalized returns original', () => {
    const original = [
      { x: 0.2, y: 0.3 },
      { x: 0.5, y: 0.6 },
      { x: 0.7, y: 0.1 },
    ];
    const pixel = normalizedVerticesToPixel(original, 800, 600);
    const back = pixelToNormalizedVertices(pixel, 800, 600);
    back.forEach((v, i) => {
      expect(v.x).toBeCloseTo(original[i].x, 10);
      expect(v.y).toBeCloseTo(original[i].y, 10);
    });
  });

  it('does not mutate the input array', () => {
    const vertices = [{ x: 400, y: 300 }];
    const original = JSON.stringify(vertices);
    pixelToNormalizedVertices(vertices, 800, 600);
    expect(JSON.stringify(vertices)).toBe(original);
  });
});

// ---------------------------------------------------------------------------
// validatePolygonVertices
// ---------------------------------------------------------------------------

describe('validatePolygonVertices', () => {
  it('returns valid for 3 vertices', () => {
    const vertices = [
      { x: 0, y: 0 },
      { x: 0.5, y: 0 },
      { x: 0.5, y: 0.5 },
    ];
    const result = validatePolygonVertices(vertices);
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('returns valid for 4 vertices', () => {
    const vertices = [
      { x: 0.2, y: 0.2 },
      { x: 0.5, y: 0.2 },
      { x: 0.5, y: 0.5 },
      { x: 0.2, y: 0.5 },
    ];
    const result = validatePolygonVertices(vertices);
    expect(result.valid).toBe(true);
  });

  it('returns valid for many vertices', () => {
    const vertices = Array.from({ length: 10 }, (_, i) => ({ x: i / 10, y: 0.5 }));
    const result = validatePolygonVertices(vertices);
    expect(result.valid).toBe(true);
  });

  it('rejects empty array', () => {
    const result = validatePolygonVertices([]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 3 vertices');
  });

  it('rejects 1 vertex', () => {
    const result = validatePolygonVertices([{ x: 0.1, y: 0.2 }]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 3 vertices');
  });

  it('rejects 2 vertices', () => {
    const result = validatePolygonVertices([
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.9 },
    ]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('at least 3 vertices');
  });

  it('rejects null input', () => {
    const result = validatePolygonVertices(null as unknown as Array<{ x: number; y: number }>);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('vertices array');
  });

  it('rejects undefined input', () => {
    const result = validatePolygonVertices(undefined as unknown as Array<{ x: number; y: number }>);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('vertices array');
  });

  it('rejects vertex with missing x', () => {
    const vertices = [
      { y: 0.2 } as unknown as { x: number; y: number },
      { x: 0.5, y: 0.2 },
      { x: 0.5, y: 0.5 },
    ];
    const result = validatePolygonVertices(vertices);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('x and y');
  });

  it('rejects vertex with missing y', () => {
    const vertices = [
      { x: 0.2 },
      { x: 0.5, y: 0.2 },
      { x: 0.5, y: 0.5 },
    ] as Array<{ x: number; y: number }>;
    const result = validatePolygonVertices(vertices);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('x and y');
  });
});
