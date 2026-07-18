// @vitest-environment jsdom
/**
 * Tests for DocumentList component.
 *
 * Spec: openspec/changes/phase-5-documents/specs/document-management/spec.md
 *   "Document CRUD" — list documents with current version metadata
 *   "Expiration Tracking" — red expired badge, yellow expiring badge, no badge when null
 * Design: openspec/changes/phase-5-documents/design.md
 *   "table with name, size, version, expiration badge, download/delete actions"
 *
 * Acceptance criteria:
 *   - Renders document names in a table
 *   - Shows red "Expired" badge when expiresAt < now
 *   - Shows yellow "Expiring soon" badge when expiresAt within 30 days
 *   - No badge when expiresAt is null or > 30 days
 *   - Shows empty state when no documents
 *   - Renders download and delete action buttons
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DocumentList } from '../document-list';
import type { DocumentWithVersion } from '@/hooks/use-documents';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/hooks/use-documents', async () => {
  const actual = await vi.importActual('@/hooks/use-documents');
  return {
    ...actual,
    useDocuments: vi.fn(),
    useDeleteDocument: vi.fn(),
  };
});

// We'll import the mocked hooks to control them
import { useDocuments, useDeleteDocument } from '@/hooks/use-documents';
const mockUseDocuments = vi.mocked(useDocuments);
const mockUseDeleteDocument = vi.mocked(useDeleteDocument);

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

const now = new Date();

function daysFromNow(days: number): string {
  const date = new Date(now);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

const mockDocuments: DocumentWithVersion[] = [
  {
    id: 'doc-1',
    itemId: 'item-1',
    name: 'Manual.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024000,
    expiresAt: null,
    currentVersionId: 'ver-1',
    createdAt: '2026-07-15T10:00:00Z',
    updatedAt: '2026-07-15T10:00:00Z',
    currentVersion: {
      id: 'ver-1',
      version: 1,
      fileName: 'manual-v1.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024000,
      uploadedBy: 'user-1',
      createdAt: '2026-07-15T10:00:00Z',
    },
  },
  {
    id: 'doc-2',
    itemId: 'item-1',
    name: 'Expired Certificate.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 512000,
    expiresAt: daysFromNow(-10),
    currentVersionId: 'ver-2',
    createdAt: '2026-07-10T08:00:00Z',
    updatedAt: '2026-07-10T08:00:00Z',
    currentVersion: {
      id: 'ver-2',
      version: 1,
      fileName: 'cert.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 512000,
      uploadedBy: 'user-1',
      createdAt: '2026-07-10T08:00:00Z',
    },
  },
  {
    id: 'doc-3',
    itemId: 'item-1',
    name: 'Expiring Soon.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 256000,
    expiresAt: daysFromNow(15),
    currentVersionId: 'ver-3',
    createdAt: '2026-07-12T09:00:00Z',
    updatedAt: '2026-07-12T09:00:00Z',
    currentVersion: {
      id: 'ver-3',
      version: 2,
      fileName: 'expiring-v2.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      sizeBytes: 256000,
      uploadedBy: 'user-2',
      createdAt: '2026-07-14T14:00:00Z',
    },
  },
  {
    id: 'doc-4',
    itemId: 'item-1',
    name: 'Future Plan.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sizeBytes: 128000,
    expiresAt: daysFromNow(90),
    currentVersionId: 'ver-4',
    createdAt: '2026-07-01T07:00:00Z',
    updatedAt: '2026-07-01T07:00:00Z',
    currentVersion: {
      id: 'ver-4',
      version: 1,
      fileName: 'plan.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      sizeBytes: 128000,
      uploadedBy: 'user-1',
      createdAt: '2026-07-01T07:00:00Z',
    },
  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DocumentList', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: delete mutation mock
    mockUseDeleteDocument.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);
  });

  it('renders document names in the list', () => {
    mockUseDocuments.mockReturnValue({
      data: mockDocuments,
      isLoading: false,
      error: null,
    } as any);

    render(<DocumentList projectId="proj-1" itemId="item-1" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Manual.pdf')).toBeInTheDocument();
    expect(screen.getByText('Expired Certificate.pdf')).toBeInTheDocument();
    expect(screen.getByText('Expiring Soon.docx')).toBeInTheDocument();
    expect(screen.getByText('Future Plan.xlsx')).toBeInTheDocument();
  });

  it('shows red "Expired" badge for documents past expiration', () => {
    mockUseDocuments.mockReturnValue({
      data: [mockDocuments[1]], // Expired Certificate
      isLoading: false,
      error: null,
    } as any);

    render(<DocumentList projectId="proj-1" itemId="item-1" />, {
      wrapper: createWrapper(),
    });

    // Find the badge element specifically (not the document name)
    const badge = screen.getByText('Expired');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('[data-slot="badge"]')).toHaveClass('bg-destructive');
  });

  it('shows yellow "Expiring soon" badge for documents expiring within 30 days', () => {
    mockUseDocuments.mockReturnValue({
      data: [mockDocuments[2]], // Expiring Soon
      isLoading: false,
      error: null,
    } as any);

    render(<DocumentList projectId="proj-1" itemId="item-1" />, {
      wrapper: createWrapper(),
    });

    // Find the badge element specifically (not the document name)
    const badge = screen.getByText('Expiring soon');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('[data-slot="badge"]')).toHaveClass('bg-warning');
  });

  it('shows no expiration badge when expiresAt is null', () => {
    mockUseDocuments.mockReturnValue({
      data: [mockDocuments[0]], // Manual.pdf with null expiresAt
      isLoading: false,
      error: null,
    } as any);

    render(<DocumentList projectId="proj-1" itemId="item-1" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Manual.pdf')).toBeInTheDocument();
    expect(screen.queryByText(/expired/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/expiring/i)).not.toBeInTheDocument();
  });

  it('shows no expiration badge when expiresAt is more than 30 days away', () => {
    mockUseDocuments.mockReturnValue({
      data: [mockDocuments[3]], // Future Plan with 90 days
      isLoading: false,
      error: null,
    } as any);

    render(<DocumentList projectId="proj-1" itemId="item-1" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText('Future Plan.xlsx')).toBeInTheDocument();
    expect(screen.queryByText(/expired/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/expiring/i)).not.toBeInTheDocument();
  });

  it('renders empty state when no documents', () => {
    mockUseDocuments.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    render(<DocumentList projectId="proj-1" itemId="item-1" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/no documents/i)).toBeInTheDocument();
  });

  it('renders loading state while fetching', () => {
    mockUseDocuments.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    } as any);

    render(<DocumentList projectId="proj-1" itemId="item-1" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders download button for each document', () => {
    mockUseDocuments.mockReturnValue({
      data: [mockDocuments[0]],
      isLoading: false,
      error: null,
    } as any);

    render(<DocumentList projectId="proj-1" itemId="item-1" />, {
      wrapper: createWrapper(),
    });

    const downloadButton = screen.getByRole('button', { name: /download/i });
    expect(downloadButton).toBeInTheDocument();
  });

  it('renders delete button for each document', () => {
    mockUseDocuments.mockReturnValue({
      data: [mockDocuments[0]],
      isLoading: false,
      error: null,
    } as any);

    render(<DocumentList projectId="proj-1" itemId="item-1" />, {
      wrapper: createWrapper(),
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('calls delete mutation when delete is confirmed', async () => {
    const mockMutate = vi.fn();
    mockUseDeleteDocument.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
      isError: false,
      error: null,
    } as any);

    mockUseDocuments.mockReturnValue({
      data: [mockDocuments[0]],
      isLoading: false,
      error: null,
    } as any);

    const user = userEvent.setup();
    render(<DocumentList projectId="proj-1" itemId="item-1" />, {
      wrapper: createWrapper(),
    });

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    // Confirm deletion in the dialog
    const confirmButton = screen.getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(mockMutate).toHaveBeenCalled();
  });
});
