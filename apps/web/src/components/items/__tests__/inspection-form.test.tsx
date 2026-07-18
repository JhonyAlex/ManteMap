// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock('@/components/items/status-transition', () => ({
  StatusTransition: vi.fn(() => null),
}));

// ---------------------------------------------------------------------------
// RED — component does not exist yet
// ---------------------------------------------------------------------------
import { InspectionForm } from '../inspection-form';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const PROJECT_ID = 'clprojxxxxxxxxxxxxxxxxxx';
const ITEM_ID = 'clitemxxxxxxxxxxxxxxxxx';
const USER_ID = 'cluserxxxxxxxxxxxxxxxxx';

const mockOnSubmit = vi.fn();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setup(overrides = {}) {
  const user = userEvent.setup();
  const props = {
    projectId: PROJECT_ID,
    itemId: ITEM_ID,
    userId: USER_ID,
    onSubmit: mockOnSubmit,
    ...overrides,
  };
  render(<InspectionForm {...props} />);
  return user;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InspectionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render notes textarea', () => {
    setup();
    expect(screen.getByPlaceholderText(/inspection notes/i)).toBeInTheDocument();
  });

  it('should render submit button', () => {
    setup();
    expect(
      screen.getByRole('button', { name: /log inspection/i }),
    ).toBeInTheDocument();
  });

  it('should call onSubmit with notes when submitted', async () => {
    const user = setup();
    const textarea = screen.getByPlaceholderText(/inspection notes/i);
    const submitBtn = screen.getByRole('button', { name: /log inspection/i });

    await user.type(textarea, 'Bearing noise detected');
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        notes: 'Bearing noise detected',
        statusId: undefined,
        photoPath: undefined,
      });
    });
  });

  it('should call onSubmit with no notes when submitted empty', async () => {
    const user = setup();
    const submitBtn = screen.getByRole('button', { name: /log inspection/i });

    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        notes: undefined,
        statusId: undefined,
        photoPath: undefined,
      });
    });
  });

  it('should show "Log Inspection" as button text', () => {
    setup();
    const btn = screen.getByRole('button', { name: /log inspection/i });
    expect(btn).toBeInTheDocument();
  });

  it('should render large touch-friendly textarea', () => {
    setup();
    const textarea = screen.getByPlaceholderText(/inspection notes/i);
    expect(textarea).toBeInTheDocument();
    // The textarea should be full-width for mobile
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('should display heading "Log Inspection"', () => {
    setup();
    expect(
      screen.getByRole('heading', { name: /log inspection/i }),
    ).toBeInTheDocument();
  });
});
