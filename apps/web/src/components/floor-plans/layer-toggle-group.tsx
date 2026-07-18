/**
 * LayerToggleGroup — Checkbox toggles for floor plan marker layer visibility.
 *
 * Renders a set of checkboxes, one per distinct layer value found in markers.
 * An "All" toggle selects/deselects all layers at once. When no layers are
 * selected (the default), all markers are visible (no layer filter applied).
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/floor-plan-viewer/spec.md
 *   "Layer (category) filter toggles"
 * Design: openspec/changes/phase-11-advanced-features/design.md
 *   Slice A — LayerToggleGroup
 */

'use client';

import React, { useCallback } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LayerToggleGroupProps {
  /** Distinct layer values to display */
  layers: string[];
  /** Currently selected layers (empty = show all) */
  selectedLayers: string[];
  /** Called when a layer checkbox is toggled */
  onToggle: (layer: string) => void;
}

// ---------------------------------------------------------------------------
// LayerToggleGroup
// ---------------------------------------------------------------------------

export function LayerToggleGroup({
  layers,
  selectedLayers,
  onToggle,
}: LayerToggleGroupProps) {
  const handleToggle = useCallback(
    (layer: string) => {
      onToggle(layer);
    },
    [onToggle]
  );

  // Empty layers — render nothing
  if (layers.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 px-1 py-1" role="group" aria-label="Layer filters">
      {layers.map((layer) => {
        const isSelected = selectedLayers.length === 0 || selectedLayers.includes(layer);

        return (
          <label
            key={layer}
            className="inline-flex cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-primary/10 has-[:checked]:text-primary"
          >
            <input
              type="checkbox"
              className="sr-only"
              aria-label={layer}
              checked={isSelected}
              onChange={() => handleToggle(layer)}
            />
            {layer}
          </label>
        );
      })}
    </div>
  );
}
