// @vitest-environment jsdom
/**
 * RED tests for Skeleton component.
 *
 * These tests verify:
 *   - Renders a div element
 *   - Sets aria-hidden="true"
 *   - Applies custom className
 *   - Forwards ref
 *
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "packages/ui/src/components/{card,progress,skeleton}.tsx — Create"
 * Tasks: openspec/changes/phase-9-dashboard-reports/tasks.md
 *   1.5 RED: Tests for Skeleton — pulse, aria-hidden
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders a div element', () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('sets aria-hidden to true', () => {
    render(<Skeleton data-testid="skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveAttribute('aria-hidden', 'true');
  });

  it('applies custom className', () => {
    render(<Skeleton data-testid="skeleton" className="custom-skeleton" />);
    expect(screen.getByTestId('skeleton')).toHaveClass('custom-skeleton');
  });

  it('forwards ref to the root div', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Skeleton ref={ref} data-testid="skeleton" />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
