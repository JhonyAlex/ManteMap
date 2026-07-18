import { NextResponse } from 'next/server';
import { channelTypeEnum, upsertChannelConfigSchema } from '@mantemap/validation';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import {
  getUserChannelConfig,
  upsertUserChannelConfig,
  deleteUserChannelConfig,
  listUserChannelConfigs,
} from '@/lib/repositories/channel-config-repository';
import type { ApiResponse } from '@mantemap/shared';

/**
 * GET /api/projects/[projectId]/notification-channels?type={channelType}
 * - Without query: list all configured channels for current user
 * - With ?type=slack: get specific config
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: _projectId } = await params;
    const { searchParams } = new URL(request.url);
    const channelType = searchParams.get('type');

    if (channelType) {
      const config = await getUserChannelConfig(auth.user.id, channelType);
      if (!config) {
        return NextResponse.json(
          { data: { configured: false, config: null } } satisfies ApiResponse,
        );
      }
      return NextResponse.json({ data: config } satisfies ApiResponse);
    }

    const configs = await listUserChannelConfigs(auth.user.id);
    return NextResponse.json({ data: configs } satisfies ApiResponse);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}

/**
 * PUT /api/projects/[projectId]/notification-channels
 * Body: { channelType, config, enabled? }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: _projectId } = await params;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return badRequest('Invalid JSON in request body');
    }

    const parsed = upsertChannelConfigSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors.map(e => e.message).join(', '));
    }

    const { channelType, config, enabled } = parsed.data;

    const result = await upsertUserChannelConfig(
      auth.user.id,
      channelType,
      config as object,
      enabled,
    );

    return NextResponse.json(
      { data: result, message: 'Channel config saved successfully' } satisfies ApiResponse,
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}

/**
 * DELETE /api/projects/[projectId]/notification-channels?type={channelType}
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const auth = await getAuthUser();
  if ('error' in auth) return auth.error;
  try {
    const { projectId: _projectId } = await params;
    const { searchParams } = new URL(request.url);
    const channelType = searchParams.get('type');

    if (!channelType) {
      return badRequest('channelType query parameter is required');
    }

    const parsed = channelTypeEnum.safeParse(channelType);
    if (!parsed.success) {
      return badRequest(`Invalid channel type: ${channelType}`);
    }

    await deleteUserChannelConfig(auth.user.id, channelType);

    return NextResponse.json(
      { message: `Channel config '${channelType}' deleted successfully` } satisfies ApiResponse,
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
