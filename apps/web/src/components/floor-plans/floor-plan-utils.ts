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
}

/**
 * Filter markers by search text and item presence.
 * Search is case-insensitive label match. hasItem filters by itemId presence.
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
    return true;
  });
}
