// @vitest-environment jsdom
/**
 * RED tests for AlertCard component.
 *
 * These tests verify:
 *   - Renders alert title and message
 *   - Shows severity indicator with correct visual treatment
 *   - Shows acknowledge button for ACTIVE alerts
 *   - Shows dismiss button for ACTIVE alerts
 *   - Calls onAcknowledge when acknowledge button clicked
 *   - Calls onDismiss when dismiss button clicked
 *   - Shows acknowledged timestamp for ACKNOWLEDGED alerts
 *   - Shows dismissed timestamp for DISMISSED alerts
 *   - Does not show action buttons for non-ACTIVE alerts
 *
 * Spec: openspec/changes/phase-8-alerts/specs/alert-management/spec.md
 *   "Acknowledge alert" — status changes to acknowledged
 *   "Dismiss alert" — status changes to dismissed
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "Individual alert with ack/dismiss actions"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertCard } from '../alert-card';
import type { Alert } from '../alert-card';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const activeAlert: Alert = {
  id: 'alert-1',
  projectId: 'proj-1',
  alertType: 'DOCUMENT_EXPIRING',
  severity: 'WARNING',
  status: 'ACTIVE',
  sourceType: 'document',
  sourceId: 'doc-1',
  title: 'Document "Safety Manual" expiring in 7 days',
  message: 'This document expires on 2026-07-25',
  metadata: { daysUntilExpiry: 7 },
  acknowledgedAt: null,
  dismissedAt: null,
  createdAt: '2026-07-18T10:00:00Z',
  updatedAt: '2026-07-18T10:00:00Z',
};

const acknowledgedAlert: Alert = {
  ...activeAlert,
  id: 'alert-2',
  status: 'ACKNOWLEDGED',
  acknowledgedAt: '2026-07-18T11:00:00Z',
};

const dismissedAlert: Alert = {
  ...activeAlert,
  id: 'alert-3',
  status: 'DISMISSED',
  dismissedAt: '2026-07-18T12:00:00Z',
};

const criticalAlert: Alert = {
  ...activeAlert,
  id: 'alert-4',
  alertType: 'STATUS_INCIDENT',
  severity: 'CRITICAL',
  title: 'Item "Pump A" moved to incident status',
  message: null,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AlertCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders alert title', () => {
    render(
      <AlertCard alert={activeAlert} onAcknowledge={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(screen.getByText(/safety manual/i)).toBeInTheDocument();
  });

  it('renders alert message when present', () => {
    render(
      <AlertCard alert={activeAlert} onAcknowledge={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(screen.getByText(/expires on 2026-07-25/i)).toBeInTheDocument();
  });

  it('does not render message section when message is null', () => {
    render(
      <AlertCard alert={criticalAlert} onAcknowledge={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(screen.queryByText(/expires/i)).not.toBeInTheDocument();
  });

  it('shows severity indicator for WARNING alerts', () => {
    render(
      <AlertCard alert={activeAlert} onAcknowledge={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(screen.getByText(/warning/i)).toBeInTheDocument();
  });

  it('shows severity indicator for CRITICAL alerts', () => {
    render(
      <AlertCard alert={criticalAlert} onAcknowledge={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(screen.getByText(/critical/i)).toBeInTheDocument();
  });

  it('shows acknowledge button for ACTIVE alerts', () => {
    render(
      <AlertCard alert={activeAlert} onAcknowledge={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: /acknowledge/i })).toBeInTheDocument();
  });

  it('shows dismiss button for ACTIVE alerts', () => {
    render(
      <AlertCard alert={activeAlert} onAcknowledge={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });

  it('calls onAcknowledge when acknowledge button clicked', async () => {
    const onAcknowledge = vi.fn();
    const user = userEvent.setup();

    render(
      <AlertCard alert={activeAlert} onAcknowledge={onAcknowledge} onDismiss={vi.fn()} />
    );

    await user.click(screen.getByRole('button', { name: /acknowledge/i }));

    expect(onAcknowledge).toHaveBeenCalledWith('alert-1');
  });

  it('calls onDismiss when dismiss button clicked', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();

    render(
      <AlertCard alert={activeAlert} onAcknowledge={vi.fn()} onDismiss={onDismiss} />
    );

    await user.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(onDismiss).toHaveBeenCalledWith('alert-1');
  });

  it('does not show action buttons for ACKNOWLEDGED alerts', () => {
    render(
      <AlertCard alert={acknowledgedAlert} onAcknowledge={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('does not show action buttons for DISMISSED alerts', () => {
    render(
      <AlertCard alert={dismissedAlert} onAcknowledge={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(screen.queryByRole('button', { name: /acknowledge/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('shows acknowledged status for ACKNOWLEDGED alerts', () => {
    render(
      <AlertCard alert={acknowledgedAlert} onAcknowledge={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(screen.getByText(/acknowledged/i)).toBeInTheDocument();
  });

  it('shows dismissed status for DISMISSED alerts', () => {
    render(
      <AlertCard alert={dismissedAlert} onAcknowledge={vi.fn()} onDismiss={vi.fn()} />
    );

    expect(screen.getByText(/dismissed/i)).toBeInTheDocument();
  });
});
