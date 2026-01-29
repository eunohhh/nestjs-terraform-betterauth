import { Injectable, Logger } from '@nestjs/common';
import Expo, { ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';

export type NotificationSettings = {
  enabled: boolean;
  morningAlertHour: number;
  beforeMinutes: number;
};

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  morningAlertHour: 8,
  beforeMinutes: 30,
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private expo: Expo;

  constructor(private readonly prisma: PrismaService) {
    this.expo = new Expo();
  }

  async registerPushToken(userId: string, pushToken: string): Promise<void> {
    if (!Expo.isExpoPushToken(pushToken)) {
      throw new Error('Invalid Expo push token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pushToken,
        pushTokenUpdatedAt: new Date(),
      },
    });

    this.logger.log(`Push token registered for user ${userId}`);
  }

  async removePushToken(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pushToken: null,
        pushTokenUpdatedAt: null,
      },
    });

    this.logger.log(`Push token removed for user ${userId}`);
  }

  async getNotificationSettings(userId: string): Promise<NotificationSettings> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { notificationSettings: true },
    });

    if (!user?.notificationSettings) {
      return DEFAULT_SETTINGS;
    }

    const settings = user.notificationSettings as Record<string, unknown>;
    return {
      enabled: typeof settings.enabled === 'boolean' ? settings.enabled : DEFAULT_SETTINGS.enabled,
      morningAlertHour:
        typeof settings.morningAlertHour === 'number'
          ? settings.morningAlertHour
          : DEFAULT_SETTINGS.morningAlertHour,
      beforeMinutes:
        typeof settings.beforeMinutes === 'number'
          ? settings.beforeMinutes
          : DEFAULT_SETTINGS.beforeMinutes,
    };
  }

  async updateNotificationSettings(
    userId: string,
    dto: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettings> {
    const currentSettings = await this.getNotificationSettings(userId);

    const newSettings: NotificationSettings = {
      enabled: dto.enabled ?? currentSettings.enabled,
      morningAlertHour: dto.morningAlertHour ?? currentSettings.morningAlertHour,
      beforeMinutes: dto.beforeMinutes ?? currentSettings.beforeMinutes,
    };

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        notificationSettings: newSettings,
      },
    });

    this.logger.log(`Notification settings updated for user ${userId}`);
    return newSettings;
  }

  async sendPushNotification(
    pushToken: string,
    title: string,
    body: string,
    data?: Record<string, unknown>,
  ): Promise<ExpoPushTicket | null> {
    if (!Expo.isExpoPushToken(pushToken)) {
      this.logger.warn(`Invalid push token: ${pushToken}`);
      return null;
    }

    const message: ExpoPushMessage = {
      to: pushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    try {
      const tickets = await this.expo.sendPushNotificationsAsync([message]);
      const ticket = tickets[0];

      if (ticket.status === 'error') {
        this.logger.error(`Push notification error: ${ticket.message}`);
        if (ticket.details?.error === 'DeviceNotRegistered') {
          this.logger.warn('Device not registered, token may need to be removed');
        }
      }

      return ticket;
    } catch (error) {
      this.logger.error('Failed to send push notification', error);
      return null;
    }
  }

  async sendPushNotifications(
    messages: Array<{ pushToken: string; title: string; body: string; data?: Record<string, unknown> }>,
  ): Promise<ExpoPushTicket[]> {
    const validMessages: ExpoPushMessage[] = messages
      .filter((m) => Expo.isExpoPushToken(m.pushToken))
      .map((m) => ({
        to: m.pushToken,
        sound: 'default' as const,
        title: m.title,
        body: m.body,
        data: m.data,
      }));

    if (validMessages.length === 0) {
      return [];
    }

    const chunks = this.expo.chunkPushNotifications(validMessages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        this.logger.error('Failed to send push notification chunk', error);
      }
    }

    return tickets;
  }

  async getUsersWithPushToken(): Promise<
    Array<{
      id: string;
      pushToken: string;
      notificationSettings: NotificationSettings;
    }>
  > {
    const users = await this.prisma.user.findMany({
      where: {
        pushToken: { not: null },
      },
      select: {
        id: true,
        pushToken: true,
        notificationSettings: true,
      },
    });

    return users
      .filter((u) => u.pushToken !== null)
      .map((u) => ({
        id: u.id,
        pushToken: u.pushToken!,
        notificationSettings: this.parseSettings(u.notificationSettings),
      }));
  }

  private parseSettings(settings: unknown): NotificationSettings {
    if (!settings || typeof settings !== 'object') {
      return DEFAULT_SETTINGS;
    }

    const s = settings as Record<string, unknown>;
    return {
      enabled: typeof s.enabled === 'boolean' ? s.enabled : DEFAULT_SETTINGS.enabled,
      morningAlertHour:
        typeof s.morningAlertHour === 'number' ? s.morningAlertHour : DEFAULT_SETTINGS.morningAlertHour,
      beforeMinutes:
        typeof s.beforeMinutes === 'number' ? s.beforeMinutes : DEFAULT_SETTINGS.beforeMinutes,
    };
  }
}
