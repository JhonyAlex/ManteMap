'use client';

/**
 * ProjectSummaryCard — displays a project-level summary for the global dashboard.
 *
 * Shows project name, code, and key metric counts (items, alerts, expiring docs).
 * Links to the project-specific dashboard.
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "Cross-Project Summary Dashboard" — per-project summaries
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "Components" — global summary with Card
 */

import React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mantemap/ui';

interface ProjectSummaryCardProps {
  projectId: string;
  projectCode: string;
  projectName: string;
  totalItems: number;
  activeAlerts: number;
  documentsExpiringSoon: number;
}

export function ProjectSummaryCard({
  projectId,
  projectCode,
  projectName,
  totalItems,
  activeAlerts,
  documentsExpiringSoon,
}: ProjectSummaryCardProps) {
  return (
    <Link
      href={`/projects/${projectId}/dashboard`}
      className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Card className="transition-colors hover:bg-accent">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold">
              {projectName}
            </CardTitle>
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
              {projectCode}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-xs text-muted-foreground">Items</dt>
              <dd className="text-lg font-bold">{totalItems}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Alerts</dt>
              <dd className="text-lg font-bold">{activeAlerts}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Expiring</dt>
              <dd className="text-lg font-bold">{documentsExpiringSoon}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}
