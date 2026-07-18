// @vitest-environment jsdom
/**
 * Tests for VersionHistory component.
 *
 * Spec: openspec/changes/phase-5-documents/specs/document-management/spec.md
 *   "Document Versioning" — versions ordered desc by number with timestamp, size, uploader
 * Design: openspec/changes/phase-5-documents/design.md
 *   "timeline list of versions"
 *
 * Acceptance criteria:
 *   - Renders version list ordered descending by version number
 *   - Shows timestamp, file size, and uploader for each version
 *   - Shows empty state when no versions
 *   - Shows loading state while fetching
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VersionHistory } from '../version-history';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/use-documents', async () => {
  const actual = await vi.importActual('@/hooks/use-documents');
  return {
    ...actual,
    useDocumentVersions: vi.fn(),
  };
});

import { useDocumentVersions } from '@/hooks/use-documents';
const mockUseDocumentVersions = vi.mocked(useDocumentVersions);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Fixtures
// ---------------------------------------------------------------------------

const mockVersions = [
  {
    id: 'ver-3',
    documentId: 'doc-1',
    version: 3,
    fileName: 'manual-v3.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 3072000,
    storagePath: 'proj-1/item-1/ver-3-manual-v3.pdf',
    uploadedBy: 'user-2',
    createdAt: '2026-07-17T14:00:00Z',
  },
  {
    id: 'ver-2',
    documentId: 'doc-1',
    version: 2,
    fileName: 'manual-v2.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2048000,
    storagePath: 'proj-1/item-1/ver-2-manual-v2.pdf',
    uploadedBy: 'user-1',
    createdAt: '2026-07-16T12:00:00Z',
  },
  {
    id: 'ver-1',
    documentId: 'doc-1',
    version: 1,
    fileName: 'manual-v1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024000,
    storagePath: 'proj-1/item-1/ver-1-manual-v1.pdf',
    uploadedBy: 'user-1',
    createdAt: '2026-07-15T10:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('VersionHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders version list with version numbers', () => {
    mockUseDocumentVersions.mockReturnValue({
      data: mockVersions,
      isLoading: false,
      error: null,
    } as any);

    render(
      <VersionHistory
        projectId="proj-1"
        itemId="item-1"
        documentId="doc-1"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('v3')).toBeInTheDocument();
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();
  });

  it('renders version timestamps', () => {
    mockUseDocumentVersions.mockReturnValue({
      data: mockVersions,
      isLoading: false,
      error: null,
    } as any);

    render(
      <VersionHistory
        projectId="proj-1"
        itemId="item-1"
        documentId="doc-1"
      />,
      { wrapper: createWrapper() }
    );

    // Check that dates are rendered (formatted)
    expect(screen.getByText(/jul.*17/i)).toBeInTheDocument();
    expect(screen.getByText(/jul.*16/i)).toBeInTheDocument();
    expect(screen.getByText(/jul.*15/i)).toBeInTheDocument();
  });

  it('renders file sizes for each version', () => {
    mockUseDocumentVersions.mockReturnValue({
      data: mockVersions,
      isLoading: false,
      error: null,
    } as any);

    render(
      <VersionHistory
        projectId="proj-1"
        itemId="item-1"
        documentId="doc-1"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('2.9 MB')).toBeInTheDocument();
    expect(screen.getByText('2.0 MB')).toBeInTheDocument();
    expect(screen.getByText('1000.0 KB')).toBeInTheDocument();
  });

  it('renders file names for each version', () => {
    mockUseDocumentVersions.mockReturnValue({
      data: mockVersions,
      isLoading: false,
      error: null,
    } as any);

    render(
      <VersionHistory
        projectId="proj-1"
        itemId="item-1"
        documentId="doc-1"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('manual-v3.pdf')).toBeInTheDocument();
    expect(screen.getByText('manual-v2.pdf')).toBeInTheDocument();
    expect(screen.getByText('manual-v1.pdf')).toBeInTheDocument();
  });

  it('shows empty state when no versions exist', () => {
    mockUseDocumentVersions.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(
      <VersionHistory
        projectId="proj-1"
        itemId="item-1"
        documentId="doc-1"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/no version history/i)).toBeInTheDocument();
  });

  it('shows loading state while fetching', () => {
    mockUseDocumentVersions.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(
      <VersionHistory
        projectId="proj-1"
        itemId="item-1"
        documentId="doc-1"
      />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders versions in descending order by version number', () => {
    mockUseDocumentVersions.mockReturnValue({
      data: mockVersions,
      isLoading: false,
      error: null,
    } as any);

    render(
      <VersionHistory
        projectId="proj-1"
        itemId="item-1"
        documentId="doc-1"
      />,
      { wrapper: createWrapper() }
    );

    // v3 should appear before v2, which should appear before v1
    const rows = screen.getAllByRole('row');
    // First row is header, then v3, v2, v1
    expect(rows[1]).toHaveTextContent('v3');
    expect(rows[2]).toHaveTextContent('v2');
    expect(rows[3]).toHaveTextContent('v1');
  });
});
