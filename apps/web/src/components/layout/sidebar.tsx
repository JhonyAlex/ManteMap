'use client';

/**
 * Sidebar — interactive client component for the application shell.
 *
 * Keeps the mobile drawer focus-managed while offering a persisted compact
 * desktop rail and independently expandable project navigation.
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

interface ProjectNavigationItem {
  label: string;
  href: string;
}

const DRAWER_ID = 'sidebar-drawer';
const DESKTOP_COMPACT_STORAGE_KEY = 'mantemap-sidebar-desktop-compact';

function NavigationIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform motion-reduce:transition-none ${expanded ? 'rotate-90' : ''}`}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function MenuIcon({ compact }: { compact: boolean }) {
  return (
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
      {compact ? <path d="M9 18l6-6-6-6" /> : <path d="m15 18-6-6 6-6" />}
    </svg>
  );
}

export function Sidebar({ projects, user, backgroundId = 'dashboard-background' }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCompact, setDesktopCompact] = useState(false);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    () => new Set(projects.filter((project) => pathname.startsWith(`/projects/${project.code}`)).map((project) => project.id))
  );
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousMobileOpen = useRef(false);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  useEffect(() => {
    try {
      setDesktopCompact(window.localStorage.getItem(DESKTOP_COMPACT_STORAGE_KEY) === 'true');
    } catch {
      // Storage can be unavailable in private or restricted browser contexts.
    }
  }, []);

  useEffect(() => {
    const activeProject = projects.find((project) => pathname.startsWith(`/projects/${project.code}`));
    if (activeProject) {
      setExpandedProjects((current) => {
        if (current.has(activeProject.id)) return current;
        return new Set(current).add(activeProject.id);
      });
    }
  }, [pathname, projects]);

  useEffect(() => {
    const background = document.getElementById(backgroundId);
    if (mobileOpen) {
      background?.setAttribute('inert', '');
      if (!previousMobileOpen.current) {
        const firstControl = drawerRef.current?.querySelector<HTMLElement>('nav a, nav button');
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

  useEffect(() => {
    if (!mobileOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeMobile();
        return;
      }

      if (event.key === 'Tab' && drawerRef.current) {
        const controls = Array.from(drawerRef.current.querySelectorAll<HTMLElement>('a, button')).filter(
          (control) => !control.closest('[data-desktop-only]')
        );
        if (controls.length === 0) return;

        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, closeMobile]);

  function isActiveProject(projectCode: string) {
    return pathname.startsWith(`/projects/${projectCode}`);
  }

  function isCurrentRoute(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleMobileToggle() {
    setMobileOpen((previous) => !previous);
  }

  function handleDesktopToggle() {
    setDesktopCompact((previous) => {
      const next = !previous;
      try {
        window.localStorage.setItem(DESKTOP_COMPACT_STORAGE_KEY, String(next));
      } catch {
        // The sidebar remains usable even when the browser disallows storage.
      }
      return next;
    });
  }

  function toggleProject(projectId: string) {
    setExpandedProjects((current) => {
      const next = new Set(current);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  }

  return (
    <aside
      className={`group flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar-background transition-[width] motion-reduce:transition-none ${
        desktopCompact ? 'md:w-20' : 'md:w-64'
      }`}
    >
      <div className="flex items-center justify-between border-b border-sidebar-border p-3 md:hidden">
        <span className="text-sm font-semibold text-sidebar-foreground">ManteMap</span>
        <button
          ref={toggleRef}
          type="button"
          onClick={handleMobileToggle}
          aria-expanded={mobileOpen}
          aria-controls={DRAWER_ID}
          aria-label="Toggle menu"
          className="rounded-md p-3 text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring motion-reduce:transition-none"
        >
          <MenuIcon compact={mobileOpen} />
        </button>
      </div>

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
        <div data-desktop-only className="hidden items-center justify-between border-b border-sidebar-border p-3 md:flex">
          <span className={desktopCompact ? 'sr-only' : 'text-sm font-semibold text-sidebar-foreground'}>
            ManteMap
          </span>
          <button
            type="button"
            onClick={handleDesktopToggle}
            aria-label={desktopCompact ? 'Expand sidebar' : 'Collapse sidebar'}
            title={desktopCompact ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-11 w-11 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring motion-reduce:transition-none"
          >
            <MenuIcon compact={desktopCompact} />
          </button>
        </div>

        <nav aria-label="Projects" className={`flex-1 overflow-y-auto ${desktopCompact ? 'p-2 md:px-2' : 'p-4'}`}>
          <div className={`mb-3 flex items-center ${desktopCompact ? 'justify-center md:justify-center' : 'justify-between'}`}>
            <h2 className={`text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/70 ${desktopCompact ? 'md:sr-only' : ''}`}>
              Projects
            </h2>
            <Link
              href="/projects/new"
              className="flex h-11 w-11 items-center justify-center rounded-md text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring motion-reduce:transition-none"
              aria-label="New project"
              title="New project"
              onClick={closeMobile}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </Link>
          </div>

          {projects.length === 0 ? (
            <p className={`text-sm text-muted-foreground ${desktopCompact ? 'md:sr-only' : ''}`}>No projects yet</p>
          ) : (
            <ul className="space-y-2">
              {projects.map((project) => {
                const projectHref = `/projects/${project.code}`;
                const activeProject = isActiveProject(project.code);
                const expanded = expandedProjects.has(project.id);
                const submenuId = `project-navigation-${project.id}`;
                const navigationItems: ProjectNavigationItem[] = [
                  { label: 'Dashboard', href: `${projectHref}/dashboard` },
                  { label: 'Items', href: `${projectHref}/items` },
                  { label: 'Item Types', href: `${projectHref}/item-types` },
                  { label: 'Locations', href: `${projectHref}/locations` },
                  { label: 'Floor Plans', href: `${projectHref}/floor-plans` },
                  { label: 'Calendar', href: `${projectHref}/calendar` },
                  { label: 'Alerts', href: `${projectHref}/alerts` },
                ];

                return (
                  <li key={project.id}>
                    <div className={`flex items-center rounded-md ${activeProject ? 'bg-sidebar-accent/60' : ''}`}>
                      <Link
                        href={projectHref}
                        aria-current={pathname === projectHref ? 'page' : undefined}
                        aria-label={project.name}
                        title={desktopCompact ? project.name : undefined}
                        className={`flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-l-md border-l-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring motion-reduce:transition-none ${
                          activeProject
                            ? 'border-sidebar-primary font-semibold text-sidebar-accent-foreground'
                            : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        } ${desktopCompact ? 'md:justify-center md:px-2' : ''}`}
                        onClick={closeMobile}
                      >
                        <NavigationIcon className={desktopCompact ? 'md:block' : 'hidden'} />
                        <span className={`truncate ${desktopCompact ? 'md:sr-only' : ''}`}>{project.name}</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleProject(project.id)}
                        aria-expanded={expanded}
                        aria-controls={submenuId}
                        aria-label={`${expanded ? 'Collapse' : 'Expand'} ${project.name} navigation`}
                        title={`${expanded ? 'Collapse' : 'Expand'} ${project.name} navigation`}
                        className={`flex min-h-11 min-w-11 items-center justify-center rounded-r-md text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring motion-reduce:transition-none ${
                          activeProject ? 'text-sidebar-accent-foreground' : ''
                        }`}
                      >
                        <ChevronIcon expanded={expanded} />
                      </button>
                    </div>
                    <ul id={submenuId} hidden={!expanded} className="mt-1 space-y-1">
                      {navigationItems.map((item) => {
                        const currentRoute = isCurrentRoute(item.href);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              aria-current={currentRoute ? 'page' : undefined}
                              aria-label={item.label}
                              title={desktopCompact ? item.label : undefined}
                              className={`flex min-h-11 items-center gap-2 rounded-md border-l-2 px-3 py-2.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring motion-reduce:transition-none ${
                                currentRoute
                                  ? 'border-sidebar-primary bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-sm'
                                  : 'border-transparent text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
                              } ${desktopCompact ? 'md:justify-center md:px-2' : 'ml-4'}`}
                              onClick={closeMobile}
                            >
                              <NavigationIcon className={desktopCompact ? 'md:block' : 'hidden'} />
                              <span className={desktopCompact ? 'md:sr-only' : ''}>{item.label}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>

        {user && (
          <div className={`border-t border-sidebar-border ${desktopCompact ? 'p-2' : 'p-4'}`}>
            <div className={desktopCompact ? 'md:sr-only' : ''}>
              <p className="truncate text-sm font-medium text-sidebar-foreground">{user.name || user.email}</p>
              {user.name && <p className="truncate text-xs text-sidebar-foreground/70">{user.email}</p>}
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="Sign out"
              title={desktopCompact ? 'Sign out' : undefined}
              className={`mt-2 flex min-h-11 w-full items-center justify-center rounded-md border border-sidebar-border px-3 py-2.5 text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring motion-reduce:transition-none ${
                desktopCompact ? 'md:px-2' : ''
              }`}
            >
              <span className={desktopCompact ? 'md:sr-only' : ''}>Sign out</span>
              <span className={desktopCompact ? 'hidden md:block' : 'hidden'} aria-hidden="true">↗</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
