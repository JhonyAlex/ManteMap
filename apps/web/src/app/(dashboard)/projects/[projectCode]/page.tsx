import React from 'react';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectById, resolveProjectId } from '@/lib/services/project-service';
import { getProjectMetrics } from '@/lib/services/metrics-service';
import { NotFoundError } from '@mantemap/shared';
import { ProjectSettings } from '@/components/project-settings';

interface ProjectHubPageProps {
  params: Promise<{ projectCode: string }>;
}

const quickLinks = [
  {
    href: (code: string) => `/projects/${code}/dashboard`,
    label: 'Dashboard',
    description: 'KPIs, activity timeline, and data exports.',
  },
  {
    href: (code: string) => `/projects/${code}/item-types`,
    label: 'Item Types',
    description: 'Configure item types, dynamic fields, and statuses.',
  },
  {
    href: (code: string) => `/projects/${code}/items`,
    label: 'Items',
    description: 'Manage assets, documents, and field values.',
  },
  {
    href: (code: string) => `/projects/${code}/locations`,
    label: 'Locations',
    description: 'Manage hierarchical locations (buildings, floors, rooms).',
  },
  {
    href: (code: string) => `/projects/${code}/floor-plans`,
    label: 'Floor Plans',
    description: 'Upload and manage interactive floor plans with markers.',
  },
  {
    href: (code: string) => `/projects/${code}/calendar`,
    label: 'Calendar',
    description: 'Schedule events with recurrence and expiration tracking.',
  },
  {
    href: (code: string) => `/projects/${code}/alerts`,
    label: 'Alerts',
    description: 'View and configure alerts and notification preferences.',
  },
];

export default async function ProjectPage({ params }: ProjectHubPageProps) {
  const { projectCode } = await params;
  const user = await getCurrentUser();

  if (!user) {
    return notFound();
  }

  let project;
  try {
    const projectId = await resolveProjectId(projectCode);
    const result = await getProjectById(projectId, user.id);
    project = result.project;
  } catch (error) {
    if (error instanceof NotFoundError) {
      return notFound();
    }
    throw error;
  }

  if (projectCode !== project.code) {
    return permanentRedirect(`/projects/${project.code}`);
  }

  let metrics;
  try {
    metrics = await getProjectMetrics(project.id, user.id);
  } catch {
    metrics = null;
  }

  return (
    <div>
      {project.description && (
        <p className="mb-6 text-muted-foreground">{project.description}</p>
      )}

      {metrics && (
        <div className="mb-8 grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">{metrics.totalItems}</p>
            <p className="text-xs text-muted-foreground">Items</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">{metrics.activeAlerts}</p>
            <p className="text-xs text-muted-foreground">Active Alerts</p>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <p className="text-2xl font-bold">{metrics.documentsExpiringSoon}</p>
            <p className="text-xs text-muted-foreground">Expiring Docs</p>
          </div>
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.label}
            href={link.href(project.code)}
            className="rounded-lg border p-4 transition-colors hover:bg-accent"
          >
            <h3 className="font-medium">{link.label}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <ProjectSettings
          projectId={project.id}
          currentName={project.name}
          currentDescription={project.description}
        />
      </div>
    </div>
  );
}
