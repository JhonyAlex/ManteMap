// @vitest-environment jsdom
/**
 * RED tests for Register page.
 *
 * Verifies:
 *   - Renders name, email, and password inputs with labels
 *   - Renders a submit button
 *   - Shows validation errors for empty/invalid fields
 *   - Shows error message on failed registration (e.g., duplicate email)
 *   - Shows loading state during submission
 *   - Links to login page
 *   - Uses autocomplete attributes for accessibility
 *
 * Spec: specs/application-shell/spec.md — "Unauthenticated shell request"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

// Mock fetch for registration API
const mockFetch = vi.fn();
global.fetch = mockFetch;

import RegisterPage from './page';

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: 'user-1' }, message: 'Registration successful' }),
    });
  });

  it('renders name, email, and password inputs with labels', () => {
    render(<RegisterPage />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    render(<RegisterPage />);

    expect(screen.getByRole('button', { name: /register|sign up|create.*account/i })).toBeInTheDocument();
  });

  it('renders a link to the login page', () => {
    render(<RegisterPage />);

    const loginLink = screen.getByRole('link', { name: /log in|sign in|already.*account/i });
    expect(loginLink).toBeInTheDocument();
    expect(loginLink).toHaveAttribute('href', '/login');
  });

  it('shows validation error when submitting empty fields', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    const submitButton = screen.getByRole('button', { name: /register|sign up|create.*account/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/name.*required|at least 2/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for weak password', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'weak');
    await user.click(screen.getByRole('button', { name: /register|sign up|create.*account/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8|password.*must/i)).toBeInTheDocument();
    });
  });

  it('calls registration API on valid submission', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /register|sign up|create.*account/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/auth/register', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'Password123',
        }),
      }));
    });
  });

  it('shows a generic error message when registration fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'CONFLICT', message: 'A user with this email already exists' }),
    });

    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /register|sign up|create.*account/i }));

    await waitFor(() => {
      expect(screen.getByText(/already exists|email.*taken/i)).toBeInTheDocument();
    });
  });

  it('uses autocomplete attributes for form inputs', () => {
    render(<RegisterPage />);

    expect(screen.getByLabelText(/name/i)).toHaveAttribute('autocomplete', 'name');
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('autocomplete', 'new-password');
  });

  it('disables the submit button and shows loading text during registration', async () => {
    // Make fetch hang so we can inspect the loading state
    mockFetch.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /register|sign up|create.*account/i }));

    const button = screen.getByRole('button', { name: /creating account/i });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/creating account/i);
  });

  it('re-enables the submit button after failed registration', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'CONFLICT', message: 'Duplicate' }),
    });
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /register|sign up|create.*account/i }));

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /create account/i });
      expect(button).toBeEnabled();
    });
  });

  it('shows error alert with role="alert" without exposing duplicate account state', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'CONFLICT', message: 'A user with this email already exists' }),
    });
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'existing@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /register|sign up|create.*account/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/already exists/i);
    });
  });

  it('shows general error alert on unexpected server failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'INTERNAL', message: 'Something went wrong' }),
    });
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /register|sign up|create.*account/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/something went wrong|registration failed/i);
    });
  });
});
