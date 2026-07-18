/**
 * Pure utility functions for floor plan viewer.
 *
 * Coordinate conversion (normalized ↔ pixel), zoom clamping, and
 * marker filtering logic. All functions are pure — no side effects.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-viewer/spec.md
 *   "Marker rendering and interaction" — normalized coords to pixel
 *   "Zoom and pan controls" — min 0.5x, max 5x
 */

import type { MarkerSummary } from '@/hooks/use-floor-plans';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single 2D point used for polygon vertices. */
export interface Point {
  x: number;
  y: number;
}

/** Result of polygon vertex validation. */
export interface PolygonValidationResult {
  valid: boolean;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 0.2;

// ---------------------------------------------------------------------------
// Coordinate conversion
// ---------------------------------------------------------------------------

/**
 * Convert normalized coordinates (0-1) to pixel coordinates on an image.
 */
export function normalizedToPixel(
  normX: number,
  normY: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  return {
    x: normX * imageWidth,
    y: normY * imageHeight,
  };
}

/**
 * Convert pixel coordinates back to normalized (0-1) on an image.
 */
export function pixelToNormalized(
  pixelX: number,
  pixelY: number,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  return {
    x: pixelX / imageWidth,
    y: pixelY / imageHeight,
  };
}

// ---------------------------------------------------------------------------
// Zoom
// ---------------------------------------------------------------------------

/**
 * Clamp zoom level to allowed range [MIN_ZOOM, MAX_ZOOM].
 */
export function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, MIN_ZOOM), MAX_ZOOM);
}

// ---------------------------------------------------------------------------
// Marker filtering
// ---------------------------------------------------------------------------

export interface MarkerFilter {
  search?: string;
  hasItem?: boolean;
  selectedLayers?: string[];
}

/**
 * Filter markers by search text, item presence, and layer selection.
 * Search is case-insensitive label match. hasItem filters by itemId presence.
 * selectedLayers filters by marker.layer field — only markers whose layer is
 * in the selectedLayers array are shown. An empty or undefined selectedLayers
 * means no layer filter is applied (show all).
 * Filters combine with AND logic.
 */
export function filterMarkers(
  markers: MarkerSummary[],
  filter: MarkerFilter
): MarkerSummary[] {
  return markers.filter((marker) => {
    if (filter.search) {
      const lowerSearch = filter.search.toLowerCase();
      const label = marker.label?.toLowerCase() ?? '';
      if (!label.includes(lowerSearch)) return false;
    }
    if (filter.hasItem !== undefined) {
      const markerHasItem = marker.itemId !== null;
      if (markerHasItem !== filter.hasItem) return false;
    }
    if (filter.selectedLayers && filter.selectedLayers.length > 0) {
      const markerLayer = marker.layer ?? null;
      if (!markerLayer || !filter.selectedLayers.includes(markerLayer)) return false;
    }
    return true;
  });
}

// ---------------------------------------------------------------------------
// Polygon vertex coordinate conversion
// ---------------------------------------------------------------------------

/**
 * Convert an array of normalized coordinate vertices (0–1) to pixel coordinates.
 * Each vertex is scaled independently by image dimensions.
 */
export function normalizedVerticesToPixel(
  vertices: Point[],
  imageWidth: number,
  imageHeight: number
): Point[] {
  return vertices.map((v) => normalizedToPixel(v.x, v.y, imageWidth, imageHeight));
}

/**
 * Convert an array of pixel coordinate vertices back to normalized (0–1).
 */
export function pixelToNormalizedVertices(
  vertices: Point[],
  imageWidth: number,
  imageHeight: number
): Point[] {
  return vertices.map((v) => pixelToNormalized(v.x, v.y, imageWidth, imageHeight));
}

// ---------------------------------------------------------------------------
// Polygon validation
// ---------------------------------------------------------------------------

/**
 * Validate that polygon vertices form a valid shape.
 * A polygon requires at least 3 vertices, each with numeric x and y.
 */
export function validatePolygonVertices(
  vertices: Point[] | null | undefined
): PolygonValidationResult {
  if (!vertices || !Array.isArray(vertices)) {
    return { valid: false, error: 'vertices array is required' };
  }

  if (vertices.length < 3) {
    return { valid: false, error: `Polygon requires at least 3 vertices, got ${vertices.length}` };
  }

  for (let i = 0; i < vertices.length; i++) {
    const v = vertices[i];
    if (typeof v.x !== 'number' || typeof v.y !== 'number') {
      return {
        valid: false,
        error: `Vertex at index ${i} must have numeric x and y properties`,
      };
    }
  }

  return { valid: true, error: null };
}
