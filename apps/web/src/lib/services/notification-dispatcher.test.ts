import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationDispatcher } from './notification-dispatcher';
import type {
  DispatcherDependencies,
  MemberWithPreferences,
  AlertForDispatch,
} from './notification-dispatcher';

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

function makeAlert(overrides: Partial<AlertForDispatch> = {}): AlertForDispatch {
  return {
    id: 'alert-1',
    alertType: 'DOCUMENT_EXPIRING',
    severity: 'WARNING',
    title: 'Document "Permit.pdf" expiring in 7 days',
    message: 'This document expires on 2026-07-25',
    metadata: { daysUntilExpiry: 7, documentName: 'Permit.pdf' },
    projectId: 'proj-1',
    ...overrides,
  };
}

function makeMember(overrides: Partial<MemberWithPreferences> = {}): MemberWithPreferences {
  return {
    userId: 'user-1',
    email: 'user1@example.com',
    name: 'User One',
    preferences: [
      {
        alertType: 'DOCUMENT_EXPIRING',
        enabled: true,
        email: true,
        slack: true,
        teams: false,
        telegram: false,
        webhook: false,
      },
      {
        alertType: 'EVENT_UPCOMING',
        enabled: true,
        email: false,
        slack: false,
        teams: false,
        telegram: false,
        webhook: false,
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const channelRegistry = { get: vi.fn() };
const getUserChannelConfig = vi.fn();
const existsDelivery = vi.fn();
const createDelivery = vi.fn();
const getMembersWithPreferences = vi.fn();
const getProjectById = vi.fn();
const getRecentAlerts = vi.fn();

function makeDeps(): DispatcherDependencies {
  return {
    channelRegistry,
    getUserChannelConfig,
    existsDelivery,
    createDelivery,
    getMembersWithPreferences,
    getProjectById,
    getRecentAlerts,
  };
}

const mockChannel = {
  type: 'mock',
  send: vi.fn(),
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Tests: dispatch()
// ---------------------------------------------------------------------------

describe('NotificationDispatcher.dispatch', () => {
  it('queries members with preferences for the alert type', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    expect(getMembersWithPreferences).toHaveBeenCalledWith('proj-1', 'DOCUMENT_EXPIRING');
  });

  it('does nothing when no members have channel preferences enabled', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([
      makeMember({
        preferences: [
          {
            alertType: 'DOCUMENT_EXPIRING',
            enabled: true,
            email: false,
            slack: false,
            teams: false,
            telegram: false,
            webhook: false,
          },
        ],
      }),
    ]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    // No deliveries logged
    expect(createDelivery).not.toHaveBeenCalled();
  });

  it('sends via email channel when email preference is enabled', async () => {
    const deps = makeDeps();
    const member = makeMember();
    getMembersWithPreferences.mockResolvedValue([member]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    // Register email channel mock
    const emailChannel = { type: 'email', send: vi.fn().mockResolvedValue({ success: true }) };
    channelRegistry.get.mockImplementation((type: string) =>
      type === 'email' ? emailChannel : undefined,
    );

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    expect(channelRegistry.get).toHaveBeenCalledWith('email');
    expect(emailChannel.send).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'alert-1', alertType: 'DOCUMENT_EXPIRING' }),
      { id: member.userId, name: member.name, email: member.email },
      undefined,
      'Test Project',
    );
  });

  it('skips already-delivered notifications (dedup check)', async () => {
    const deps = makeDeps();
    const member = makeMember();
    getMembersWithPreferences.mockResolvedValue([member]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });
    existsDelivery.mockResolvedValue(true);

    const emailChannel = { type: 'email', send: vi.fn().mockResolvedValue({ success: true }) };
    channelRegistry.get.mockReturnValue(emailChannel);

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    expect(existsDelivery).toHaveBeenCalledWith('alert-1', 'user-1', 'email');
    expect(emailChannel.send).not.toHaveBeenCalled();
  });

  it('logs successful delivery', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([makeMember()]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    const emailChannel = { type: 'email', send: vi.fn().mockResolvedValue({ success: true }) };
    channelRegistry.get.mockReturnValue(emailChannel);

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    expect(createDelivery).toHaveBeenCalledWith({
      alertId: 'alert-1',
      userId: 'user-1',
      channelType: 'email',
      status: 'sent',
      errorMessage: undefined,
    });
  });

  it('logs failed delivery when channel returns error', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([makeMember()]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    const emailChannel = {
      type: 'email',
      send: vi.fn().mockResolvedValue({ success: false, error: 'SMTP error' }),
    };
    channelRegistry.get.mockReturnValue(emailChannel);

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    expect(createDelivery).toHaveBeenCalledWith({
      alertId: 'alert-1',
      userId: 'user-1',
      channelType: 'email',
      status: 'failed',
      errorMessage: 'SMTP error',
    });
  });

  it('does not throw when delivery fails', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([makeMember()]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    const emailChannel = {
      type: 'email',
      send: vi.fn().mockRejectedValue(new Error('Network crash')),
    };
    channelRegistry.get.mockReturnValue(emailChannel);

    const dispatcher = new NotificationDispatcher(deps);
    // Should not throw
    await expect(dispatcher.dispatch(makeAlert(), 'proj-1')).resolves.toBeUndefined();
  });

  it('logs delivery failure when channel throws', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([makeMember()]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    const emailChannel = {
      type: 'email',
      send: vi.fn().mockRejectedValue(new Error('Network crash')),
    };
    channelRegistry.get.mockReturnValue(emailChannel);

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    expect(createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'failed',
        errorMessage: 'Network crash',
      }),
    );
  });

  it('fetches channel config for Slack channel', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([makeMember()]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    const slackChannel = { type: 'slack', send: vi.fn().mockResolvedValue({ success: true }) };
    channelRegistry.get.mockImplementation((type: string) =>
      type === 'slack' ? slackChannel : undefined,
    );
    getUserChannelConfig.mockResolvedValue({ config: { webhookUrl: 'https://hooks.slack.com/x' } });

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    expect(getUserChannelConfig).toHaveBeenCalledWith('user-1', 'slack');
    expect(slackChannel.send).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { webhookUrl: 'https://hooks.slack.com/x' },
      expect.anything(),
    );
  });

  it('skips channel when no config exists (non-email)', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([makeMember()]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    channelRegistry.get.mockReturnValue(undefined); // No channel registered
    getUserChannelConfig.mockResolvedValue(null);

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    // Slack is enabled in preferences but no config — should be skipped
    expect(createDelivery).not.toHaveBeenCalled();
  });

  it('dispatches to multiple channels for the same member', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([
      makeMember({
        preferences: [
          {
            alertType: 'DOCUMENT_EXPIRING',
            enabled: true,
            email: true,
            slack: true,
            teams: true,
            telegram: false,
            webhook: false,
          },
        ],
      }),
    ]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    const emailChannel = { type: 'email', send: vi.fn().mockResolvedValue({ success: true }) };
    const slackChannel = { type: 'slack', send: vi.fn().mockResolvedValue({ success: true }) };
    const teamsChannel = { type: 'teams', send: vi.fn().mockResolvedValue({ success: true }) };

    channelRegistry.get.mockImplementation((type: string) => {
      if (type === 'email') return emailChannel;
      if (type === 'slack') return slackChannel;
      if (type === 'teams') return teamsChannel;
      return undefined;
    });
    getUserChannelConfig.mockResolvedValue({ config: { webhookUrl: 'https://hooks.example.com/x' } });

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    expect(emailChannel.send).toHaveBeenCalled();
    expect(slackChannel.send).toHaveBeenCalled();
    expect(teamsChannel.send).toHaveBeenCalled();
    expect(createDelivery).toHaveBeenCalledTimes(3);
  });

  it('continues after one channel fails (Promise.allSettled behavior)', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([
      makeMember({
        preferences: [
          {
            alertType: 'DOCUMENT_EXPIRING',
            enabled: true,
            email: true,
            slack: true,
            teams: false,
            telegram: false,
            webhook: false,
          },
        ],
      }),
    ]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    const emailChannel = {
      type: 'email',
      send: vi.fn().mockRejectedValue(new Error('SMTP down')),
    };
    const slackChannel = { type: 'slack', send: vi.fn().mockResolvedValue({ success: true }) };
    channelRegistry.get.mockImplementation((type: string) =>
      type === 'email' ? emailChannel : type === 'slack' ? slackChannel : undefined,
    );
    getUserChannelConfig.mockResolvedValue({ config: { webhookUrl: 'https://hooks.slack.com/x' } });

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    // Email failed, Slack succeeded
    expect(emailChannel.send).toHaveBeenCalled();
    expect(slackChannel.send).toHaveBeenCalled();
    expect(createDelivery).toHaveBeenCalledTimes(2);
    expect(createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ channelType: 'email', status: 'failed' }),
    );
    expect(createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ channelType: 'slack', status: 'sent' }),
    );
  });

  it('passes project name from getProjectById result', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([makeMember()]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'My Amazing Project' });

    const emailChannel = { type: 'email', send: vi.fn().mockResolvedValue({ success: true }) };
    channelRegistry.get.mockReturnValue(emailChannel);

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    expect(emailChannel.send).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      undefined,
      'My Amazing Project',
    );
  });

  it('falls back to "Unknown Project" when getProjectById returns null', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([makeMember()]);
    getProjectById.mockResolvedValue(null);

    const emailChannel = { type: 'email', send: vi.fn().mockResolvedValue({ success: true }) };
    channelRegistry.get.mockReturnValue(emailChannel);

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    expect(emailChannel.send).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      undefined,
      'Unknown Project',
    );
  });

  it('does not dispatch for disabled preferences', async () => {
    const deps = makeDeps();
    getMembersWithPreferences.mockResolvedValue([
      makeMember({
        preferences: [
          {
            alertType: 'DOCUMENT_EXPIRING',
            enabled: false, // Disabled!
            email: true,
            slack: false,
            teams: false,
            telegram: false,
            webhook: false,
          },
        ],
      }),
    ]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    const emailChannel = { type: 'email', send: vi.fn() };
    channelRegistry.get.mockReturnValue(emailChannel);

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert(), 'proj-1');

    expect(emailChannel.send).not.toHaveBeenCalled();
    expect(createDelivery).not.toHaveBeenCalled();
  });

  it('calls dedup check with correct parameters', async () => {
    const deps = makeDeps();
    const member = makeMember();
    getMembersWithPreferences.mockResolvedValue([member]);
    getProjectById.mockResolvedValue({ id: 'proj-1', name: 'Test Project' });

    const emailChannel = { type: 'email', send: vi.fn().mockResolvedValue({ success: true }) };
    channelRegistry.get.mockReturnValue(emailChannel);

    const dispatcher = new NotificationDispatcher(deps);
    await dispatcher.dispatch(makeAlert({ id: 'alert-42' }), 'proj-1');

    expect(existsDelivery).toHaveBeenCalledWith('alert-42', 'user-1', 'email');
  });
});

// ---------------------------------------------------------------------------
// Tests: dispatchForProject()
// ---------------------------------------------------------------------------

describe('NotificationDispatcher.dispatchForProject', () => {
  it('dispatches alerts fetched by getRecentAlerts', async () => {
    const deps = makeDeps();

    // Mock recent alerts
    const recentAlerts = [makeAlert(), makeAlert({ id: 'alert-2' })];
    getRecentAlerts.mockResolvedValue(recentAlerts);

    const dispatcher = new NotificationDispatcher(deps);

    // Spy on dispatch
    const dispatchSpy = vi.spyOn(dispatcher, 'dispatch').mockResolvedValue(undefined);

    await dispatcher.dispatchForProject('proj-1');

    expect(getRecentAlerts).toHaveBeenCalledWith('proj-1', 5);
    expect(dispatchSpy).toHaveBeenCalledTimes(2);
    expect(dispatchSpy).toHaveBeenCalledWith(recentAlerts[0], 'proj-1');
    expect(dispatchSpy).toHaveBeenCalledWith(recentAlerts[1], 'proj-1');
  });
});
