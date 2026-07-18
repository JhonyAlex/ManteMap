// @vitest-environment jsdom
/**
 * RED tests for Card component.
 *
 * These tests verify:
 *   - Card renders children content
 *   - Card applies custom className
 *   - CardHeader, CardTitle, CardContent, CardFooter render children
 *   - Card forwards ref to the root div
 *
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "packages/ui/src/components/{card,progress,skeleton}.tsx — Create"
 * Tasks: openspec/changes/phase-9-dashboard-reports/tasks.md
 *   1.1 RED: Tests for Card — children, className, ref, asChild
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from './card';

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

describe('Card', () => {
  it('renders children content', () => {
    render(<Card>Card body</Card>);
    expect(screen.getByText('Card body')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card data-testid="card" className="my-class">Content</Card>);
    expect(screen.getByTestId('card')).toHaveClass('my-class');
  });

  it('forwards ref to the root div', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref test</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

// ---------------------------------------------------------------------------
// CardHeader
// ---------------------------------------------------------------------------

describe('CardHeader', () => {
  it('renders children content', () => {
    render(<CardHeader>Header text</CardHeader>);
    expect(screen.getByText('Header text')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CardHeader data-testid="header" className="custom-header">H</CardHeader>);
    expect(screen.getByTestId('header')).toHaveClass('custom-header');
  });
});

// ---------------------------------------------------------------------------
// CardTitle
// ---------------------------------------------------------------------------

describe('CardTitle', () => {
  it('renders children as heading text', () => {
    render(<CardTitle>My Title</CardTitle>);
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CardTitle data-testid="title" className="title-class">T</CardTitle>);
    expect(screen.getByTestId('title')).toHaveClass('title-class');
  });
});

// ---------------------------------------------------------------------------
// CardContent
// ---------------------------------------------------------------------------

describe('CardContent', () => {
  it('renders children content', () => {
    render(<CardContent>Inner content</CardContent>);
    expect(screen.getByText('Inner content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CardContent data-testid="content" className="content-class">C</CardContent>);
    expect(screen.getByTestId('content')).toHaveClass('content-class');
  });
});

// ---------------------------------------------------------------------------
// CardFooter
// ---------------------------------------------------------------------------

describe('CardFooter', () => {
  it('renders children content', () => {
    render(<CardFooter>Footer actions</CardFooter>);
    expect(screen.getByText('Footer actions')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<CardFooter data-testid="footer" className="footer-class">F</CardFooter>);
    expect(screen.getByTestId('footer')).toHaveClass('footer-class');
  });
});
