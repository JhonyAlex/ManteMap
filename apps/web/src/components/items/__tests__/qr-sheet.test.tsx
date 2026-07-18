// @vitest-environment jsdom
/**
 * Tests for QRSheet component.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/qr-codes/spec.md
 *   QR-002 Batch QR sheet generation
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QRSheet } from '../qr-sheet';

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock window.open
const mockWindowOpen = vi.fn();
const mockWrite = vi.fn();
const mockClose = vi.fn();

describe('QRSheet', () => {
  const projectId = 'proj-1';
  const itemIds = ['item-1', 'item-2', 'item-3'];

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<!DOCTYPE html><html><body>QR Sheet</body></html>'),
    });
    mockWindowOpen.mockReturnValue({
      document: { write: mockWrite, close: mockClose },
    });
    globalThis.open = mockWindowOpen;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders a Print QR Sheet button', () => {
    render(<QRSheet projectId={projectId} itemIds={itemIds} />);
    expect(screen.getByText('Print QR Sheet')).toBeInTheDocument();
  });

  it('disables button when itemIds is empty', () => {
    render(<QRSheet projectId={projectId} itemIds={[]} />);
    const button = screen.getByText('Print QR Sheet');
    expect(button).toBeDisabled();
  });

  it('disables button when disabled prop is true', () => {
    render(<QRSheet projectId={projectId} itemIds={itemIds} disabled />);
    const button = screen.getByText('Print QR Sheet');
    expect(button).toBeDisabled();
  });

  it('shows loading text while generating', async () => {
    // Make fetch hang (never resolve in this test)
    mockFetch.mockImplementation(() => new Promise(() => {}));

    render(<QRSheet projectId={projectId} itemIds={itemIds} />);

    const button = screen.getByText('Print QR Sheet');
    fireEvent.click(button);

    expect(screen.getByText('Generating...')).toBeInTheDocument();
  });

  it('posts correct data to API when button clicked', async () => {
    render(<QRSheet projectId={projectId} itemIds={itemIds} />);

    const button = screen.getByText('Print QR Sheet');
    fireEvent.click(button);

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/projects/${projectId}/items/qr-sheet`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
      })
    );
  });

  it('opens print window on success', async () => {
    render(<QRSheet projectId={projectId} itemIds={itemIds} />);

    const button = screen.getByText('Print QR Sheet');
    fireEvent.click(button);

    // Wait for fetch to resolve
    await vi.waitFor(() => {
      expect(mockWindowOpen).toHaveBeenCalledWith('', '_blank');
    });

    expect(mockWrite).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it('shows error message when API returns non-ok status', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Server error'),
    });

    render(<QRSheet projectId={projectId} itemIds={itemIds} />);

    const button = screen.getByText('Print QR Sheet');
    fireEvent.click(button);

    await vi.waitFor(() => {
      expect(screen.getByText(/Failed to generate QR sheet/)).toBeInTheDocument();
    });
  });
});
