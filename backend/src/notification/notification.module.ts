import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppAuthService } from '../auth/app-auth.service';
import { AppJwtGuard } from '../auth/app-jwt.guard';
import { NotificationController } from './notification.controller';
import { NotificationScheduler } from './notification.scheduler';
import { NotificationService } from './notification.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationScheduler, AppJwtGuard, AppAuthService],
  exports: [NotificationService],
})
export class NotificationModule {}
