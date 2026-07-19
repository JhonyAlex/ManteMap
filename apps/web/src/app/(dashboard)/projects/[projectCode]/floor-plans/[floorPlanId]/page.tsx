import React from 'react';
import { notFound } from 'next/navigation';
import { NotFoundError, AuthorizationError } from '@mantemap/shared';
import { getCurrentUser } from '@/lib/auth/session';
import { resolveProjectId } from '@/lib/services/project-service';
import { getFloorPlan, listMarkers } from '@/lib/services/floor-plan-service';
import { FloorPlanViewer } from '@/components/floor-plans/floor-plan-viewer';
import type { MarkerSummary } from '@/hooks/use-floor-plans';

interface FloorPlanViewPageProps {
  params: Promise<{ projectCode: string; floorPlanId: string }>;
}

export default async function FloorPlanViewPage({ params }: FloorPlanViewPageProps) {
  const user = await getCurrentUser();
  if (!user) notFound();

  const { projectCode, floorPlanId } = await params;
  const projectId = await resolveProjectId(projectCode);

  try {
    const { floorPlan } = await getFloorPlan(projectId, floorPlanId, user.id);
    const { markers } = await listMarkers(projectId, floorPlanId, user.id);

    const imageUrl = `/api/projects/${projectId}/floor-plans/${floorPlanId}/image`;

    return (
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{floorPlan.name}</h1>
          <p className="text-sm text-muted-foreground">
            {floorPlan.width}×{floorPlan.height}px
          </p>
        </div>
        <div className="h-[70vh] w-full overflow-hidden rounded-lg border">
          <FloorPlanViewer
            imageUrl={imageUrl}
            imageWidth={floorPlan.width}
            imageHeight={floorPlan.height}
            markers={markers as MarkerSummary[]}
            canDrag={false}
          />
        </div>
      </div>
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError || error instanceof AuthorizationError) {
      notFound();
    }
    throw error;
  }
}
