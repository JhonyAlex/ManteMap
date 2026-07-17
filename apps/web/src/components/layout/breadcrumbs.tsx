'use client';

/**
 * Breadcrumbs — client component for the application shell.
 *
 * Renders breadcrumb navigation from the current pathname.
 * Uses semantic nav landmark with ordered list.
 *
 * Spec: specs/application-shell/spec.md — "Responsive and accessible navigation"
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface BreadcrumbItem {
  label: string;
  href: string;
}

function pathToBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: 'Dashboard', href: '/dashboard' }];

  if (segments[0] === 'dashboard' && segments.length === 1) {
    return items;
  }

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;

    // Skip the root dashboard entry (already added)
    if (segment === 'dashboard') continue;

    // Capitalize and format segment
    const label = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');
    items.push({ label, href: currentPath });
  }

  return items;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const items = pathToBreadcrumbs(pathname);

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
