import { NextResponse } from 'next/server';
import { testChannelSchema } from '@mantemap/validation';
import { AuthorizationError, NotFoundError } from '@mantemap/shared';
import { getAuthUser } from '@/lib/auth/session';
import { badRequest, forbidden, internalError, notFound } from '@/lib/http/api-error';
import { getUserChannelConfig } from '@/lib/repositories/channel-config-repository';

// Import channel adapters directly for test messaging
import { EmailChannel } from '@/lib/services/channels/email-channel';
import { SlackChannel } from '@/lib/services/channels/slack-channel';
import { TeamsChannel } from '@/lib/services/channels/teams-channel';
import { TelegramChannel } from '@/lib/services/channels/telegram-channel';
import type { NotificationChannel } from '@/lib/services/channels/types';
import type { JsonValue } from '@prisma/client/runtime/library';
import type { ApiResponse } from '@mantemap/shared';

const channels: Record<string, NotificationChannel> = {
  email: new EmailChannel(),
  slack: new SlackChannel(),
  teams: new TeamsChannel(),
  telegram: new TelegramChannel(),
};

/**
 * POST /api/projects/[projectId]/notification-channels/test
 * Body: { channelType: "slack" | "teams" | "telegram" }
 *
 * Sends a test message using the user's stored channel config.
 */
export async function POST(
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

    const parsed = testChannelSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest(parsed.error.errors.map(e => e.message).join(', '));
    }

    const { channelType } = parsed.data;

    // Get stored config for this user + channel type
    const channelConfig = await getUserChannelConfig(auth.user.id, channelType);
    if (!channelConfig) {
      return NextResponse.json(
        { data: { success: false, error: 'Channel not configured' } } satisfies ApiResponse,
      );
    }

    // Get channel adapter
    const channel = channels[channelType];
    if (!channel) {
      return NextResponse.json(
        { data: { success: false, error: `Channel type '${channelType}' not supported` } } satisfies ApiResponse,
      );
    }

    // Send test message
    const result = await channel.send(
      {
        id: 'test-alert',
        alertType: 'EVENT_UPCOMING',
        severity: 'INFO',
        title: '🧪 ManteMap — Channel Test',
        message: 'This is a test message to verify your notification channel is configured correctly.',
        metadata: null,
      },
      { id: auth.user.id, name: auth.user.name || null, email: auth.user.email },
      channelConfig.config as JsonValue,
      'Test Project',
    );

    return NextResponse.json(
      { data: { success: result.success, error: result.error } } satisfies ApiResponse,
    );
  } catch (error: unknown) {
    if (error instanceof NotFoundError) return notFound('Project not found');
    if (error instanceof AuthorizationError) return forbidden();
    return internalError();
  }
}
