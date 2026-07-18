// @vitest-environment jsdom
/**
 * Tests for ViewerToolbar component.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-viewer/spec.md
 *   "Type and status layer filters" — toggle visibility, AND across categories
 *   "Zoom and pan controls" — reset button
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewerToolbar, type FilterState } from '../viewer-toolbar';

describe('ViewerToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders zoom in button', () => {
    render(<ViewerToolbar zoom={1} onZoomChange={vi.fn()} onResetView={vi.fn()} />);
    expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
  });

  it('renders zoom out button', () => {
    render(<ViewerToolbar zoom={1} onZoomChange={vi.fn()} onResetView={vi.fn()} />);
    expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
  });

  it('renders reset view button', () => {
    render(<ViewerToolbar zoom={1} onZoomChange={vi.fn()} onResetView={vi.fn()} />);
    expect(screen.getByLabelText('Reset view')).toBeInTheDocument();
  });

  it('displays current zoom level as percentage', () => {
    render(<ViewerToolbar zoom={1.5} onZoomChange={vi.fn()} onResetView={vi.fn()} />);
    expect(screen.getByText('150%')).toBeInTheDocument();
  });

  it('calls onZoomChange with increased zoom when zoom in clicked', () => {
    const onZoomChange = vi.fn();
    render(<ViewerToolbar zoom={1} onZoomChange={onZoomChange} onResetView={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Zoom in'));
    expect(onZoomChange).toHaveBeenCalledWith(expect.closeTo(1.2, 5));
  });

  it('calls onZoomChange with decreased zoom when zoom out clicked', () => {
    const onZoomChange = vi.fn();
    render(<ViewerToolbar zoom={2} onZoomChange={onZoomChange} onResetView={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('Zoom out'));
    expect(onZoomChange).toHaveBeenCalledWith(expect.closeTo(1.6, 5));
  });

  it('calls onResetView when reset button clicked', () => {
    const onResetView = vi.fn();
    render(<ViewerToolbar zoom={3} onZoomChange={vi.fn()} onResetView={onResetView} />);

    fireEvent.click(screen.getByLabelText('Reset view'));
    expect(onResetView).toHaveBeenCalledTimes(1);
  });

  it('renders search input for marker filtering', () => {
    render(
      <ViewerToolbar
        zoom={1}
        onZoomChange={vi.fn()}
        onResetView={vi.fn()}
        filter={{}}
        onFilterChange={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText('Search markers...')).toBeInTheDocument();
  });

  it('calls onFilterChange when search text changes', () => {
    const onFilterChange = vi.fn();
    render(
      <ViewerToolbar
        zoom={1}
        onZoomChange={vi.fn()}
        onResetView={vi.fn()}
        filter={{}}
        onFilterChange={onFilterChange}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('Search markers...'), {
      target: { value: 'Room' },
    });

    expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ search: 'Room' }));
  });

  it('does not render search when no onFilterChange provided', () => {
    render(<ViewerToolbar zoom={1} onZoomChange={vi.fn()} onResetView={vi.fn()} />);
    expect(screen.queryByPlaceholderText('Search markers...')).not.toBeInTheDocument();
  });

  it('disables zoom out at minimum zoom', () => {
    render(<ViewerToolbar zoom={0.5} onZoomChange={vi.fn()} onResetView={vi.fn()} />);
    expect(screen.getByLabelText('Zoom out')).toBeDisabled();
  });

  it('disables zoom in at maximum zoom', () => {
    render(<ViewerToolbar zoom={5} onZoomChange={vi.fn()} onResetView={vi.fn()} />);
    expect(screen.getByLabelText('Zoom in')).toBeDisabled();
  });
});

describe('FilterState type', () => {
  it('accepts search property', () => {
    const filter: FilterState = { search: 'Room' };
    expect(filter.search).toBe('Room');
  });

  it('accepts hasItem property', () => {
    const filter: FilterState = { hasItem: true };
    expect(filter.hasItem).toBe(true);
  });
});
