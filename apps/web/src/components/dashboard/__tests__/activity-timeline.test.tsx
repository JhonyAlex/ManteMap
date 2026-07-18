// @vitest-environment jsdom
/**
 * RED tests for ActivityTimeline component.
 *
 * Verifies:
 *   - Renders activity entries with titles and timestamps
 *   - Shows kind badges (item_created, document_uploaded, etc.)
 *   - Orders entries newest-first
 *   - Shows empty state when no activity
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "Bounded Activity Timeline" — newest-first, empty state
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityTimeline } from '../activity-timeline';
import type { ActivityEntry } from '@mantemap/shared';

const baseDate = new Date('2026-07-18T12:00:00Z');

const mockEntries: ActivityEntry[] = [
  {
    id: 'item-1',
    kind: 'item_created',
    title: 'Pump A',
    href: '/projects/proj-1/items/item-1',
    timestamp: new Date('2026-07-18T10:00:00Z'),
  },
  {
    id: 'doc-1',
    kind: 'document_uploaded',
    title: 'Safety Manual v2',
    href: '/projects/proj-1/documents/doc-1',
    timestamp: new Date('2026-07-18T11:00:00Z'),
  },
  {
    id: 'alert-1',
    kind: 'alert_created',
    title: 'Document expiring soon',
    href: '/projects/proj-1/alerts',
    timestamp: new Date('2026-07-18T09:00:00Z'),
  },
  {
    id: 'event-1',
    kind: 'event_created',
    title: 'Maintenance scheduled',
    href: '/projects/proj-1/events/event-1',
    timestamp: new Date('2026-07-18T08:00:00Z'),
  },
];

describe('ActivityTimeline', () => {
  describe('with activity entries', () => {
    it('renders all activity entries', () => {
      render(<ActivityTimeline entries={mockEntries} />);

      expect(screen.getByText('Pump A')).toBeInTheDocument();
      expect(screen.getByText('Safety Manual v2')).toBeInTheDocument();
      expect(screen.getByText('Document expiring soon')).toBeInTheDocument();
      expect(screen.getByText('Maintenance scheduled')).toBeInTheDocument();
    });

    it('renders kind badges for each entry', () => {
      render(<ActivityTimeline entries={mockEntries} />);

      expect(screen.getByText(/item created/i)).toBeInTheDocument();
      expect(screen.getByText(/document uploaded/i)).toBeInTheDocument();
      expect(screen.getByText(/alert created/i)).toBeInTheDocument();
      expect(screen.getByText(/event created/i)).toBeInTheDocument();
    });

    it('orders entries newest-first by default', () => {
      render(<ActivityTimeline entries={mockEntries} />);

      const listItems = screen.getAllByRole('listitem');
      // Document uploaded (11:00) should come first, then item_created (10:00),
      // then alert_created (9:00), then event_created (8:00)
      expect(listItems[0]).toHaveTextContent('Safety Manual v2');
      expect(listItems[1]).toHaveTextContent('Pump A');
      expect(listItems[2]).toHaveTextContent('Document expiring soon');
      expect(listItems[3]).toHaveTextContent('Maintenance scheduled');
    });

    it('renders links with correct hrefs', () => {
      render(<ActivityTimeline entries={mockEntries} />);

      expect(screen.getByRole('link', { name: /pump a/i })).toHaveAttribute(
        'href',
        '/projects/proj-1/items/item-1'
      );
    });

    it('renders a list with aria-label', () => {
      render(<ActivityTimeline entries={mockEntries} />);

      expect(screen.getByRole('list', { name: /recent activity/i })).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty message when no entries', () => {
      render(<ActivityTimeline entries={[]} />);

      expect(screen.getByText(/no recent activity/i)).toBeInTheDocument();
    });

    it('does not render list when empty', () => {
      render(<ActivityTimeline entries={[]} />);

      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });
});
