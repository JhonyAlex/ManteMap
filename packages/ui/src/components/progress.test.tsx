// @vitest-environment jsdom
/**
 * RED tests for Progress component.
 *
 * These tests verify:
 *   - Renders with default max (100) and displays value
 *   - Sets aria-valuenow, aria-valuemin, aria-valuemax
 *   - Renders with custom max
 *   - Applies custom className
 *   - Forwards ref
 *
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "packages/ui/src/components/{card,progress,skeleton}.tsx — Create"
 * Tasks: openspec/changes/phase-9-dashboard-reports/tasks.md
 *   1.3 RED: Tests for Progress — value/max, aria-valuenow
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from './progress';

describe('Progress', () => {
  it('renders a progressbar role element', () => {
    render(<Progress value={50} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('sets aria-valuenow to the given value', () => {
    render(<Progress value={42} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
  });

  it('defaults aria-valuemax to 100', () => {
    render(<Progress value={50} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '100');
  });

  it('defaults aria-valuemin to 0', () => {
    render(<Progress value={50} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemin', '0');
  });

  it('uses custom max for aria-valuemax', () => {
    render(<Progress value={3} max={10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '10');
  });

  it('applies custom className', () => {
    render(<Progress value={50} className="my-progress" />);
    expect(screen.getByRole('progressbar')).toHaveClass('my-progress');
  });

  it('forwards ref to the root element', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Progress value={50} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
