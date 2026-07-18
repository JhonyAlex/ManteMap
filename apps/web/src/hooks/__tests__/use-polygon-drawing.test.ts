// @vitest-environment jsdom
/**
 * Tests for usePolygonDrawing hook.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/polygons-floor-plans/spec.md
 *   POLY-002 "Polygon vertex drawing" — click-to-place, close, cancel
 * Design: openspec/changes/phase-11-advanced-features/design.md
 *   Slice D — usePolygonDrawing FSM (idle → drawing → closed)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePolygonDrawing } from '../use-polygon-drawing';

describe('usePolygonDrawing', () => {
  beforeEach(() => {
    // Reset state between tests
  });

  describe('initial state', () => {
    it('starts in idle state', () => {
      const { result } = renderHook(() => usePolygonDrawing());
      expect(result.current.drawingState).toBe('idle');
    });

    it('has empty vertices initially', () => {
      const { result } = renderHook(() => usePolygonDrawing());
      expect(result.current.vertices).toEqual([]);
    });
  });

  describe('startDrawing', () => {
    it('transitions from idle to drawing', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.startDrawing();
      });

      expect(result.current.drawingState).toBe('drawing');
    });

    it('clears vertices when starting new drawing', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      // Start drawing, place vertices, cancel, then start again
      act(() => {
        result.current.startDrawing();
        result.current.placeVertex(0.2, 0.2);
        result.current.placeVertex(0.5, 0.5);
        result.current.cancel();
        result.current.startDrawing();
      });

      expect(result.current.vertices).toEqual([]);
      expect(result.current.drawingState).toBe('drawing');
    });
  });

  describe('placeVertex', () => {
    it('adds a vertex during drawing mode', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.startDrawing();
        result.current.placeVertex(0.3, 0.4);
      });

      expect(result.current.vertices).toEqual([{ x: 0.3, y: 0.4 }]);
    });

    it('adds multiple vertices in order', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.startDrawing();
        result.current.placeVertex(0.1, 0.1);
        result.current.placeVertex(0.5, 0.1);
        result.current.placeVertex(0.5, 0.5);
      });

      expect(result.current.vertices).toHaveLength(3);
      expect(result.current.vertices[0]).toEqual({ x: 0.1, y: 0.1 });
      expect(result.current.vertices[2]).toEqual({ x: 0.5, y: 0.5 });
    });

    it('ignores vertex placement when not in drawing mode', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.placeVertex(0.5, 0.5);
      });

      expect(result.current.vertices).toEqual([]);
    });
  });

  describe('undoLastVertex', () => {
    it('removes the last placed vertex', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.startDrawing();
        result.current.placeVertex(0.1, 0.1);
        result.current.placeVertex(0.5, 0.5);
        result.current.undoLastVertex();
      });

      expect(result.current.vertices).toEqual([{ x: 0.1, y: 0.1 }]);
    });

    it('does nothing when vertices are empty', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.startDrawing();
        result.current.undoLastVertex();
      });

      expect(result.current.vertices).toEqual([]);
    });

    it('does nothing when not in drawing mode', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.undoLastVertex();
      });

      expect(result.current.vertices).toEqual([]);
    });
  });

  describe('finishPolygon', () => {
    it('returns polygon data with valid vertices and transitions to closed', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.startDrawing();
        result.current.placeVertex(0.2, 0.2);
        result.current.placeVertex(0.5, 0.2);
        result.current.placeVertex(0.5, 0.5);
      });

      let polygonData: { points: Array<{ x: number; y: number }> } | null = null;
      act(() => {
        polygonData = result.current.finishPolygon();
      });

      expect(polygonData).not.toBeNull();
      expect(polygonData!.points).toHaveLength(3);
      expect(result.current.drawingState).toBe('closed');
    });

    it('returns null when fewer than 3 vertices', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.startDrawing();
        result.current.placeVertex(0.2, 0.2);
        result.current.placeVertex(0.5, 0.5);
      });

      let polygonData: { points: Array<{ x: number; y: number }> } | null = null;
      act(() => {
        polygonData = result.current.finishPolygon();
      });

      expect(polygonData).toBeNull();
      // Should stay in drawing mode so user can add more vertices
      expect(result.current.drawingState).toBe('drawing');
    });

    it('does nothing when not in drawing mode', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      let polygonData: { points: Array<{ x: number; y: number }> } | null = null;
      act(() => {
        polygonData = result.current.finishPolygon();
      });

      expect(polygonData).toBeNull();
      expect(result.current.drawingState).toBe('idle');
    });
  });

  describe('cancel', () => {
    it('discards vertices and returns to idle', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.startDrawing();
        result.current.placeVertex(0.1, 0.1);
        result.current.placeVertex(0.5, 0.5);
        result.current.cancel();
      });

      expect(result.current.drawingState).toBe('idle');
      expect(result.current.vertices).toEqual([]);
    });

    it('can cancel when no vertices placed', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.startDrawing();
        result.current.cancel();
      });

      expect(result.current.drawingState).toBe('idle');
      expect(result.current.vertices).toEqual([]);
    });
  });

  describe('reset', () => {
    it('resets from closed state to idle', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.startDrawing();
        result.current.placeVertex(0.1, 0.1);
        result.current.placeVertex(0.2, 0.2);
        result.current.placeVertex(0.3, 0.3);
        result.current.finishPolygon();
        result.current.reset();
      });

      expect(result.current.drawingState).toBe('idle');
      expect(result.current.vertices).toEqual([]);
    });

    it('resets from drawing state to idle', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.startDrawing();
        result.current.placeVertex(0.1, 0.1);
        result.current.reset();
      });

      expect(result.current.drawingState).toBe('idle');
      expect(result.current.vertices).toEqual([]);
    });
  });

  describe('polygon data shape', () => {
    it('returns points in the same order they were placed', () => {
      const { result } = renderHook(() => usePolygonDrawing());

      act(() => {
        result.current.startDrawing();
        result.current.placeVertex(0.1, 0.2);
        result.current.placeVertex(0.3, 0.4);
        result.current.placeVertex(0.5, 0.6);
      });

      let polygonData: { points: Array<{ x: number; y: number }> } | null = null;
      act(() => {
        polygonData = result.current.finishPolygon();
      });

      expect(polygonData!.points).toEqual([
        { x: 0.1, y: 0.2 },
        { x: 0.3, y: 0.4 },
        { x: 0.5, y: 0.6 },
      ]);
    });
  });
});
