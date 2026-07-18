/**
 * Alerts page — Server Component.
 *
 * Renders the alerts dashboard for a project with the alert list
 * and notification preferences.
 *
 * Spec: openspec/changes/phase-8-alerts/specs/alert-management/spec.md
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "Alerts dashboard page"
 */

import React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectById } from '@/lib/services/project-service';
import { NotFoundError } from '@mantemap/shared';
import { AlertList } from '@/components/alerts/alert-list';
import { NotificationPreferences } from '@/components/alerts/notification-preferences';

export default async function AlertsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  try {
    await getProjectById(projectId, user.id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View and manage alerts for this project.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-4 text-lg font-semibold">Alert List</h2>
          <AlertList projectId={projectId} />
        </div>

        <div>
          <NotificationPreferences projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
