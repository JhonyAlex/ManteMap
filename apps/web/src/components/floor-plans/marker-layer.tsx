/**
 * MarkerLayer — Renders draggable markers on a Konva canvas layer.
 *
 * Markers are positioned using normalized coordinates (0-1) scaled to
 * image pixel dimensions. Supports filtering, click, and drag reposition.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-viewer/spec.md
 *   "Marker rendering and interaction" — positioned icons, click-to-open
 *   "Draggable marker repositioning" — owner can drag, persist via API
 *   "Type and status layer filters" — toggle visibility
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import { Layer, Circle, Text, Group } from 'react-konva';
import type { MarkerSummary } from '@/hooks/use-floor-plans';
import { normalizedToPixel, pixelToNormalized, filterMarkers, type MarkerFilter } from './floor-plan-utils';

// Re-export filterMarkers for tests
export { filterMarkers, type MarkerFilter };

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MarkerLayerProps {
  markers: MarkerSummary[];
  imageWidth: number;
  imageHeight: number;
  scaleX: number;
  scaleY: number;
  canDrag?: boolean;
  filter?: MarkerFilter;
  onMarkerClick?: (markerId: string) => void;
  onDragEnd?: (markerId: string, normalizedX: number, normalizedY: number) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MARKER_RADIUS = 12;
const MARKER_COLOR_DEFAULT = '#3b82f6';

// ---------------------------------------------------------------------------
// MarkerLayer
// ---------------------------------------------------------------------------

export function MarkerLayer({
  markers,
  imageWidth,
  imageHeight,
  scaleX,
  scaleY,
  canDrag = false,
  filter,
  onMarkerClick,
  onDragEnd,
}: MarkerLayerProps) {
  // Apply filters
  const visibleMarkers = useMemo(() => {
    if (!filter) return markers;
    return filterMarkers(markers, filter);
  }, [markers, filter]);

  // Handle marker click
  const handleClick = useCallback(
    (markerId: string) => {
      onMarkerClick?.(markerId);
    },
    [onMarkerClick]
  );

  // Handle marker drag end — convert pixel back to normalized
  const handleDragEnd = useCallback(
    (markerId: string, e: { target: { x: () => number; y: () => number } }) => {
      if (!onDragEnd) return;
      const pixelX = e.target.x();
      const pixelY = e.target.y();
      const normalized = pixelToNormalized(pixelX, pixelY, imageWidth, imageHeight);
      onDragEnd(markerId, normalized.x, normalized.y);
    },
    [onDragEnd, imageWidth, imageHeight]
  );

  return (
    <Layer>
      {visibleMarkers.map((marker) => {
        const pixel = normalizedToPixel(marker.x, marker.y, imageWidth, imageHeight);

        return (
          <Group key={marker.id}>
            {/* Marker circle */}
            <Circle
              x={pixel.x}
              y={pixel.y}
              radius={MARKER_RADIUS}
              fill={marker.color || MARKER_COLOR_DEFAULT}
              stroke="#ffffff"
              strokeWidth={2}
              draggable={canDrag}
              onClick={() => handleClick(marker.id)}
              onTap={() => handleClick(marker.id)}
              onDragEnd={(e: { target: { x: () => number; y: () => number } }) =>
                handleDragEnd(marker.id, e)
              }
              dataLabel={marker.label}
            />
            {/* Label text */}
            {marker.label && (
              <Text
                x={pixel.x - 30}
                y={pixel.y + MARKER_RADIUS + 4}
                text={marker.label}
                fontSize={12}
                fill="#374151"
                width={60}
                align="center"
              />
            )}
          </Group>
        );
      })}
    </Layer>
  );
}
