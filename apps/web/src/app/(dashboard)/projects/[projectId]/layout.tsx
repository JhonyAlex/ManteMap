/**
 * Project layout — wraps project-specific pages.
 *
 * Adds a project header with AlertBell for the alerts feature.
 *
 * Spec: openspec/changes/phase-8-alerts/specs/alert-management/spec.md
 * Design: openspec/changes/phase-8-alerts/design.md
 *   "Add AlertBell to header"
 */

import React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectById } from '@/lib/services/project-service';
import { NotFoundError } from '@mantemap/shared';
import { AlertBell } from '@/components/alerts/alert-bell';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  let project;
  try {
    const result = await getProjectById(projectId, user.id);
    project = result.project;
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {project.code}
          </span>
        </div>
        <AlertBell projectId={projectId} />
      </div>
      {children}
    </div>
  );
}
