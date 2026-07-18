// @vitest-environment jsdom
/**
 * Tests for LOCATION_RELATION field type activation in field registry and DynamicForm.
 *
 * Spec: openspec/changes/phase-7-locations/specs/dynamic-field-management/spec.md
 *   "LOCATION_RELATION creates successfully" — renders as LocationPicker
 * Spec: openspec/changes/phase-7-locations/specs/form-generation/spec.md
 *   "LOCATION_RELATION renders LocationPicker" — not a disabled placeholder
 *   "Dynamic Zod schema from field definitions" — validates as string location ID
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fieldRegistry } from '../field-registry';
import { DynamicForm } from '../dynamic-form';
import type { DynamicFieldDefinition } from '@mantemap/shared';

// Mock the LocationPicker to avoid hook dependency
vi.mock('@/components/locations/location-picker', () => ({
  LocationPicker: ({ projectId, value, onChange }: Record<string, unknown>) => (
    <div
      data-testid="location-picker"
      data-project-id={projectId}
      data-value={value ?? ''}
    >
      LocationPicker Mock
    </div>
  ),
}));

// Mock the useLocationTree hook
const { mockUseLocationTree } = vi.hoisted(() => ({
  mockUseLocationTree: vi.fn(),
}));

vi.mock('@/hooks/use-locations', () => ({
  useLocationTree: mockUseLocationTree,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

// ---------------------------------------------------------------------------
// Registry tests
// ---------------------------------------------------------------------------

describe('fieldRegistry LOCATION_RELATION', () => {
  it('maps LOCATION_RELATION to a real component (not DeferredFieldInput)', () => {
    const component = fieldRegistry['LOCATION_RELATION'];
    expect(component).toBeDefined();
    const { container } = render(
      React.createElement(component, {
        field: { name: 'location', value: '', onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() },
        definition: { id: 'f1', key: 'location', name: 'Location', type: 'LOCATION_RELATION', required: false, order: 0, active: true, visible: true, showInList: false, showInSearch: false },
      }),
      { wrapper: createWrapper() }
    );
    expect(container.textContent).not.toContain('Coming soon');
  });

  it('renders LocationPicker for LOCATION_RELATION type', () => {
    const component = fieldRegistry['LOCATION_RELATION'];
    render(
      React.createElement(component, {
        field: { name: 'location', value: '', onChange: vi.fn(), onBlur: vi.fn(), ref: vi.fn() },
        definition: { id: 'f1', key: 'location', name: 'Location', type: 'LOCATION_RELATION', required: false, order: 0, active: true, visible: true, showInList: false, showInSearch: false },
      }),
      { wrapper: createWrapper() }
    );

    expect(screen.getByTestId('location-picker')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// DynamicForm with LOCATION_RELATION tests
// ---------------------------------------------------------------------------

describe('DynamicForm with LOCATION_RELATION', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLocationTree.mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    });
  });

  it('renders LocationPicker when form has LOCATION_RELATION field', () => {
    const fields: DynamicFieldDefinition[] = [
      {
        id: 'f1',
        key: 'location',
        name: 'Location',
        type: 'LOCATION_RELATION',
        required: false,
        order: 0,
        active: true,
        visible: true,
        showInList: false,
        showInSearch: false,
      },
    ];

    render(<DynamicForm fields={fields} onSubmit={vi.fn()} />, { wrapper: createWrapper() });

    expect(screen.getByTestId('location-picker')).toBeInTheDocument();
    expect(screen.queryByText('Coming soon')).not.toBeInTheDocument();
  });

  it('renders LOCATION_RELATION alongside other field types', () => {
    const fields: DynamicFieldDefinition[] = [
      {
        id: 'f1',
        key: 'name',
        name: 'Name',
        type: 'SHORT_TEXT',
        required: true,
        order: 0,
        active: true,
        visible: true,
        showInList: false,
        showInSearch: false,
      },
      {
        id: 'f2',
        key: 'location',
        name: 'Location',
        type: 'LOCATION_RELATION',
        required: false,
        order: 1,
        active: true,
        visible: true,
        showInList: false,
        showInSearch: false,
      },
    ];

    render(<DynamicForm fields={fields} onSubmit={vi.fn()} />, { wrapper: createWrapper() });

    // Both the text input and LocationPicker should render
    expect(screen.getByPlaceholderText(/Enter Name/)).toBeInTheDocument();
    expect(screen.getByTestId('location-picker')).toBeInTheDocument();
  });

  it('still renders FILE as deferred (Coming soon)', () => {
    const fields: DynamicFieldDefinition[] = [
      {
        id: 'f1',
        key: 'attachment',
        name: 'Attachment',
        type: 'FILE',
        required: false,
        order: 0,
        active: true,
        visible: true,
        showInList: false,
        showInSearch: false,
      },
    ];

    render(<DynamicForm fields={fields} onSubmit={vi.fn()} />, { wrapper: createWrapper() });

    expect(screen.getByPlaceholderText('Coming soon')).toBeInTheDocument();
  });
});
