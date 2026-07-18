/**
 * usePolygonDrawing — State machine for polygon drawing on floor plans.
 *
 * Manages a simple FSM: idle → drawing → closed
 * - idle:    No drawing in progress
 * - drawing: User is placing vertices on the canvas
 * - closed:  Polygon completed (≥ 3 vertices placed and confirmed)
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/polygons-floor-plans/spec.md
 *   POLY-002 "Polygon vertex drawing" — click-to-place, close, cancel
 * Design: openspec/changes/phase-11-advanced-features/design.md
 *   Slice D — usePolygonDrawing FSM
 */

'use client';

import { useState, useCallback, useRef } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DrawingState = 'idle' | 'drawing' | 'closed';

export interface Point {
  x: number;
  y: number;
}

export interface PolygonData {
  points: Point[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePolygonDrawing() {
  const [drawingState, setDrawingState] = useState<DrawingState>('idle');
  const [vertices, setVertices] = useState<Point[]>([]);

  // Synchronous ref mirrors for reading current values in callbacks
  const drawingStateRef = useRef<DrawingState>('idle');
  const verticesRef = useRef<Point[]>([]);

  const transitionTo = useCallback((newState: DrawingState) => {
    drawingStateRef.current = newState;
    setDrawingState(newState);
  }, []);

  const startDrawing = useCallback(() => {
    transitionTo('drawing');
    verticesRef.current = [];
    setVertices([]);
  }, [transitionTo]);

  const placeVertex = useCallback(
    (normalizedX: number, normalizedY: number) => {
      if (drawingStateRef.current !== 'drawing') return;
      const next = [...verticesRef.current, { x: normalizedX, y: normalizedY }];
      verticesRef.current = next;
      setVertices(next);
    },
    []
  );

  const undoLastVertex = useCallback(() => {
    if (drawingStateRef.current !== 'drawing') return;
    if (verticesRef.current.length === 0) return;
    const next = verticesRef.current.slice(0, -1);
    verticesRef.current = next;
    setVertices(next);
  }, []);

  const finishPolygon = useCallback((): PolygonData | null => {
    if (drawingStateRef.current !== 'drawing') return null;

    if (verticesRef.current.length < 3) {
      return null; // Stay in drawing mode
    }

    const result: PolygonData = { points: [...verticesRef.current] };
    transitionTo('closed');
    return result;
  }, [transitionTo]);

  const cancel = useCallback(() => {
    transitionTo('idle');
    verticesRef.current = [];
    setVertices([]);
  }, [transitionTo]);

  const reset = useCallback(() => {
    transitionTo('idle');
    verticesRef.current = [];
    setVertices([]);
  }, [transitionTo]);

  return {
    drawingState,
    vertices,
    startDrawing,
    placeVertex,
    undoLastVertex,
    finishPolygon,
    cancel,
    reset,
  };
}
