/**
 * GET /api/projects/[projectId]/reports?type=items|documents|alerts
 *
 * CSV export endpoint for project data.
 * Enforces project membership server-side.
 *
 * Design: openspec/changes/phase-9-dashboard-reports/design.md
 *   "Interfaces / Contracts" section.
 */

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, notFound, internalError } from '@/lib/http/api-error';
import { exportProjectCsv } from '@/lib/services/metrics-service';
import { NotFoundError } from '@mantemap/shared';
import { REPORT_TYPES } from '@mantemap/shared';
import type { ReportType } from '@mantemap/shared';

/**
 * GET handler for CSV report export.
 *
 * Status codes:
 * - 400: missing or invalid `type` query parameter
 * - 401: no authenticated session
 * - 404: project not found or user is not a member
 * - 200: CSV content returned
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  // Auth check
  const auth = await getAuthUser();
  if ('error' in auth) {
    return auth.error;
  }

  // Validate type parameter
  const url = new URL(request.url);
  const type = url.searchParams.get('type') as ReportType | null;

  if (!type || !REPORT_TYPES.includes(type)) {
    return badRequest(
      `Missing or invalid 'type' parameter. Must be one of: ${REPORT_TYPES.join(', ')}`
    );
  }

  try {
    const { projectId } = await params;
    const csvContent = await exportProjectCsv(projectId, auth.user.id, type);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${projectId}-${type}-${formatDate(new Date())}.csv"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      return notFound('Project not found');
    }

    return internalError();
  }
}

/**
 * Format a date as YYYY-MM-DD for the filename.
 */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
