// @vitest-environment jsdom
/**
 * Tests for LayerToggleGroup component.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/floor-plan-viewer/spec.md
 *   "Layer (category) filter toggles" — checkbox buttons, AND logic
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayerToggleGroup } from '../layer-toggle-group';

describe('LayerToggleGroup', () => {
  const layers = ['safety', 'equipment', 'hvac', 'electrical'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a toggle button for each layer', () => {
    render(
      <LayerToggleGroup
        layers={layers}
        selectedLayers={[]}
        onToggle={vi.fn()}
      />
    );

    for (const layer of layers) {
      expect(screen.getByText(layer, { exact: false })).toBeInTheDocument();
    }
  });

  it('shows all checkboxes checked when selectedLayers is empty (show all)', () => {
    render(
      <LayerToggleGroup
        layers={layers}
        selectedLayers={[]}
        onToggle={vi.fn()}
      />
    );

    // When nothing is selected, all checkboxes show as checked (meaning "show all")
    const safetyCheckbox = screen.getByLabelText('safety') as HTMLInputElement;
    const hvacCheckbox = screen.getByLabelText('hvac') as HTMLInputElement;
    expect(safetyCheckbox.checked).toBe(true);
    expect(hvacCheckbox.checked).toBe(true);
  });

  it('shows checkboxes as checked when layer is selected', () => {
    render(
      <LayerToggleGroup
        layers={layers}
        selectedLayers={['safety', 'equipment']}
        onToggle={vi.fn()}
      />
    );

    const safetyCheckbox = screen.getByLabelText('safety') as HTMLInputElement;
    const hvacCheckbox = screen.getByLabelText('hvac') as HTMLInputElement;

    expect(safetyCheckbox.checked).toBe(true);
    expect(hvacCheckbox.checked).toBe(false);
  });

  it('calls onToggle with layer name when checkbox is clicked', () => {
    const onToggle = vi.fn();
    render(
      <LayerToggleGroup
        layers={layers}
        selectedLayers={[]}
        onToggle={onToggle}
      />
    );

    fireEvent.click(screen.getByLabelText('safety'));
    expect(onToggle).toHaveBeenCalledWith('safety');
  });

  it('calls onToggle when a previously unselected layer checkbox is clicked', () => {
    const onToggle = vi.fn();
    render(
      <LayerToggleGroup
        layers={layers}
        selectedLayers={['safety']}
        onToggle={onToggle}
      />
    );

    // equipment is NOT in selectedLayers, so toggling it should call onToggle
    fireEvent.click(screen.getByLabelText('equipment'));
    expect(onToggle).toHaveBeenCalledWith('equipment');
  });

  it('renders no checkboxes when layers array is empty', () => {
    render(
      <LayerToggleGroup
        layers={[]}
        selectedLayers={[]}
        onToggle={vi.fn()}
      />
    );

    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);
  });

  it('renders layers in the order provided', () => {
    render(
      <LayerToggleGroup
        layers={['electrical', 'safety']}
        selectedLayers={[]}
        onToggle={vi.fn()}
      />
    );

    const labels = screen.getAllByRole('checkbox');
    expect(labels[0].getAttribute('aria-label')).toBe('electrical');
    expect(labels[1].getAttribute('aria-label')).toBe('safety');
  });
});
