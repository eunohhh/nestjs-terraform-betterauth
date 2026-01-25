import { Module } from '@nestjs/common';

import { SittingController } from './sitting.controller';
import { SittingService } from './sitting.service';

@Module({
  controllers: [SittingController],
  providers: [SittingService],
  exports: [SittingService],
})
export class SittingModule {}
