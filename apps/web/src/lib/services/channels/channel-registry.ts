import type { NotificationChannel } from './types';

export class ChannelRegistry {
  private channels = new Map<string, NotificationChannel>();

  register(channel: NotificationChannel): void {
    this.channels.set(channel.type, channel);
  }

  get(type: string): NotificationChannel | undefined {
    return this.channels.get(type);
  }

  list(): string[] {
    return Array.from(this.channels.keys());
  }
}
