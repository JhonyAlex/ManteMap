// @vitest-environment jsdom
/**
 * QRCodeDisplay — component tests.
 *
 * Tests the QR image display, loading state, error state,
 * print button, and download button.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/qr-codes/spec.md
 *   QR-001
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QRCodeDisplay } from '../qr-code-display';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock window.print (not implemented in jsdom)
const mockPrint = vi.fn();
vi.stubGlobal('print', mockPrint);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PROJECT_ID = 'project-1';
const ITEM_ID = 'item-1';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.restoreAllMocks();
  mockPrint.mockReset();
  // Re-stub globals after restoreAllMocks
  vi.stubGlobal('print', mockPrint);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QRCodeDisplay', () => {
  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  it('shows loading state while fetching QR code', async () => {
    // Arrange — never resolve the fetch promise (keeps loading)
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise<Response>(() => {}))
    );

    // Act
    render(
      <QRCodeDisplay projectId={PROJECT_ID} itemId={ITEM_ID} />,
      { wrapper: createWrapper() }
    );

    // Assert — loading indicator should be visible
    await waitFor(() => {
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Success state
  // -----------------------------------------------------------------------

  it('renders QR image when data is loaded successfully', async () => {
    // Arrange
    const fakeDataUrl = 'data:image/png;base64,qr-code-data';
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(fakeDataUrl, {
            status: 200,
            headers: { 'Content-Type': 'image/png' },
          })
        )
      )
    );

    // Act
    render(
      <QRCodeDisplay projectId={PROJECT_ID} itemId={ITEM_ID} />,
      { wrapper: createWrapper() }
    );

    // Assert — QR image should be rendered with the correct src
    await waitFor(() => {
      const img = screen.getByRole('img', { name: /qr code/i });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', fakeDataUrl);
    });
  });

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  it('shows error state on API failure', async () => {
    // Arrange — 500 response
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: 'ERROR', message: 'Failed' }), {
            status: 500,
          })
        )
      )
    );

    // Act
    render(
      <QRCodeDisplay projectId={PROJECT_ID} itemId={ITEM_ID} />,
      { wrapper: createWrapper() }
    );

    // Assert — error message visible
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  it('shows error when item not found (404)', async () => {
    // Arrange — 404 response
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ message: 'Item not found' }), {
            status: 404,
          })
        )
      )
    );

    // Act
    render(
      <QRCodeDisplay projectId={PROJECT_ID} itemId={ITEM_ID} />,
      { wrapper: createWrapper() }
    );

    // Assert
    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // Print button
  // -----------------------------------------------------------------------

  it('Print button triggers window.print()', async () => {
    // Arrange
    const fakeDataUrl = 'data:image/png;base64,print-test';
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(fakeDataUrl, { status: 200 }))
      )
    );

    // Act
    render(
      <QRCodeDisplay projectId={PROJECT_ID} itemId={ITEM_ID} />,
      { wrapper: createWrapper() }
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    const printBtn = screen.getByRole('button', { name: /print/i });
    await user.click(printBtn);

    // Assert
    expect(mockPrint).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Download button
  // -----------------------------------------------------------------------

  it('Download button triggers file download', async () => {
    // Arrange
    const fakeDataUrl = 'data:image/png;base64,download-test';
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(fakeDataUrl, { status: 200 }))
      )
    );

    // Spy on HTMLAnchorElement.prototype.click
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    // Spy on appendChild and removeChild
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');

    // Act
    render(
      <QRCodeDisplay projectId={PROJECT_ID} itemId={ITEM_ID} />,
      { wrapper: createWrapper() }
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });

    const user = userEvent.setup();
    const downloadBtn = screen.getByRole('button', { name: /download/i });
    await user.click(downloadBtn);

    // Assert — anchor was appended to body, clicked, and removed
    expect(appendSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();

    // Cleanup
    clickSpy.mockRestore();
    appendSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
