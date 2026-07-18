'use client';

/**
 * Sidebar — interactive client component for the application shell.
 *
 * Renders project navigation, user info, and sign-out.
 * Server Components pass pre-fetched projects as props;
 * this component owns only interactive/mobile state.
 *
 * Accessibility features:
 *   - aria-controls links toggle button to nav
 *   - aria-expanded reflects mobile menu state
 *   - Focus moves to first link when mobile menu opens
 *   - Focus returns to toggle when mobile menu closes
 *   - Escape key closes mobile menu
 *   - Clicking overlay backdrop closes mobile menu
 *   - Adequate touch targets (min 44x44 CSS px)
 *   - Reduced-motion-safe transitions
 *
 * Spec: specs/application-shell/spec.md
 * Design: design.md — "Only forms, navigation state, and SessionProvider are client components"
 * Modern-web-guidance: navigation-drawer, accessibility
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';

export interface SidebarProject {
  id: string;
  code: string;
  name: string;
}

interface SidebarProps {
  projects: SidebarProject[];
  user?: { email: string; name: string | null } | null;
  backgroundId?: string;
}

const DRAWER_ID = 'sidebar-drawer';

export function Sidebar({ projects, user, backgroundId = 'dashboard-background' }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousMobileOpen = useRef(false);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    const background = document.getElementById(backgroundId);
    if (mobileOpen) {
      background?.setAttribute('inert', '');
      if (!previousMobileOpen.current) {
        const firstControl = drawerRef.current?.querySelector<HTMLElement>('a, button');
        firstControl?.focus();
      }
    } else {
      background?.removeAttribute('inert');
      if (previousMobileOpen.current) toggleRef.current?.focus();
    }
    previousMobileOpen.current = mobileOpen;
  }, [backgroundId, mobileOpen]);

  useEffect(() => {
    return () => document.getElementById(backgroundId)?.removeAttribute('inert');
  }, [backgroundId]);

  // Escape key closes mobile menu
  useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMobile();
        return;
      }

      if (e.key === 'Tab' && drawerRef.current) {
        const controls = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>('a, button')
        );
        if (controls.length === 0) return;

        const first = controls[0];
        const last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, closeMobile]);

  function isActiveProject(projectId: string) {
    return pathname.startsWith(`/projects/${projectId}`);
  }

  function handleToggle() {
    setMobileOpen((prev) => !prev);
  }

  return (
    <aside className="flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar-background md:w-64">
      {/* Mobile toggle */}
      <div className="flex items-center justify-between p-4 md:hidden">
        <span className="text-sm font-semibold text-sidebar-foreground">ManteMap</span>
        <button
          ref={toggleRef}
          type="button"
          onClick={handleToggle}
          aria-expanded={mobileOpen}
          aria-controls={DRAWER_ID}
          aria-label="Toggle menu"
          className="          rounded-md p-3 text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring motion-reduce:transition-none"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {mobileOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile overlay backdrop — click to dismiss */}
      {mobileOpen && (
        <div
          data-sidebar-overlay
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      <div
        ref={drawerRef}
        id={DRAWER_ID}
        role="dialog"
        aria-modal={mobileOpen ? true : undefined}
        aria-label="Workspace navigation"
        data-sidebar-panel
        className={`${
          mobileOpen ? 'fixed inset-y-0 left-0 z-50 flex w-64' : 'hidden'
        } flex-1 flex-col bg-sidebar-background md:static md:flex md:w-auto`}
      >
        <nav aria-label="Projects" className="flex-1 overflow-y-auto p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
            Projects
          </h2>

          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet</p>
          ) : (
            <ul className="space-y-1">
              {projects.map((project) => {
                const active = isActiveProject(project.id);
                return (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      aria-current={active ? 'page' : undefined}
                      className={`block min-h-11 rounded-md px-3 py-2.5 text-sm transition-colors motion-reduce:transition-none ${
                        active && !pathname.includes('/items')
                          ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                      }`}
                      onClick={closeMobile}
                    >
                      {project.name}
                    </Link>
                    {active && (
                      <>
                        <Link
                          href={`/projects/${project.id}/items`}
                          className={`ml-4 block min-h-11 rounded-md px-3 py-2.5 text-sm transition-colors motion-reduce:transition-none ${
                            pathname.includes('/items')
                              ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                          }`}
                          onClick={closeMobile}
                        >
                          Items
                        </Link>
                        <Link
                          href={`/projects/${project.id}/calendar`}
                          className={`ml-4 block min-h-11 rounded-md px-3 py-2.5 text-sm transition-colors motion-reduce:transition-none ${
                            pathname.includes('/calendar')
                              ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                              : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                          }`}
                          onClick={closeMobile}
                        >
                          Calendar
                        </Link>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {user && (
          <div className="border-t border-sidebar-border p-4">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {user.name || user.email}
            </p>
            {user.name && (
              <p className="truncate text-xs text-sidebar-foreground/60">{user.email}</p>
            )}
            <button
              type="button"
              onClick={() => signOut()}
              className="mt-2 min-h-11 w-full rounded-md border border-sidebar-border px-3 py-2.5 text-xs text-sidebar-foreground transition-colors motion-reduce:transition-none hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
