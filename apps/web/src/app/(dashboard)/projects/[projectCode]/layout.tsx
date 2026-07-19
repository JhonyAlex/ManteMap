/**
 * Project layout — wraps project-specific pages.
 *
 * Adds a project header with AlertBell for the alerts feature.
 * Fetches entity name maps and renders breadcrumbs with resolved names.
 *
 * Spec: openspec/changes/phase-8-alerts/specs/alert-management/spec.md
 * Spec: openspec/changes/human-readable-urls-and-floor-plan-fixes/specs/application-shell/spec.md
 *   — "Breadcrumb name resolution"
 */

import React from 'react';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectByCode } from '@/lib/services/project-service';
import { NotFoundError } from '@mantemap/shared';
import { AlertBell } from '@/components/alerts/alert-bell';
import { Breadcrumbs, type EntityMaps } from '@/components/layout/breadcrumbs';
import { findFloorPlansByProject } from '@/lib/repositories/floor-plan-repository';
import { findItemTypesByProject } from '@/lib/repositories/item-type-repository';
import { findLocationsByProject } from '@/lib/repositories/location-repository';
import prisma from '@mantemap/database';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectCode: string }>;
}) {
  const { projectCode } = await params;
  const user = await getCurrentUser();

  if (!user) {
    notFound();
  }

  let project;
  try {
    const result = await getProjectByCode(projectCode, user.id);
    project = result.project;
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }

  // Use the resolved CUID for repository queries
  const projectId = project.id;

  // Fetch entity name maps for breadcrumb resolution
  const [floorPlans, itemTypes, locations, items, events] = await Promise.all([
    findFloorPlansByProject(projectId).then((fps) =>
      Object.fromEntries(fps.map((fp) => [fp.id, fp.name]))
    ),
    findItemTypesByProject(projectId).then((its) =>
      Object.fromEntries(its.map((it) => [it.id, it.name]))
    ),
    findLocationsByProject(projectId).then((locs) =>
      Object.fromEntries(locs.map((l) => [l.id, l.name]))
    ),
    prisma.item.findMany({
      where: { itemType: { projectId } },
      select: { id: true, name: true },
    }).then((rows) =>
      Object.fromEntries(rows.map((r) => [r.id, r.name]))
    ),
    prisma.event.findMany({
      where: { projectId },
      select: { id: true, title: true },
    }).then((rows) =>
      Object.fromEntries(rows.map((r) => [r.id, r.title]))
    ),
  ]);

  const entityMaps: EntityMaps = {
    floorPlans,
    itemTypes,
    locations,
    items,
    events,
  };

  const projectNames: Record<string, string> = {
    [project.id]: project.name,
  };

  return (
    <div>
      <Breadcrumbs entityMaps={entityMaps} projectNames={projectNames} />
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
