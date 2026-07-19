import React from 'react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { getDashboardProjects } from '@/lib/services/dashboard-service';
import { getProjectMetrics } from '@/lib/services/metrics-service';
import { ProjectSummaryCard } from '@/components/dashboard/project-summary-card';
import { redirect } from 'next/navigation';

/**
 * Dashboard page — Server Component.
 *
 * Shows a welcome message and summary of the user's accessible projects
 * with cross-project metric counts (items, alerts, expiring documents).
 * Unauthenticated users are redirected by middleware + layout auth check.
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "Cross-Project Summary Dashboard" — per-project summaries
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "Server Components call services directly"
 */

interface ProjectWithMetrics {
  id: string;
  code: string;
  name: string;
  totalItems: number;
  activeAlerts: number;
  documentsExpiringSoon: number;
}

async function fetchProjectMetrics(
  projects: { id: string; code: string; name: string }[],
  userId: string
): Promise<ProjectWithMetrics[]> {
  const results = await Promise.allSettled(
    projects.map(async (project) => {
      const metrics = await getProjectMetrics(project.id, userId);
      return {
        id: project.id,
        code: project.code,
        name: project.name,
        totalItems: metrics.totalItems,
        activeAlerts: metrics.activeAlerts,
        documentsExpiringSoon: metrics.documentsExpiringSoon,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<ProjectWithMetrics> => r.status === 'fulfilled')
    .map((r) => r.value);
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { projects } = await getDashboardProjects(user.id);

  // Fetch metrics for all projects concurrently
  const projectsWithMetrics =
    projects.length > 0 ? await fetchProjectMetrics(projects, user.id) : [];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Dashboard</h1>

      <p className="mb-6 text-muted-foreground">
        Welcome back{user.name ? `, ${user.name}` : ''}. Here&apos;s an overview of your projects.
      </p>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            You don&apos;t have any projects yet. Create your first project to get started.
          </p>
          <Link
            href="/projects/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Create Project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projectsWithMetrics.map((project) => (
            <ProjectSummaryCard
              key={project.id}
              projectCode={project.code}
              projectName={project.name}
              totalItems={project.totalItems}
              activeAlerts={project.activeAlerts}
              documentsExpiringSoon={project.documentsExpiringSoon}
            />
          ))}
        </div>
      )}
    </div>
  );
}
