/**
 * ViewerToolbar — Zoom/pan controls and marker filter for floor plan viewer.
 *
 * Provides zoom in/out buttons, reset view button, zoom percentage display,
 * and optional search input for filtering markers by label.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-viewer/spec.md
 *   "Zoom and pan controls" — zoom in/out, reset
 *   "Type and status layer filters" — search filter
 */

'use client';

import React, { useCallback } from 'react';
import { MIN_ZOOM, MAX_ZOOM, ZOOM_STEP, clampZoom } from './floor-plan-utils';
import { LayerToggleGroup } from './layer-toggle-group';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FilterState {
  search?: string;
  hasItem?: boolean;
  categories?: Record<string, boolean>;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ViewerToolbarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetView: () => void;
  filter?: FilterState;
  onFilterChange?: (filter: FilterState) => void;
  layers?: string[];
  isDrawingMode?: boolean;
  onToggleDrawingMode?: () => void;
}

// ---------------------------------------------------------------------------
// ViewerToolbar
// ---------------------------------------------------------------------------

export function ViewerToolbar({
  zoom,
  onZoomChange,
  onResetView,
  filter,
  onFilterChange,
  layers = [],
  isDrawingMode = false,
  onToggleDrawingMode,
}: ViewerToolbarProps) {
  const handleZoomIn = useCallback(() => {
    onZoomChange(clampZoom(zoom * (1 + ZOOM_STEP)));
  }, [zoom, onZoomChange]);

  const handleZoomOut = useCallback(() => {
    onZoomChange(clampZoom(zoom * (1 - ZOOM_STEP)));
  }, [zoom, onZoomChange]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange?.({ ...filter, search: e.target.value });
    },
    [filter, onFilterChange]
  );

  const handleLayerToggle = useCallback(
    (layer: string) => {
      if (!onFilterChange) return;
      const currentCategories = filter?.categories ?? {};
      const isEnabled = currentCategories[layer] ?? true;
      onFilterChange({
        ...filter,
        categories: { ...currentCategories, [layer]: !isEnabled },
      });
    },
    [filter, onFilterChange]
  );

  const zoomPercent = Math.round(zoom * 100);
  const isAtMin = zoom <= MIN_ZOOM;
  const isAtMax = zoom >= MAX_ZOOM;

  return (
    <div className="flex items-center gap-2 border-b bg-background px-3 py-2">
      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={isAtMin}
          onClick={handleZoomOut}
          className="flex h-8 w-8 items-center justify-center rounded-md border text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          −
        </button>
        <span className="min-w-[3rem] text-center text-sm tabular-nums">
          {zoomPercent}%
        </span>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={isAtMax}
          onClick={handleZoomIn}
          className="flex h-8 w-8 items-center justify-center rounded-md border text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          +
        </button>
        <button
          type="button"
          aria-label="Reset view"
          onClick={onResetView}
          className="ml-1 flex h-8 items-center justify-center rounded-md border px-2 text-sm hover:bg-accent"
        >
          Reset
        </button>

        {/* Draw Polygon mode toggle */}
        {onToggleDrawingMode && (
          <button
            type="button"
            aria-label={isDrawingMode ? 'Cancel drawing' : 'Draw polygon'}
            onClick={onToggleDrawingMode}
            className={`ml-2 flex h-8 items-center justify-center rounded-md border px-2 text-sm ${
              isDrawingMode
                ? 'bg-primary text-primary-foreground border-primary'
                : 'hover:bg-accent'
            }`}
          >
            {isDrawingMode ? 'Cancel' : 'Draw Polygon'}
          </button>
        )}
      </div>

      {/* Layer toggle group */}
      {layers.length > 0 && onFilterChange && (
        <LayerToggleGroup
          layers={layers}
          selectedLayers={Object.entries(filter?.categories ?? {}).filter(([, v]) => v).map(([k]) => k)}
          onToggle={handleLayerToggle}
        />
      )}

      {/* Search filter (optional) */}
      {onFilterChange && (
        <div className="ml-auto">
          <input
            type="text"
            placeholder="Search markers..."
            value={filter?.search ?? ''}
            onChange={handleSearchChange}
            className="h-8 w-48 rounded-md border bg-background px-2 text-sm focus-visible:outline-none"
          />
        </div>
      )}
    </div>
  );
}
