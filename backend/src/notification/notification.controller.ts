import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { AppJwtGuard } from '../auth/app-jwt.guard';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { NotificationService } from './notification.service';

@Controller('/notifications')
@UseGuards(AppJwtGuard)
@AllowAnonymous()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('/push-token')
  async registerPushToken(@Req() req: any, @Body() dto: RegisterPushTokenDto) {
    const userId = req.appUserId;
    await this.notificationService.registerPushToken(userId, dto.pushToken);
    return { success: true };
  }

  @Post('/push-token/remove')
  async removePushToken(@Req() req: any) {
    const userId = req.appUserId;
    await this.notificationService.removePushToken(userId);
    return { success: true };
  }

  @Get('/settings')
  async getSettings(@Req() req: any) {
    const userId = req.appUserId;
    return this.notificationService.getNotificationSettings(userId);
  }

  @Patch('/settings')
  async updateSettings(@Req() req: any, @Body() dto: UpdateNotificationSettingsDto) {
    const userId = req.appUserId;
    return this.notificationService.updateNotificationSettings(userId, dto);
  }
}
