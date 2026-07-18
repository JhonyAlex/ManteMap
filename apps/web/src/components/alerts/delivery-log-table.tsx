/**
 * DeliveryLogTable — shows notification delivery history with filters.
 *
 * Displays deliveries fetched from the notification-deliveries API with
 * optional filtering by channel type and status. Shows status badges
 * (sent=green, failed=red, skipped=yellow) and error messages.
 *
 * Spec: openspec/changes/phase-10-external-notifications/specs/channel-configuration/spec.md
 *   (Delivery log viewing)
 * Design: openspec/changes/phase-10-external-notifications/design.md
 *   "DeliveryLogTable (Client Component)"
 */

'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ApiResponse } from '@mantemap/shared';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Badge,
  Label,
} from '@mantemap/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DeliveryLogEntry {
  id: string;
  alertId: string;
  userId: string;
  channelType: string;
  status: string; // "sent" | "failed" | "skipped"
  errorMessage: string | null;
  deliveredAt: string;
}

export interface DeliveryLogTableProps {
  projectId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_VARIANTS: Record<string, 'default' | 'destructive' | 'secondary'> = {
  sent: 'default',
  failed: 'destructive',
  skipped: 'secondary',
};

async function fetchDeliveries(
  projectId: string,
  channelType?: string,
  status?: string
): Promise<DeliveryLogEntry[]> {
  const params = new URLSearchParams();
  if (channelType) params.set('channelType', channelType);
  if (status) params.set('status', status);

  const queryString = params.toString();
  const url = queryString
    ? `/api/projects/${projectId}/notification-deliveries?${queryString}`
    : `/api/projects/${projectId}/notification-deliveries`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed with status ${res.status}`);
  }
  const json = (await res.json()) as ApiResponse<DeliveryLogEntry[]>;
  return json.data as DeliveryLogEntry[];
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DeliveryLogTable({ projectId }: DeliveryLogTableProps) {
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const {
    data: deliveries,
    isLoading,
    error,
  } = useQuery<DeliveryLogEntry[]>({
    queryKey: ['notification-deliveries', projectId, channelFilter, statusFilter],
    queryFn: () => fetchDeliveries(projectId, channelFilter || undefined, statusFilter || undefined),
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Delivery Log</h3>
        <p className="text-sm text-muted-foreground">Loading deliveries...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Delivery Log</h3>
        <p className="text-sm text-destructive">Error loading deliveries. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Delivery Log</h3>
        <div className="flex gap-2">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="channel-filter" className="text-xs whitespace-nowrap">
              Channel
            </Label>
            <select
              id="channel-filter"
              aria-label="Channel"
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="email">email</option>
              <option value="slack">slack</option>
              <option value="teams">teams</option>
              <option value="telegram">telegram</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5">
            <Label htmlFor="status-filter" className="text-xs whitespace-nowrap">
              Status
            </Label>
            <select
              id="status-filter"
              aria-label="Status"
              className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="sent">sent</option>
              <option value="failed">failed</option>
              <option value="skipped">skipped</option>
            </select>
          </div>
        </div>
      </div>

      {!deliveries || deliveries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No deliveries found.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Alert</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Error</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deliveries.map((delivery) => (
              <TableRow key={delivery.id}>
                <TableCell className="whitespace-nowrap text-xs">
                  {formatDate(delivery.deliveredAt)}
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {delivery.alertId.slice(0, 8)}...
                </TableCell>
                <TableCell className="text-xs">{delivery.channelType}</TableCell>
                <TableCell>
                  <Badge
                    variant={STATUS_VARIANTS[delivery.status] ?? 'secondary'}
                  >
                    {delivery.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-destructive">
                  {delivery.errorMessage ?? '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
