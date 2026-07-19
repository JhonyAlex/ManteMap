/**
 * Project Dashboard page — Server Component.
 *
 * Displays project-scoped KPIs, activity timeline, and CSV export links.
 * Requires project membership; non-members get a 404.
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "Project Dashboard Metrics" — authorized KPIs+timeline
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "Server Components call services directly"
 */

import React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { getProjectMetrics, getRecentActivity } from '@/lib/services/metrics-service';
import { KpiGrid } from '@/components/dashboard/kpi-grid';
import { ActivityTimeline } from '@/components/dashboard/activity-timeline';
import { ExportLinks } from '@/components/dashboard/export-links';

interface ProjectDashboardPageProps {
  params: Promise<{ projectCode: string }>;
}

export default async function ProjectDashboardPage({
  params,
}: ProjectDashboardPageProps) {
  const { projectCode } = await params;
  const projectId = await resolveProjectId(projectCode);
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  let metrics;
  let activity;

  try {
    [metrics, activity] = await Promise.all([
      getProjectMetrics(projectId, user.id),
      getRecentActivity(projectId, user.id),
    ]);
  } catch (error) {
    // requireProjectMember throws NotFoundError for non-members
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Project Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of project metrics, recent activity, and data exports.
        </p>
      </div>

      <section aria-label="Project metrics">
        <h2 className="mb-3 text-lg font-semibold">Key Metrics</h2>
        <KpiGrid metrics={metrics} />
      </section>

      <section aria-label="Recent activity">
        <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
        <ActivityTimeline entries={activity} />
      </section>

      <section aria-label="Data exports">
        <h2 className="mb-3 text-lg font-semibold">Export Data</h2>
        <ExportLinks projectId={projectId} />
      </section>
    </div>
  );
}
