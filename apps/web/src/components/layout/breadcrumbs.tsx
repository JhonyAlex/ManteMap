'use client';

/**
 * Breadcrumbs — client component for the application shell.
 *
 * Renders breadcrumb navigation from the current pathname.
 * Uses semantic nav landmark with ordered list.
 * Accepts optional projectNames and entityMaps to resolve entity IDs to names.
 *
 * Spec: specs/application-shell/spec.md — "Responsive and accessible navigation"
 * Spec: specs/application-shell/spec.md — "Breadcrumb name resolution"
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href: string;
}

/** Maps of entity ID → display name for breadcrumb resolution. */
export interface EntityMaps {
  floorPlans?: Record<string, string>;
  items?: Record<string, string>;
  itemTypes?: Record<string, string>;
  locations?: Record<string, string>;
  events?: Record<string, string>;
}

interface BreadcrumbsProps {
  /** Map of project ID → project name for resolving breadcrumb labels */
  projectNames?: Record<string, string>;
  /** Maps of entity ID → display name for resolving other entity segments */
  entityMaps?: EntityMaps;
  /** When true, hides breadcrumbs on project routes (dashboard layout delegates to project layout) */
  hideOnProjectRoutes?: boolean;
}

/** Route segments that should not appear as breadcrumb entries. */
const SKIP_SEGMENTS = new Set(['dashboard', 'projects']);

export function pathToBreadcrumbs(
  pathname: string,
  projectNames?: Record<string, string>,
  entityMaps?: EntityMaps
): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: 'Dashboard', href: '/dashboard' }];

  if (segments[0] === 'dashboard' && segments.length === 1) {
    return items;
  }

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;

    // Skip route-group segments (dashboard, projects)
    if (SKIP_SEGMENTS.has(segment)) continue;

    // Resolve segment against all available maps — first match wins
    let label: string | undefined;

    // 1. Check projectNames first
    label = projectNames?.[segment];

    // 2. Check entity maps
    if (!label && entityMaps) {
      label =
        entityMaps.floorPlans?.[segment] ??
        entityMaps.items?.[segment] ??
        entityMaps.itemTypes?.[segment] ??
        entityMaps.locations?.[segment] ??
        entityMaps.events?.[segment];
    }

    // 3. Fall back to formatted raw segment
    if (!label) {
      label =
        segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    }

    items.push({ label, href: currentPath });
  }

  return items;
}

export function Breadcrumbs({
  projectNames,
  entityMaps,
  hideOnProjectRoutes,
}: BreadcrumbsProps) {
  const pathname = usePathname();

  // When hideOnProjectRoutes is set, suppress breadcrumbs on project routes
  // so the project layout can render its own with full entityMaps.
  if (
    hideOnProjectRoutes &&
    /^\/dashboard\/projects\/[^/]+/.test(pathname)
  ) {
    return null;
  }

  const items = pathToBreadcrumbs(pathname, projectNames, entityMaps);

  return (
    <nav aria-label="Breadcrumb" className="py-3">
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1">
              {index > 0 && (
                <span aria-hidden="true" className="text-muted-foreground/40">
                  /
                </span>
              )}
              {isLast ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="rounded-sm hover:text-foreground transition-colors motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
