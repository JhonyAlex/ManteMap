// @vitest-environment jsdom
/**
 * Tests for PolygonLayer component.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/polygons-floor-plans/spec.md
 *   POLY-001 "Polymorphic marker type" — render POLYGON markers
 *   POLY-003 "Vertex dragging" — vertex drag handles
 *   POLY-004 "Fill and stroke styling" — fillColor, strokeColor, strokeWidth
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { MarkerSummary } from '@/hooks/use-floor-plans';
import { PolygonLayer } from '../polygon-layer';

// Mock react-konva (same pattern as marker-layer.test.tsx)
vi.mock('react-konva', () => ({
  Layer: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="konva-layer" {...props}>{children}</div>
  ),
  Line: (props: Record<string, unknown>) => (
    <div
      data-testid="konva-line"
      data-closed={props.closed ? 'true' : 'false'}
      data-fill={props.fill}
      data-stroke={props.stroke}
      data-stroke-width={props.strokeWidth}
      data-points={props.points}
    />
  ),
  Circle: (props: Record<string, unknown>) => (
    <div
      data-testid="konva-circle"
      data-x={props.x}
      data-y={props.y}
      data-draggable={props.draggable ? 'true' : 'false'}
    />
  ),
  Text: (props: Record<string, unknown>) => (
    <div data-testid="konva-text" data-text={props.text} />
  ),
  Group: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="konva-group" {...props}>{children}</div>
  ),
}));

const squarePolygon: MarkerSummary = {
  id: 'poly-1',
  floorPlanId: 'fp1',
  itemId: 'item-1',
  x: 0.5,
  y: 0.5,
  label: 'Zone Alpha',
  color: null,
  type: 'POLYGON',
  points: [
    { x: 0.2, y: 0.2 },
    { x: 0.5, y: 0.2 },
    { x: 0.5, y: 0.5 },
    { x: 0.2, y: 0.5 },
  ],
  fillColor: '#00ff0040',
  strokeColor: '#00ff00',
  strokeWidth: 3,
};

const trianglePolygon: MarkerSummary = {
  id: 'poly-2',
  floorPlanId: 'fp1',
  itemId: null,
  x: 0.5,
  y: 0.5,
  label: null,
  color: null,
  type: 'POLYGON',
  points: [
    { x: 0, y: 0 },
    { x: 0.5, y: 0 },
    { x: 0.5, y: 0.5 },
  ],
  fillColor: null,
  strokeColor: '#ff0000',
  strokeWidth: 2,
};

const pointMarker: MarkerSummary = {
  id: 'm1',
  floorPlanId: 'fp1',
  itemId: 'item-2',
  x: 0.7,
  y: 0.6,
  label: 'Room 102',
  color: '#0000ff',
  type: 'POINT',
};

// ---------------------------------------------------------------------------
// PolygonLayer tests
// ---------------------------------------------------------------------------

describe('PolygonLayer', () => {
  it('renders polygons with closed lines', () => {
    render(
      <PolygonLayer
        markers={[squarePolygon]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
      />
    );

    const lines = screen.getAllByTestId('konva-line');
    expect(lines.length).toBe(1);
    expect(lines[0].getAttribute('data-closed')).toBe('true');
  });

  it('renders multiple polygons', () => {
    render(
      <PolygonLayer
        markers={[squarePolygon, trianglePolygon]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
      />
    );

    const lines = screen.getAllByTestId('konva-line');
    expect(lines).toHaveLength(2);
  });

  it('renders nothing when no polygon markers are present', () => {
    render(
      <PolygonLayer
        markers={[pointMarker]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
      />
    );

    const lines = screen.queryAllByTestId('konva-line');
    expect(lines).toHaveLength(0);
  });

  it('applies fill color to polygon', () => {
    render(
      <PolygonLayer
        markers={[squarePolygon]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
      />
    );

    const line = screen.getByTestId('konva-line');
    expect(line.getAttribute('data-fill')).toBe('#00ff0040');
  });

  it('applies stroke color and width', () => {
    render(
      <PolygonLayer
        markers={[squarePolygon]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
      />
    );

    const line = screen.getByTestId('konva-line');
    expect(line.getAttribute('data-stroke')).toBe('#00ff00');
    expect(line.getAttribute('data-stroke-width')).toBe('3');
  });

  it('uses default stroke width of 2 when not provided', () => {
    render(
      <PolygonLayer
        markers={[trianglePolygon]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
      />
    );

    const line = screen.getByTestId('konva-line');
    expect(line.getAttribute('data-stroke-width')).toBe('2');
  });

  it('converts normalized vertices to pixel coordinates', () => {
    render(
      <PolygonLayer
        markers={[squarePolygon]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
      />
    );

    const line = screen.getByTestId('konva-line');
    const pointsAttr = line.getAttribute('data-points');
    expect(pointsAttr).toBeTruthy();
    // Vertices should be scaled: (0.2*800, 0.2*600) = (160, 120), etc.
    expect(pointsAttr).toContain('160');
    expect(pointsAttr).toContain('120');
  });

  it('renders label at polygon centroid when label is provided', () => {
    render(
      <PolygonLayer
        markers={[squarePolygon]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
      />
    );

    const text = screen.getByTestId('konva-text');
    expect(text.getAttribute('data-text')).toBe('Zone Alpha');
  });

  it('does not render label when label is null', () => {
    render(
      <PolygonLayer
        markers={[trianglePolygon]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
      />
    );

    const text = screen.queryAllByTestId('konva-text');
    expect(text).toHaveLength(0);
  });

  it('renders vertex drag handles when canDrag is true', () => {
    render(
      <PolygonLayer
        markers={[squarePolygon]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
        canDrag
      />
    );

    const circles = screen.getAllByTestId('konva-circle');
    // 4 vertices → 4 drag handles
    expect(circles).toHaveLength(4);
    circles.forEach((circle) => {
      expect(circle.getAttribute('data-draggable')).toBe('true');
    });
  });

  it('does not render drag handles when canDrag is false', () => {
    render(
      <PolygonLayer
        markers={[squarePolygon]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
        canDrag={false}
      />
    );

    const circles = screen.queryAllByTestId('konva-circle');
    expect(circles).toHaveLength(0);
  });

  it('filters out POINT markers, only renders POLYGON', () => {
    render(
      <PolygonLayer
        markers={[squarePolygon, pointMarker, trianglePolygon]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
      />
    );

    // Only 2 polygons should render (squarePolygon + trianglePolygon)
    const lines = screen.getAllByTestId('konva-line');
    expect(lines).toHaveLength(2);
  });

  it('handles empty markers array', () => {
    render(
      <PolygonLayer
        markers={[]}
        imageWidth={800}
        imageHeight={600}
        scaleX={1}
        scaleY={1}
      />
    );

    const lines = screen.queryAllByTestId('konva-line');
    expect(lines).toHaveLength(0);
  });
});
