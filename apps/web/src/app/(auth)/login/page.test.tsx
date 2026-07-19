// @vitest-environment jsdom
/**
 * RED tests for Login page.
 *
 * Verifies:
 *   - Renders email and password inputs with labels
 *   - Renders a submit button
 *   - Shows validation errors for empty fields
 *   - Shows error message on failed login
 *   - Shows loading state during submission
 *   - Links to register page
 *   - Uses autocomplete attributes for accessibility
 *
 * Spec: specs/application-shell/spec.md — "Unauthenticated shell request"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  usePathname: vi.fn(),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
}));

import LoginPage from './page';
import { signIn } from 'next-auth/react';

const mockSignIn = signIn as Mock;

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email and password inputs with labels', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    render(<LoginPage />);

    expect(screen.getByRole('button', { name: /sign in|log in/i })).toBeInTheDocument();
  });

  it('renders a link to the register page', () => {
    render(<LoginPage />);

    const registerLink = screen.getByRole('link', { name: /register|sign up|create.*account/i });
    expect(registerLink).toBeInTheDocument();
    expect(registerLink).toHaveAttribute('href', '/register');
  });

  it('shows validation error when submitting empty fields', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const submitButton = screen.getByRole('button', { name: /sign in|log in/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email.*required|invalid.*email/i)).toBeInTheDocument();
    });
  });

  it('calls signIn with credentials on valid submission', async () => {
    mockSignIn.mockResolvedValue({ ok: true, error: null });
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /sign in|log in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', expect.objectContaining({
        email: 'test@example.com',
        password: 'Password123',
        redirect: true,
        callbackUrl: '/dashboard',
      }));
    });
  });

  it('shows a fallback error when sign-in fails before the server redirect', async () => {
    mockSignIn.mockRejectedValue(new Error('Network failure'));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword1');
    await user.click(screen.getByRole('button', { name: /sign in|log in/i }));

    await waitFor(() => {
      expect(screen.getByText(/unexpected error.*try again/i)).toBeInTheDocument();
    });
  });

  it('uses autocomplete attributes for form inputs', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('autocomplete', 'current-password');
  });

  it('uses type="email" for email input', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
  });

  it('uses type="password" for password input', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('disables the submit button and shows loading text during sign-in', async () => {
    // Make signIn hang so we can inspect the loading state
    mockSignIn.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123');
    await user.click(screen.getByRole('button', { name: /sign in|log in/i }));

    const button = screen.getByRole('button', { name: /signing in/i });
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent(/signing in/i);
  });

  it('re-enables the submit button after failed sign-in', async () => {
    mockSignIn.mockRejectedValue(new Error('Network failure'));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword1');
    await user.click(screen.getByRole('button', { name: /sign in|log in/i }));

    await waitFor(() => {
      const button = screen.getByRole('button', { name: /sign in/i });
      expect(button).toBeEnabled();
    });
  });

  it('uses an accessible alert for pre-redirect sign-in failures', async () => {
    mockSignIn.mockRejectedValue(new Error('Network failure'));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'WrongPassword1');
    await user.click(screen.getByRole('button', { name: /sign in|log in/i }));

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent(/unexpected error.*try again/i);
    });
  });
});
