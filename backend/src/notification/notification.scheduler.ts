import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationScheduler {
  private readonly logger = new Logger(NotificationScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * 오전 알림 - 매 정시 실행
   * 사용자별 morningAlertHour를 확인하여 해당 시간에 오늘의 케어 요약 전송
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendMorningAlerts(): Promise<void> {
    const now = new Date();
    // KST = UTC + 9
    const kstHour = (now.getUTCHours() + 9) % 24;

    this.logger.log(`Checking morning alerts for KST hour: ${kstHour}`);

    const users = await this.notificationService.getUsersWithPushToken();

    for (const user of users) {
      if (!user.notificationSettings.enabled) {
        continue;
      }

      if (user.notificationSettings.morningAlertHour !== kstHour) {
        continue;
      }

      try {
        await this.sendMorningAlertToUser(user.id, user.pushToken);
      } catch (error) {
        this.logger.error(`Failed to send morning alert to user ${user.id}`, error);
      }
    }
  }

  private async sendMorningAlertToUser(userId: string, pushToken: string): Promise<void> {
    // 오늘 하루의 미완료 케어 개수 조회 (KST 기준)
    const now = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;

    // KST 오늘 시작 (00:00:00)
    const kstNow = new Date(now.getTime() + kstOffset);
    const kstTodayStart = new Date(kstNow);
    kstTodayStart.setUTCHours(0, 0, 0, 0);

    // KST 오늘 끝 (23:59:59)
    const kstTodayEnd = new Date(kstNow);
    kstTodayEnd.setUTCHours(23, 59, 59, 999);

    // UTC로 변환
    const utcTodayStart = new Date(kstTodayStart.getTime() - kstOffset);
    const utcTodayEnd = new Date(kstTodayEnd.getTime() - kstOffset);

    const incompleteCares = await this.prisma.sittingCare.count({
      where: {
        careTime: {
          gte: utcTodayStart,
          lte: utcTodayEnd,
        },
        completedAt: null,
        booking: {
          client: { userId },
        },
      },
    });

    if (incompleteCares === 0) {
      this.logger.log(`No cares for user ${userId} today, skipping morning alert`);
      return;
    }

    await this.notificationService.sendPushNotification(
      pushToken,
      '오늘의 케어 일정',
      `오늘 ${incompleteCares}개의 케어가 예정되어 있습니다.`,
      { type: 'morning_summary', careCount: incompleteCares },
    );

    this.logger.log(`Sent morning alert to user ${userId}: ${incompleteCares} cares`);
  }

  /**
   * 케어 사전 알림 - 매 분 실행
   * 사용자별 beforeMinutes 후에 예정된 미완료 케어에 대해 알림 전송
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async sendCareReminders(): Promise<void> {
    const now = new Date();
    this.logger.debug(`Checking care reminders at ${now.toISOString()}`);

    const users = await this.notificationService.getUsersWithPushToken();

    for (const user of users) {
      if (!user.notificationSettings.enabled) {
        continue;
      }

      try {
        await this.sendCareRemindersToUser(
          user.id,
          user.pushToken,
          user.notificationSettings.beforeMinutes,
        );
      } catch (error) {
        this.logger.error(`Failed to send care reminders to user ${user.id}`, error);
      }
    }
  }

  private async sendCareRemindersToUser(
    userId: string,
    pushToken: string,
    beforeMinutes: number,
  ): Promise<void> {
    const now = new Date();
    // beforeMinutes 후의 시간 (±30초 윈도우)
    const targetTime = new Date(now.getTime() + beforeMinutes * 60 * 1000);
    const windowStart = new Date(targetTime.getTime() - 30 * 1000);
    const windowEnd = new Date(targetTime.getTime() + 30 * 1000);

    const upcomingCares = await this.prisma.sittingCare.findMany({
      where: {
        careTime: {
          gte: windowStart,
          lte: windowEnd,
        },
        completedAt: null,
        booking: {
          client: { userId },
        },
      },
      include: {
        booking: {
          select: {
            catName: true,
            client: {
              select: {
                clientName: true,
              },
            },
          },
        },
      },
    });

    for (const care of upcomingCares) {
      const catName = care.booking.catName;
      const clientName = care.booking.client.clientName;

      await this.notificationService.sendPushNotification(
        pushToken,
        `${beforeMinutes}분 후 케어 예정`,
        `${clientName} - ${catName}`,
        { type: 'care_reminder', careId: care.id, bookingId: care.bookingId },
      );

      this.logger.log(`Sent care reminder for care ${care.id} to user ${userId}`);
    }
  }
}
