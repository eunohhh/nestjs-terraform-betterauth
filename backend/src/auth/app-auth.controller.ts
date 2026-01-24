import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { AppAuthService } from './app-auth.service';
import { AppJwtGuard } from './app-jwt.guard';
import { auth } from './auth';

type AppAuthRequest = Request & { appUserId?: string };

@Controller('auth/app')
export class AppAuthController {
  constructor(private readonly appAuthService: AppAuthService) {}

  @Post('token')
  @AllowAnonymous()
  async exchangeCode(@Req() request: Request) {
    const body = request.body as { code?: unknown } | undefined;
    const code = body?.code;

    if (typeof code !== 'string' || code.length === 0) {
      throw new BadRequestException('code is required');
    }

    return this.appAuthService.exchangeCode(code);
  }

  @Post('code')
  @AllowAnonymous()
  async createCode(@Req() request: Request) {
    const headers = this.toHeaders(request);
    const session = await auth.api.getSession({ headers });

    if (!session || !('user' in session) || !session.user?.id) {
      throw new UnauthorizedException('Not logged in');
    }

    return this.appAuthService.createLoginCode(session.user.id);
  }

  @Get('me')
  @UseGuards(AppJwtGuard)
  async me(@Req() request: AppAuthRequest) {
    if (!request.appUserId) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.appAuthService.getUser(request.appUserId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  private toHeaders(request: Request): Headers {
    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        headers.set(key, value.join(','));
      }
    }
    return headers;
  }
}
