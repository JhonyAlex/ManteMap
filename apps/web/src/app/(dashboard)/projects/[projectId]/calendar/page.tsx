/**
 * Calendar page — Server Component.
 *
 * Renders the CalendarView client component with project context.
 * Access is checked server-side; non-members receive 404.
 *
 * Spec: openspec/changes/phase-6-events/specs/calendar-view/spec.md
 *   "Calendar Page" — accessible at /projects/{projectId}/calendar/
 * Design: openspec/changes/phase-6-events/design.md
 *   "Server Component with auth check, renders CalendarView"
 */

import React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectById } from '@/lib/services/project-service';
import { NotFoundError } from '@mantemap/shared';
import { CalendarView } from '@/components/events/calendar-view';

export default async function CalendarPage({
  params,
}: {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="mt-1 text-muted-foreground">
          Events and document expirations for{' '}
          <span className="font-medium">{project.name}</span>
        </p>
      </div>

      <CalendarView projectId={projectId} />
    </div>
  );
}
