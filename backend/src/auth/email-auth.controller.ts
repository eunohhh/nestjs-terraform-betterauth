import { BadRequestException, Body, Controller, Post, Req } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { fromNodeHeaders } from 'better-auth/node';
import type { Request } from 'express';
import { AppAuthService } from './app-auth.service';
import { auth } from './auth';

/**
 * App 배포 이후 경로 호환성 목적.
 *
 * Better Auth의 기본 basePath(/api/auth)와 별개로,
 * 앱에서 바로 호출 가능한 루트 경로를 노출한다.
 */
@Controller()
export class EmailAuthController {
  constructor(private readonly appAuthService: AppAuthService) {}
  @Post('/sign-up/email')
  @AllowAnonymous()
  async signUpEmail(
    @Req() request: Request,
    @Body() body: { name?: unknown; email?: unknown; password?: unknown },
  ) {
    const name = body?.name;
    const email = body?.email;
    const password = body?.password;

    if (typeof name !== 'string' || name.length === 0) {
      throw new BadRequestException('name is required');
    }
    if (typeof email !== 'string' || email.length === 0) {
      throw new BadRequestException('email is required');
    }
    if (typeof password !== 'string' || password.length === 0) {
      throw new BadRequestException('password is required');
    }

    const result = await auth.api.signUpEmail({
      headers: fromNodeHeaders(request.headers),
      body: { name, email, password },
    });

    // 앱은 Better Auth 세션 쿠키(token)가 아니라 App JWT(accessToken)를 사용
    const userId = (result as any)?.user?.id as string | undefined;
    if (!userId) {
      throw new BadRequestException('Failed to create user');
    }

    return this.appAuthService.createAccessToken(userId);
  }

  @Post('/sign-in/email')
  @AllowAnonymous()
  async signInEmail(
    @Req() request: Request,
    @Body() body: { email?: unknown; password?: unknown },
  ) {
    const email = body?.email;
    const password = body?.password;

    if (typeof email !== 'string' || email.length === 0) {
      throw new BadRequestException('email is required');
    }
    if (typeof password !== 'string' || password.length === 0) {
      throw new BadRequestException('password is required');
    }

    const result = await auth.api.signInEmail({
      headers: fromNodeHeaders(request.headers),
      body: { email, password },
    });

    const userId = (result as any)?.user?.id as string | undefined;
    if (!userId) {
      throw new BadRequestException('Invalid credentials');
    }

    return this.appAuthService.createAccessToken(userId);
  }
}
