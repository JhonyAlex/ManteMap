'use client';

/**
 * KpiGrid — displays project metrics as a grid of KPI cards.
 *
 * Shows six metric groups: total items, active alerts, total documents,
 * documents expiring soon, upcoming events, and active locations.
 *
 * Supports loading skeleton and zero/empty states with ARIA labels.
 *
 * Spec: openspec/changes/phase-9-dashboard-reports/specs/dashboard-reporting/spec.md
 *   "Dashboard UI States" — skeleton loading, zero/empty states, ARIA
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "Components" — KPI grid with Card primitives
 */

import React from 'react';
import type { ProjectMetrics } from '@mantemap/shared';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@mantemap/ui';

interface KpiGridProps {
  metrics?: ProjectMetrics;
  loading?: boolean;
}

function KpiSkeleton() {
  return (
    <div data-testid="kpi-skeleton" aria-hidden="true" className="animate-pulse rounded-lg border p-4">
      <div className="mb-2 h-4 w-24 rounded bg-muted" />
      <div className="h-8 w-16 rounded bg-muted" />
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  emptyMessage?: string;
}

function KpiCard({ label, value, emptyMessage }: KpiCardProps) {
  return (
    <li>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {value === 0 && emptyMessage ? (
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
        </CardContent>
      </Card>
    </li>
  );
}

export function KpiGrid({ metrics, loading = false }: KpiGridProps) {
  if (loading) {
    return (
      <div role="region" aria-label="Project metrics loading">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <KpiSkeleton key={i} />
          ))}
        </ul>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div role="region" aria-label="Project metrics">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard label="Total Items" value={metrics.totalItems} />
        <KpiCard
          label="Active Alerts"
          value={metrics.activeAlerts}
          emptyMessage="No active alerts"
        />
        <KpiCard label="Documents" value={metrics.totalDocuments} />
        <KpiCard
          label="Expiring Soon"
          value={metrics.documentsExpiringSoon}
        />
        <KpiCard label="Upcoming Events" value={metrics.upcomingEvents} />
        <KpiCard label="Locations" value={metrics.activeLocations} />
      </ul>
    </div>
  );
}
