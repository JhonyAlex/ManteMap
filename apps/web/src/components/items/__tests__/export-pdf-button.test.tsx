// @vitest-environment jsdom
/**
 * Tests for ExportPDFButton component.
 *
 * Verifies loading/success/error states per PDF export spec.
 *
 * Spec: openspec/changes/phase-11-advanced-features/specs/pdf-export/spec.md
 *   PDF-001, PDF-004, PDF-005
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExportPDFButton } from '../export-pdf-button';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock URL.createObjectURL and revokeObjectURL
const mockObjectUrl = 'blob:mock-url';
global.URL.createObjectURL = vi.fn(() => mockObjectUrl);
global.URL.revokeObjectURL = vi.fn();

// Mock document.createElement for anchor click
const originalCreateElement = document.createElement.bind(document);
const mockAnchorClick = vi.fn();
const mockAnchor = {
  href: '',
  download: '',
  click: mockAnchorClick,
} as unknown as HTMLAnchorElement;

vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag === 'a') return mockAnchor;
  return originalCreateElement(tag);
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROJECT_ID = 'project-1';
const ITEM_ID = 'item-1';
const PDF_URL = `/api/projects/${PROJECT_ID}/items/${ITEM_ID}/export/pdf`;

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderButton(props: Partial<React.ComponentProps<typeof ExportPDFButton>> = {}) {
  return render(
    <ExportPDFButton
      projectId={PROJECT_ID}
      itemId={ITEM_ID}
      itemName="Pump A"
      {...props}
    />
  );
}

// ===========================================================================
// Tests
// ===========================================================================

describe('ExportPDFButton', () => {
  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  describe('rendering', () => {
    it('renders "Export PDF" button text', () => {
      // Act
      renderButton();

      // Assert
      const button = screen.getByRole('button', { name: /export pdf/i });
      expect(button).toBeInTheDocument();
    });

    it('is enabled by default (not loading)', () => {
      // Act
      renderButton();

      // Assert
      const button = screen.getByRole('button', { name: /export pdf/i });
      expect(button).not.toBeDisabled();
    });

    it('uses the projectId and itemId for the API URL', async () => {
      // Arrange
      const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(pdfBlob),
      });

      // Act
      renderButton();
      const user = userEvent.setup();
      const button = screen.getByRole('button', { name: /export pdf/i });
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(PDF_URL);
      });
    });
  });

  // -----------------------------------------------------------------------
  // Success state
  // -----------------------------------------------------------------------

  describe('success', () => {
    it('calls the PDF API endpoint with correct URL', async () => {
      // Arrange
      const pdfBlob = new Blob(['%PDF-1.4 fake content'], { type: 'application/pdf' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(pdfBlob),
      });

      // Act
      renderButton();
      const user = userEvent.setup();
      const button = screen.getByRole('button', { name: /export pdf/i });
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(PDF_URL);
      });
    });

    it('returns to enabled state after successful fetch', async () => {
      // Arrange
      const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
      mockFetch.mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(pdfBlob),
      });

      // Act
      renderButton();
      const user = userEvent.setup();
      const button = screen.getByRole('button', { name: /export pdf/i });
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------

  describe('loading', () => {
    it('disables the button while PDF is loading', async () => {
      // Arrange
      let resolvePromise!: (value: { ok: boolean; blob: () => Promise<Blob> }) => void;
      const fetchPromise = new Promise<{ ok: boolean; blob: () => Promise<Blob> }>((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValue(fetchPromise);

      // Act
      renderButton();
      const user = userEvent.setup();
      const button = screen.getByRole('button', { name: /export pdf/i });
      await user.click(button);

      // Assert — button should be disabled while loading
      expect(button).toBeDisabled();

      // Complete the fetch
      const pdfBlob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
      resolvePromise({ ok: true, blob: () => Promise.resolve(pdfBlob) });

      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });

  // -----------------------------------------------------------------------
  // Error state
  // -----------------------------------------------------------------------

  describe('error', () => {
    it('handles network failure gracefully', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act
      renderButton();
      const user = userEvent.setup();
      const button = screen.getByRole('button', { name: /export pdf/i });
      await user.click(button);

      // Assert — should not crash, button should be re-enabled
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('handles non-ok response (404) gracefully', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      // Act
      renderButton();
      const user = userEvent.setup();
      const button = screen.getByRole('button', { name: /export pdf/i });
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });

    it('handles 500 server error gracefully', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      // Act
      renderButton();
      const user = userEvent.setup();
      const button = screen.getByRole('button', { name: /export pdf/i });
      await user.click(button);

      // Assert
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
    });
  });
});
