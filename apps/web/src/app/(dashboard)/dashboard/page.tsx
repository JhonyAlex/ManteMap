import React from 'react';
import { getCurrentUser } from '@/lib/auth/session';
import { getDashboardProjects } from '@/lib/services/dashboard-service';
import { redirect } from 'next/navigation';

/**
 * Dashboard page — Server Component.
 *
 * Shows a welcome message and summary of the user's accessible projects.
 * Unauthenticated users are redirected by middleware + layout auth check.
 *
 * Spec: specs/application-shell/spec.md — "Authenticated workspace navigation"
 * Design: design.md — "Server Components by default"
 */

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const { projects } = await getDashboardProjects(user.id);

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold tracking-tight">Dashboard</h1>

      <p className="mb-6 text-muted-foreground">
        Welcome back{user.name ? `, ${user.name}` : ''}. Here&apos;s an overview of your projects.
      </p>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            You don&apos;t have any projects yet. Create your first project to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <a
              key={project.id}
              href={`/projects/${project.id}`}
              className="block rounded-lg border p-4 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <h2 className="font-semibold">{project.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{project.code}</p>
              {project.description && (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
