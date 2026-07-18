import React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectById } from '@/lib/services/project-service';
import { NotFoundError } from '@mantemap/shared';

/**
 * Project page — Server Component.
 *
 * Resolves project access server-side. Non-members receive a safe
 * not-found result (404) to avoid disclosing project existence.
 * Only accessible projects render their details.
 *
 * Spec: specs/application-shell/spec.md — "Inaccessible context"
 * Design: design.md — "Non-members receive NotFoundError (404) to avoid disclosing project existence"
 */

export default async function ProjectPage({
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
    // NotFoundError for non-members or non-existent projects
    // AuthorizationError would also result in not-found for safety
    if (error instanceof NotFoundError) {
      notFound();
    }
    // Re-throw unexpected errors
    throw error;
  }

  return (
    <div>
      {project.description && (
        <p className="mb-6 text-muted-foreground">{project.description}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
          <p className="mt-1 text-sm font-semibold">{project.status}</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Code</h3>
          <p className="mt-1 text-sm font-semibold">{project.code}</p>
        </div>
      </div>
    </div>
  );
}
