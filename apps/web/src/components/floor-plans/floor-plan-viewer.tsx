/**
 * FloorPlanViewer — Dynamic-imported React Konva floor plan viewer.
 *
 * Uses dynamic(() => import(...), { ssr: false }) to lazy-load the Konva
 * canvas. Renders floor plan image with zoom/pan, draggable markers,
 * and filter toolbar.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-viewer/spec.md
 *   "Canvas rendering with dynamic import" — SSR disabled
 *   "Zoom and pan controls" — mouse wheel, reset
 *   "Marker rendering and interaction" — normalized coords
 *   "Responsive container" — resize to parent
 */

'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { MarkerSummary } from '@/hooks/use-floor-plans';
import { clampZoom, MIN_ZOOM, ZOOM_STEP } from './floor-plan-utils';
import { ViewerToolbar, type FilterState } from './viewer-toolbar';

// Dynamic import of the canvas component (SSR disabled)
const FloorPlanCanvas = dynamic(
  () => import('./floor-plan-canvas').then((mod) => mod.FloorPlanCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading floor plan viewer...</div>
      </div>
    ),
  }
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FloorPlanViewerProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  markers: MarkerSummary[];
  canDrag?: boolean;
  onMarkerClick?: (markerId: string) => void;
  onMarkerDragEnd?: (markerId: string, normalizedX: number, normalizedY: number) => void;
}

// ---------------------------------------------------------------------------
// FloorPlanViewer
// ---------------------------------------------------------------------------

export function FloorPlanViewer({
  imageUrl,
  imageWidth,
  imageHeight,
  markers,
  canDrag = false,
  onMarkerClick,
  onMarkerDragEnd,
}: FloorPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [filter, setFilter] = useState<FilterState>({});

  // Derive distinct layers from markers
  const layers = useMemo(() => {
    const layerSet = new Set<string>();
    for (const marker of markers) {
      if (marker.layer) layerSet.add(marker.layer);
    }
    return Array.from(layerSet).sort();
  }, [markers]);

  // Convert FilterState.categories to MarkerFilter.selectedLayers
  const markerFilter = useMemo(() => {
    const selectedLayers = filter.categories
      ? Object.entries(filter.categories)
          .filter(([, enabled]) => enabled)
          .map(([layer]) => layer)
      : undefined;

    return {
      search: filter.search,
      selectedLayers,
    };
  }, [filter]);

  // Observe container size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width: Math.floor(width), height: Math.floor(height) });
        }
      }
    });

    observer.observe(container);
    // Initial measurement
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDimensions({ width: Math.floor(rect.width), height: Math.floor(rect.height) });
    }

    return () => observer.disconnect();
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
  }, []);

  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(clampZoom(newZoom));
  }, []);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <ViewerToolbar
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onResetView={handleResetView}
        filter={filter}
        onFilterChange={setFilter}
        layers={layers}
      />

      {/* Canvas container — fills remaining space */}
      <div ref={containerRef} className="relative flex-1 bg-muted/20">
        {dimensions.width > 0 && dimensions.height > 0 && (
          <FloorPlanCanvas
            imageUrl={imageUrl}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            containerWidth={dimensions.width}
            containerHeight={dimensions.height}
            markers={markers}
            canDrag={canDrag}
            filter={markerFilter}
            onMarkerClick={onMarkerClick}
            onMarkerDragEnd={onMarkerDragEnd}
          />
        )}
      </div>
    </div>
  );
}
