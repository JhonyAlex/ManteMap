/**
 * FloorPlanCanvas — Inner canvas component for floor plan rendering.
 *
 * Renders a Konva Stage with floor plan image and markers.
 * This is the inner component; the outer FloorPlanViewer uses dynamic import.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-viewer/spec.md
 *   "Canvas rendering with dynamic import"
 *   "Marker rendering and interaction" — normalized coords
 *   "Responsive container" — resize to parent
 */

'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import type Konva from 'konva';
import type { MarkerSummary } from '@/hooks/use-floor-plans';
import { MarkerLayer } from './marker-layer';
import { PolygonLayer } from './polygon-layer';
import type { MarkerFilter } from './floor-plan-utils';
import { clampZoom, ZOOM_STEP } from './floor-plan-utils';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FloorPlanCanvasProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  containerWidth: number;
  containerHeight: number;
  markers: MarkerSummary[];
  canDrag?: boolean;
  filter?: MarkerFilter;
  onMarkerClick?: (markerId: string) => void;
  onMarkerDragEnd?: (markerId: string, normalizedX: number, normalizedY: number) => void;
  onPolygonClick?: (markerId: string) => void;
  onVertexDragEnd?: (markerId: string, vertexIndex: number, normalizedX: number, normalizedY: number) => void;
}

// ---------------------------------------------------------------------------
// FloorPlanCanvas
// ---------------------------------------------------------------------------

export function FloorPlanCanvas({
  imageUrl,
  imageWidth,
  imageHeight,
  containerWidth,
  containerHeight,
  markers,
  canDrag = false,
  filter,
  onMarkerClick,
  onMarkerDragEnd,
  onPolygonClick,
  onVertexDragEnd,
}: FloorPlanCanvasProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const stageRef = useRef<Konva.Stage | null>(null);

  // Load the floor plan image
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => setImage(img);
    img.src = imageUrl;
  }, [imageUrl]);

  // Calculate scale to fit image in container
  const scaleX = containerWidth / imageWidth;
  const scaleY = containerHeight / imageHeight;
  const fitScale = Math.min(scaleX, scaleY);

  // Handle mouse wheel zoom
  const handleWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldZoom = zoom;
      const newZoom = clampZoom(
        e.evt.deltaY > 0 ? oldZoom * (1 - ZOOM_STEP) : oldZoom * (1 + ZOOM_STEP)
      );

      if (newZoom === oldZoom) return;

      // Zoom toward cursor position
      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - position.x) / oldZoom,
        y: (pointer.y - position.y) / oldZoom,
      };

      setZoom(newZoom);
      setPosition({
        x: pointer.x - mousePointTo.x * newZoom,
        y: pointer.y - mousePointTo.y * newZoom,
      });
    },
    [zoom, position]
  );

  // Handle drag for panning
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      setPosition({ x: e.target.x(), y: e.target.y() });
    },
    []
  );

  // Reset to default view
  const resetView = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  return (
    <div
      data-testid="floor-plan-canvas-container"
      style={{ width: containerWidth, height: containerHeight, overflow: 'hidden' }}
    >
      <Stage
        ref={stageRef}
        width={containerWidth}
        height={containerHeight}
        scaleX={zoom}
        scaleY={zoom}
        x={position.x}
        y={position.y}
        draggable
        onDragEnd={handleDragEnd}
        onWheel={handleWheel}
      >
        {/* Floor plan image layer */}
        <Layer>
          {image && (
            <KonvaImage
              image={image}
              width={imageWidth * fitScale}
              height={imageHeight * fitScale}
            />
          )}
        </Layer>

        {/* Markers layer */}
        <MarkerLayer
          markers={markers}
          imageWidth={imageWidth * fitScale}
          imageHeight={imageHeight * fitScale}
          scaleX={fitScale}
          scaleY={fitScale}
          canDrag={canDrag}
          filter={filter}
          onMarkerClick={onMarkerClick}
          onDragEnd={onMarkerDragEnd}
        />

        {/* Polygons layer */}
        <PolygonLayer
          markers={markers}
          imageWidth={imageWidth * fitScale}
          imageHeight={imageHeight * fitScale}
          scaleX={fitScale}
          scaleY={fitScale}
          canDrag={canDrag}
          onPolygonClick={onPolygonClick}
          onVertexDragEnd={onVertexDragEnd}
        />
      </Stage>
    </div>
  );
}
