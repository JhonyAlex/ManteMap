/**
 * Redirect route: resolves old CUID URLs to code-based URLs.
 *
 * Design: design.md — "Redirect route: [projectId]/page.tsx uses permanentRedirect()"
 * Spec: specs/application-shell/spec.md — "Project CUID redirect backward compatibility"
 *
 * When a user navigates to /projects/{projectId} (CUID), this route
 * resolves the CUID to its project code and issues a 308 redirect.
 * This preserves existing bookmarks and external links.
 */

import { permanentRedirect } from 'next/navigation';
import { findProjectById } from '@/lib/repositories/project-repository';

export default async function ProjectRedirectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const project = await findProjectById(projectId);
  if (!project) {
    // Let Next.js handle the 404 — notFound() would be appropriate but
    // permanentRedirect is the primary behavior; missing project just
    // means the CUID is invalid and should 404 naturally.
    // We use a lightweight throw to trigger the not-found boundary.
    const { notFound } = await import('next/navigation');
    notFound();
  }

  permanentRedirect(`/projects/${project.code}`);
}
