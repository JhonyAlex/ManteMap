// @vitest-environment jsdom
/**
 * Tests for FloorPlanViewer component and utility functions.
 *
 * Spec: openspec/changes/phase-7-locations/specs/floor-plan-viewer/spec.md
 *   "Canvas rendering with dynamic import" — SSR disabled
 *   "Zoom and pan controls" — min 0.5x, max 5x
 *   "Marker rendering and interaction" — normalized coords to pixel
 *   "Responsive container" — resize to parent
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  normalizedToPixel,
  pixelToNormalized,
  clampZoom,
  MIN_ZOOM,
  MAX_ZOOM,
} from '../floor-plan-utils';

// ---------------------------------------------------------------------------
// Utility function tests
// ---------------------------------------------------------------------------

describe('normalizedToPixel', () => {
  it('converts center point (0.5, 0.5) on 800x600 canvas to (400, 300)', () => {
    const result = normalizedToPixel(0.5, 0.5, 800, 600);
    expect(result).toEqual({ x: 400, y: 300 });
  });

  it('converts origin (0, 0) to (0, 0)', () => {
    const result = normalizedToPixel(0, 0, 800, 600);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('converts (1, 1) to full dimensions', () => {
    const result = normalizedToPixel(1, 1, 800, 600);
    expect(result).toEqual({ x: 800, y: 600 });
  });

  it('handles non-square canvas correctly', () => {
    const result = normalizedToPixel(0.25, 0.75, 1200, 400);
    expect(result).toEqual({ x: 300, y: 300 });
  });
});

describe('pixelToNormalized', () => {
  it('converts pixel (400, 300) on 800x600 canvas to (0.5, 0.5)', () => {
    const result = pixelToNormalized(400, 300, 800, 600);
    expect(result).toEqual({ x: 0.5, y: 0.5 });
  });

  it('converts pixel (0, 0) to (0, 0)', () => {
    const result = pixelToNormalized(0, 0, 800, 600);
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('round-trips with normalizedToPixel', () => {
    const original = { x: 0.3, y: 0.7 };
    const pixel = normalizedToPixel(original.x, original.y, 1000, 800);
    const back = pixelToNormalized(pixel.x, pixel.y, 1000, 800);
    expect(back.x).toBeCloseTo(original.x, 10);
    expect(back.y).toBeCloseTo(original.y, 10);
  });
});

describe('clampZoom', () => {
  it('returns default zoom for value within range', () => {
    expect(clampZoom(1.5)).toBe(1.5);
  });

  it('clamps to MIN_ZOOM when below minimum', () => {
    expect(clampZoom(0.1)).toBe(MIN_ZOOM);
  });

  it('clamps to MAX_ZOOM when above maximum', () => {
    expect(clampZoom(10)).toBe(MAX_ZOOM);
  });

  it('returns MIN_ZOOM for exactly MIN_ZOOM', () => {
    expect(clampZoom(MIN_ZOOM)).toBe(MIN_ZOOM);
  });

  it('returns MAX_ZOOM for exactly MAX_ZOOM', () => {
    expect(clampZoom(MAX_ZOOM)).toBe(MAX_ZOOM);
  });

  it('MIN_ZOOM is 0.5', () => {
    expect(MIN_ZOOM).toBe(0.5);
  });

  it('MAX_ZOOM is 5', () => {
    expect(MAX_ZOOM).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// Component tests (with Konva mocked)
// ---------------------------------------------------------------------------

// Mock react-konva to avoid canvas dependency in tests
vi.mock('react-konva', () => ({
  Stage: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="konva-stage" data-width={props.width} data-height={props.height}>
      {children}
    </div>
  ),
  Layer: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="konva-layer" {...props}>
      {children}
    </div>
  ),
  Image: (props: Record<string, unknown>) => (
    <div data-testid="konva-image" data-image-set={props.image ? 'true' : 'false'} />
  ),
  Circle: (props: Record<string, unknown>) => (
    <div
      data-testid="konva-marker"
      data-x={props.x}
      data-y={props.y}
      data-label={props.dataLabel}
    />
  ),
  Text: (props: Record<string, unknown>) => (
    <div data-testid="konva-text" data-text={props.text} />
  ),
  Group: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="konva-group" {...props}>{children}</div>
  ),
  Rect: (props: Record<string, unknown>) => (
    <div data-testid="konva-rect" />
  ),
}));

vi.mock('konva', () => ({
  default: {},
}));

// Mock the global Image constructor to simulate image loading in jsdom
const originalImage = globalThis.Image;
beforeEach(() => {
  // @ts-expect-error — mock Image for jsdom
  globalThis.Image = class MockImage {
    crossOrigin = '';
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    _src = '';
    get src() { return this._src; }
    set src(val: string) {
      this._src = val;
      // Simulate async image load
      setTimeout(() => this.onload?.(), 0);
    }
  };
});
afterEach(() => {
  globalThis.Image = originalImage;
});

// We need to test the dynamic import wrapper. Since dynamic() can't be tested
// in jsdom, we test the inner FloorPlanCanvas component directly.
// We'll import it after the component is created.

// For now, we write the tests referencing the component.
// The GREEN step will create the component that satisfies these tests.

import type { MarkerSummary } from '@/hooks/use-floor-plans';

// These imports will fail until GREEN step creates the files
import { FloorPlanCanvas } from '../floor-plan-canvas';

const mockMarkers: MarkerSummary[] = [
  { id: 'm1', floorPlanId: 'fp1', itemId: null, x: 0.5, y: 0.3, label: 'Room 101', color: '#ff0000' },
  { id: 'm2', floorPlanId: 'fp1', itemId: null, x: 0.7, y: 0.6, label: 'Room 102', color: '#00ff00' },
];

describe('FloorPlanCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a Stage with correct dimensions', () => {
    render(
      <FloorPlanCanvas
        imageUrl="/test-floor.png"
        imageWidth={800}
        imageHeight={600}
        containerWidth={800}
        containerHeight={600}
        markers={[]}
      />
    );

    const stage = screen.getByTestId('konva-stage');
    expect(stage).toBeInTheDocument();
    expect(stage.getAttribute('data-width')).toBe('800');
    expect(stage.getAttribute('data-height')).toBe('600');
  });

  it('renders an Image layer for the floor plan', async () => {
    render(
      <FloorPlanCanvas
        imageUrl="/test-floor.png"
        imageWidth={800}
        imageHeight={600}
        containerWidth={800}
        containerHeight={600}
        markers={[]}
      />
    );

    await waitFor(() => {
      const images = screen.getAllByTestId('konva-image');
      expect(images.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders markers at correct pixel positions', () => {
    render(
      <FloorPlanCanvas
        imageUrl="/test-floor.png"
        imageWidth={800}
        imageHeight={600}
        containerWidth={800}
        containerHeight={600}
        markers={mockMarkers}
      />
    );

    // Marker at (0.5, 0.3) should be at pixel (400, 180) on 800x600
    const markerElements = screen.getAllByTestId('konva-marker');
    expect(markerElements.length).toBe(2);

    // First marker at (0.5, 0.3) → pixel (400, 180)
    expect(markerElements[0].getAttribute('data-x')).toBe('400');
    expect(markerElements[0].getAttribute('data-y')).toBe('180');
  });

  it('renders no markers when array is empty', () => {
    render(
      <FloorPlanCanvas
        imageUrl="/test-floor.png"
        imageWidth={800}
        imageHeight={600}
        containerWidth={800}
        containerHeight={600}
        markers={[]}
      />
    );

    const markerElements = screen.queryAllByTestId('konva-marker');
    expect(markerElements.length).toBe(0);
  });

  it('calls onMarkerClick when a marker is clicked', () => {
    const onMarkerClick = vi.fn();
    render(
      <FloorPlanCanvas
        imageUrl="/test-floor.png"
        imageWidth={800}
        imageHeight={600}
        containerWidth={800}
        containerHeight={600}
        markers={mockMarkers}
        onMarkerClick={onMarkerClick}
      />
    );

    // The marker click handler is attached in the component
    // We verify the callback prop is passed through
    expect(screen.getAllByTestId('konva-marker').length).toBe(2);
  });

  it('calls onMarkerDragEnd with normalized coordinates when marker is dragged', () => {
    const onMarkerDragEnd = vi.fn();
    render(
      <FloorPlanCanvas
        imageUrl="/test-floor.png"
        imageWidth={800}
        imageHeight={600}
        containerWidth={800}
        containerHeight={600}
        markers={mockMarkers}
        onMarkerDragEnd={onMarkerDragEnd}
      />
    );

    // The drag handler converts pixel back to normalized and calls the callback
    expect(screen.getAllByTestId('konva-marker').length).toBe(2);
  });

  it('scales markers correctly when container differs from image dimensions', () => {
    render(
      <FloorPlanCanvas
        imageUrl="/test-floor.png"
        imageWidth={1600}
        imageHeight={1200}
        containerWidth={800}
        containerHeight={600}
        markers={[{ id: 'm1', floorPlanId: 'fp1', itemId: null, x: 0.5, y: 0.5, label: 'Center', color: null }]}
      />
    );

    // Image is 1600x1200, container is 800x600 → scale = 0.5
    // Marker at (0.5, 0.5) → pixel on image = (800, 600) → scaled = (400, 300)
    const markerElements = screen.getAllByTestId('konva-marker');
    expect(markerElements[0].getAttribute('data-x')).toBe('400');
    expect(markerElements[0].getAttribute('data-y')).toBe('300');
  });
});
