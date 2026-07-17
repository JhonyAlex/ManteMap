// @vitest-environment jsdom
/**
 * RED tests for auth layout.
 *
 * Verifies:
 *   - Renders children (login/register forms)
 *   - Does NOT render the protected sidebar
 *   - Does NOT render navigation landmarks
 *
 * Spec: specs/application-shell/spec.md — "Unauthenticated shell request"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
}));

// Mock next-auth/react
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
  signOut: vi.fn(),
}));

import AuthLayout from './layout';
import { useSession } from 'next-auth/react';

const mockUseSession = useSession as Mock;

describe('AuthLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
  });

  it('renders children', () => {
    render(<AuthLayout><div>Login Form</div></AuthLayout>);

    expect(screen.getByText('Login Form')).toBeInTheDocument();
  });

  it('does not render a sidebar', () => {
    render(<AuthLayout><div>Content</div></AuthLayout>);

    expect(screen.queryByRole('navigation', { name: /projects/i })).not.toBeInTheDocument();
  });

  it('does not render a skip-to-content link', () => {
    render(<AuthLayout><div>Content</div></AuthLayout>);

    expect(screen.queryByRole('link', { name: /skip to content/i })).not.toBeInTheDocument();
  });
});
