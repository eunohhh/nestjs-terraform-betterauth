import { Module } from '@nestjs/common';

import { AppAuthService } from '../auth/app-auth.service';
import { AppJwtGuard } from '../auth/app-jwt.guard';
import { SittingController } from './sitting.controller';
import { SittingService } from './sitting.service';

@Module({
  controllers: [SittingController],
  providers: [SittingService, AppJwtGuard, AppAuthService],
  exports: [SittingService],
})
export class SittingModule {}
