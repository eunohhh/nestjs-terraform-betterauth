import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@thallesp/nestjs-better-auth';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppAuthController } from './auth/app-auth.controller';
import { AppAuthService } from './auth/app-auth.service';
import { AppJwtGuard } from './auth/app-jwt.guard';
import { auth } from './auth/auth';
import { PrismaModule } from './prisma/prisma.module';
import { SittingModule } from './sitting/sitting.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule.forRoot({ auth }),
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 100 }],
    }),
    SittingModule,
  ],
  controllers: [AppController, AppAuthController],
  providers: [
    AppService,
    AppAuthService,
    AppJwtGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
