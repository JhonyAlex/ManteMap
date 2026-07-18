/**
 * PolygonLayer — Renders polygon zones on a Konva floor plan canvas.
 *
 * Filters markers to only POLYGON type, renders closed Konva <Line>
 * shapes with fill/stroke styling, and provides vertex drag handles
 * for editing.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/polygons-floor-plans/spec.md
 *   POLY-001 "Polymorphic marker type" — render POLYGON markers
 *   POLY-003 "Vertex dragging" — vertex drag handles
 *   POLY-004 "Fill and stroke styling" — fillColor, strokeColor, strokeWidth
 *   POLY-006 "Normalized coordinates" — convert normalized to pixel
 * Design: openspec/changes/phase-11-advanced-features/design.md
 *   Slice D — PolygonLayer
 */

'use client';

import React, { useMemo } from 'react';
import { Layer, Line, Circle, Text, Group } from 'react-konva';
import type { MarkerSummary } from '@/hooks/use-floor-plans';
import { normalizedVerticesToPixel, type Point } from './floor-plan-utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PolygonLayerProps {
  markers: MarkerSummary[];
  imageWidth: number;
  imageHeight: number;
  scaleX: number;
  scaleY: number;
  canDrag?: boolean;
  onPolygonClick?: (markerId: string) => void;
  onVertexDragEnd?: (markerId: string, vertexIndex: number, normalizedX: number, normalizedY: number) => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VERTEX_HANDLE_RADIUS = 6;
const DEFAULT_FILL = 'rgba(59,130,246,0.15)';
const DEFAULT_STROKE = '#3b82f6';
const DEFAULT_STROKE_WIDTH = 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compute the centroid of an array of points.
 */
function centroid(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  return { x: sumX / points.length, y: sumY / points.length };
}

/**
 * Convert an array of Point to a flat number array for Konva Line `points` prop.
 */
function pointsToFlatArray(vertices: Point[]): number[] {
  return vertices.flatMap((v) => [v.x, v.y]);
}

// ---------------------------------------------------------------------------
// PolygonLayer
// ---------------------------------------------------------------------------

export function PolygonLayer({
  markers,
  imageWidth,
  imageHeight,
  scaleX,
  scaleY,
  canDrag = false,
  onPolygonClick,
  onVertexDragEnd,
}: PolygonLayerProps) {
  // Filter to only POLYGON markers
  const polygonMarkers = useMemo(
    () => markers.filter((m) => m.type === 'POLYGON' && m.points && m.points.length >= 3),
    [markers]
  );

  return (
    <Layer>
      {polygonMarkers.map((marker) => {
        const vertices = normalizedVerticesToPixel(marker.points!, imageWidth, imageHeight);
        const flatPoints = pointsToFlatArray(vertices);
        const center = centroid(vertices);

        return (
          <Group key={marker.id}>
            {/* Polygon shape */}
            <Line
              points={flatPoints}
              closed={true}
              fill={marker.fillColor || DEFAULT_FILL}
              stroke={marker.strokeColor || DEFAULT_STROKE}
              strokeWidth={marker.strokeWidth ?? DEFAULT_STROKE_WIDTH}
              onClick={() => onPolygonClick?.(marker.id)}
              onTap={() => onPolygonClick?.(marker.id)}
            />

            {/* Vertex drag handles */}
            {canDrag &&
              vertices.map((vertex, vertexIndex) => (
                <Circle
                  key={`${marker.id}-v${vertexIndex}`}
                  x={vertex.x}
                  y={vertex.y}
                  radius={VERTEX_HANDLE_RADIUS}
                  fill="#ffffff"
                  stroke={marker.strokeColor || DEFAULT_STROKE}
                  strokeWidth={2}
                  draggable={canDrag}
                  onDragEnd={(e: { target: { x: () => number; y: () => number } }) => {
                    if (!onVertexDragEnd) return;
                    const pixelX = e.target.x();
                    const pixelY = e.target.y();
                    // Convert back to normalized
                    const normX = pixelX / imageWidth;
                    const normY = pixelY / imageHeight;
                    onVertexDragEnd(marker.id, vertexIndex, normX, normY);
                  }}
                />
              ))}

            {/* Label at centroid */}
            {marker.label && (
              <Text
                x={center.x - 30}
                y={center.y - 8}
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
