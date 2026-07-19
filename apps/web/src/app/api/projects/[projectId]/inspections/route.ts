import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { logInspection } from '@/lib/services/inspection-service';

/**
 * POST /api/projects/[projectId]/inspections
 *
 * Log a new inspection for an item.
 * Body: { itemId, statusId?, notes?, photoPath? }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId: rawProjectIdentifier } = await params;
    const projectId = await resolveProjectId(rawProjectIdentifier);
    const body = await request.json();

    const { itemId, statusId, notes, photoPath } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: 'itemId is required' },
        { status: 400 },
      );
    }

    const result = await logInspection(projectId, {
      itemId,
      userId: user.id,
      statusId,
      notes,
      photoPath,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error('Failed to log inspection:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
