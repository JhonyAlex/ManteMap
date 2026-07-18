// @vitest-environment jsdom
/**
 * RED tests for Sidebar component.
 *
 * These tests verify:
 *   - Renders accessible projects only
 *   - Shows empty state when user has no projects
 *   - Shows user email/name in the sidebar
 *   - Toggle button has aria-expanded attribute
 *   - Mobile menu can be opened and closed
 *   - Current project is visually indicated
 *   - Keyboard navigation: Escape closes mobile menu
 *
 * Spec: specs/application-shell/spec.md
 * Design: design.md — "Responsive and accessible navigation"
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

// Import AFTER mocks are registered
import { Sidebar } from './sidebar';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';

const mockUsePathname = usePathname as Mock;
const mockUseSession = useSession as Mock;
const mockSignOut = signOut as Mock;

function makeSession(overrides: Partial<{ id: string; email: string; name: string | null; role: string }> = {}) {
  return {
    data: {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'TECHNICIAN',
        ...overrides,
      },
    },
    status: 'authenticated' as const,
  };
}

const projects = [
  { id: 'proj-1', code: 'ALPHA', name: 'Alpha Project' },
  { id: 'proj-2', code: 'BETA', name: 'Beta Project' },
];

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue('/dashboard');
    mockUseSession.mockReturnValue(makeSession());
    mockSignOut.mockResolvedValue(undefined);
  });

  describe('project navigation', () => {
    it('renders accessible projects in navigation', () => {
      render(<Sidebar projects={projects} />);

      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
      expect(screen.getByText('Beta Project')).toBeInTheDocument();
    });

    it('renders only the projects passed as props (no unauthorized projects)', () => {
      render(<Sidebar projects={[{ id: 'proj-1', code: 'ALPHA', name: 'Alpha Project' }]} />);

      expect(screen.getByText('Alpha Project')).toBeInTheDocument();
      expect(screen.queryByText('Beta Project')).not.toBeInTheDocument();
    });

    it('shows empty state when user has no projects', () => {
      render(<Sidebar projects={[]} />);

      expect(screen.getByText(/no projects/i)).toBeInTheDocument();
    });

    it('highlights the current project based on pathname', () => {
      mockUsePathname.mockReturnValue('/projects/proj-1');
      render(<Sidebar projects={projects} />);

      const alphaLink = screen.getByRole('link', { name: /alpha project/i });
      expect(alphaLink).toHaveAttribute('aria-current', 'page');
    });

    it('does not highlight non-current projects', () => {
      mockUsePathname.mockReturnValue('/projects/proj-1');
      render(<Sidebar projects={projects} />);

      const betaLink = screen.getByRole('link', { name: /beta project/i });
      expect(betaLink).not.toHaveAttribute('aria-current', 'page');
    });

    it('shows Calendar nav link when a project is active', () => {
      mockUsePathname.mockReturnValue('/projects/proj-1');
      render(<Sidebar projects={projects} />);

      expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument();
    });

    it('shows Items nav link when a project is active', () => {
      mockUsePathname.mockReturnValue('/projects/proj-1');
      render(<Sidebar projects={projects} />);

      expect(screen.getByRole('link', { name: /^items$/i })).toBeInTheDocument();
    });

    it('highlights Calendar link when on calendar page', () => {
      mockUsePathname.mockReturnValue('/projects/proj-1/calendar');
      render(<Sidebar projects={projects} />);

      const calendarLink = screen.getByRole('link', { name: /calendar/i });
      // Calendar link is visually highlighted via bg-sidebar-accent class
      expect(calendarLink.className).toContain('bg-sidebar-accent');
    });

    it('does not show Calendar link when no project is active', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<Sidebar projects={projects} />);

      expect(screen.queryByRole('link', { name: /calendar/i })).not.toBeInTheDocument();
    });

    it('shows Dashboard nav link when a project is active', () => {
      mockUsePathname.mockReturnValue('/projects/proj-1');
      render(<Sidebar projects={projects} />);

      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    });

    it('Dashboard link points to the project dashboard route', () => {
      mockUsePathname.mockReturnValue('/projects/proj-1');
      render(<Sidebar projects={projects} />);

      const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/projects/proj-1/dashboard');
    });

    it('does not show Dashboard link when no project is active', () => {
      mockUsePathname.mockReturnValue('/dashboard');
      render(<Sidebar projects={projects} />);

      expect(screen.queryByRole('link', { name: /^dashboard$/i })).not.toBeInTheDocument();
    });
  });

  describe('user info', () => {
    it('displays the user email', () => {
      render(<Sidebar projects={projects} user={{ email: 'test@example.com', name: 'Test User' }} />);

      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });

    it('displays the user name when available', () => {
      render(<Sidebar projects={projects} user={{ email: 'test@example.com', name: 'Test User' }} />);

      expect(screen.getByText('Test User')).toBeInTheDocument();
    });
  });

  describe('sign out', () => {
    it('renders a sign out button', () => {
      render(<Sidebar projects={projects} user={{ email: 'test@example.com', name: 'Test User' }} />);

      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('calls signOut when the button is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar projects={projects} user={{ email: 'test@example.com', name: 'Test User' }} />);

      await user.click(screen.getByRole('button', { name: /sign out/i }));

      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('mobile sidebar', () => {
    it('toggle button has aria-expanded attribute', () => {
      render(<Sidebar projects={projects} />);

      const toggle = screen.getByRole('button', { name: /toggle menu/i });
      expect(toggle).toHaveAttribute('aria-expanded');
    });

    it('aria-expanded is false by default (menu closed)', () => {
      render(<Sidebar projects={projects} />);

      const toggle = screen.getByRole('button', { name: /toggle menu/i });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('aria-expanded becomes true when toggle is clicked', async () => {
      const user = userEvent.setup();
      render(<Sidebar projects={projects} />);

      const toggle = screen.getByRole('button', { name: /toggle menu/i });
      await user.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('closes mobile menu when Escape is pressed', async () => {
      const user = userEvent.setup();
      render(<Sidebar projects={projects} />);

      const toggle = screen.getByRole('button', { name: /toggle menu/i });
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');

      await user.keyboard('{Escape}');

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('accessibility', () => {
    it('navigation has an accessible label', () => {
      render(<Sidebar projects={projects} />);

      expect(screen.getByRole('navigation', { name: /projects/i })).toBeInTheDocument();
    });

    it('project links have descriptive text', () => {
      render(<Sidebar projects={projects} />);

      const links = screen.getAllByRole('link');
      links.forEach((link) => {
        expect(link.textContent).toBeTruthy();
      });
    });

    it('toggle button has aria-controls pointing to the drawer panel', () => {
      render(<Sidebar projects={projects} />);

      const toggle = screen.getByRole('button', { name: /toggle menu/i });
      const navId = toggle.getAttribute('aria-controls');
      expect(navId).toBeTruthy();

      const nav = document.getElementById(navId!);
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveAttribute('role', 'dialog');
    });

    it('focus moves into the nav when mobile menu opens', async () => {
      const user = userEvent.setup();
      render(<Sidebar projects={projects} />);

      const toggle = screen.getByRole('button', { name: /toggle menu/i });
      await user.click(toggle);

      // After opening, the first project link should receive focus
      const firstLink = screen.getByRole('link', { name: /alpha project/i });
      expect(firstLink).toHaveFocus();
    });

    it('focus returns to toggle button when mobile menu closes via Escape', async () => {
      const user = userEvent.setup();
      render(<Sidebar projects={projects} />);

      const toggle = screen.getByRole('button', { name: /toggle menu/i });
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');

      await user.keyboard('{Escape}');

      expect(toggle).toHaveAttribute('aria-expanded', 'false');
      expect(toggle).toHaveFocus();
    });

    it('closes mobile menu when clicking outside the nav (overlay)', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div>
          <Sidebar projects={projects} />
          <div data-testid="outside">Outside content</div>
        </div>
      );

      const toggle = screen.getByRole('button', { name: /toggle menu/i });
      await user.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');

      // Click on the overlay backdrop
      const overlay = container.querySelector('[data-sidebar-overlay]');
      if (overlay) {
        await user.click(overlay as Element);
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
      }
    });

    it('keeps user controls inside the elevated mobile drawer', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <div id="dashboard-background">
          <Sidebar projects={projects} user={{ email: 'test@example.com', name: 'Test User' }} />
        </div>
      );

      await user.click(screen.getByRole('button', { name: /toggle menu/i }));

      const drawer = container.querySelector('[data-sidebar-panel]');
      expect(drawer).toHaveClass('z-50');
      expect(drawer).toContainElement(screen.getByRole('button', { name: /sign out/i }));
      expect(container.querySelector('[data-sidebar-overlay]')).toHaveClass('z-40');
      expect(document.getElementById('dashboard-background')).toHaveAttribute('inert');
    });

    it('traps Tab focus within the open drawer', async () => {
      const user = userEvent.setup();
      render(
        <Sidebar projects={projects} user={{ email: 'test@example.com', name: 'Test User' }} />
      );

      await user.click(screen.getByRole('button', { name: /toggle menu/i }));
      const controls = screen.getAllByRole('link').concat(screen.getByRole('button', { name: /sign out/i }));
      controls[controls.length - 1].focus();
      await user.tab();

      expect(controls[0]).toHaveFocus();
    });

    it('toggle button has minimum touch target size', () => {
      render(<Sidebar projects={projects} />);

      const toggle = screen.getByRole('button', { name: /toggle menu/i });
      // The button should have adequate padding for touch targets (min 44x44 CSS px)
      expect(toggle.className).toMatch(/p-\d/);
    });

    it('project links include reduced-motion override for transition-colors', () => {
      render(<Sidebar projects={projects} />);

      const links = screen.getAllByRole('link');
      for (const link of links) {
        const cls = link.className;
        if (cls.includes('transition-colors')) {
          // Tailwind motion-reduce:transition-none ensures no transition
          // for users who prefer reduced motion (WCAG 2.3.3)
          expect(cls).toContain('motion-reduce:transition-none');
        }
      }
    });

    it('sign-out button includes reduced-motion override for transition-colors', () => {
      render(<Sidebar projects={projects} user={{ email: 'test@example.com', name: 'Test User' }} />);

      const signOutBtn = screen.getByRole('button', { name: /sign out/i });
      const cls = signOutBtn.className;
      if (cls.includes('transition-colors')) {
        expect(cls).toContain('motion-reduce:transition-none');
      }
    });
  });
});
