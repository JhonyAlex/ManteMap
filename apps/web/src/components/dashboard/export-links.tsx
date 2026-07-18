'use client';

/**
 * ExportLinks — CSV download links for project data exports.
 *
 * Renders links to download items, documents, and alerts as CSV files.
 * The actual access control is enforced server-side by the reports API route.
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "CSV Export with Access Control" — authorized CSV download links
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "CSV" — dedicated project-scoped projections
 */

import React from 'react';
import Link from 'next/link';
import type { ReportType } from '@mantemap/shared';

interface ExportLinksProps {
  projectId: string;
}

interface ExportLinkDef {
  type: ReportType;
  label: string;
}

const EXPORT_LINKS: ExportLinkDef[] = [
  { type: 'items', label: 'Export Items CSV' },
  { type: 'documents', label: 'Export Documents CSV' },
  { type: 'alerts', label: 'Export Alerts CSV' },
];

export function ExportLinks({ projectId }: ExportLinksProps) {
  return (
    <nav aria-label="CSV exports">
      <ul className="flex flex-wrap gap-3">
        {EXPORT_LINKS.map((link) => (
          <li key={link.type}>
            <Link
              href={`/api/projects/${projectId}/reports?type=${link.type}`}
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
