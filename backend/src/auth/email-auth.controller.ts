import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
} from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './auth';

/**
 * App 배포 이후 경로 호환성 목적.
 *
 * Better Auth의 기본 basePath(/api/auth)와 별개로,
 * 앱에서 바로 호출 가능한 루트 경로를 노출한다.
 */
@Controller()
export class EmailAuthController {
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

    return auth.api.signUpEmail({
      headers: fromNodeHeaders(request.headers),
      body: { name, email, password },
    });
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

    return auth.api.signInEmail({
      headers: fromNodeHeaders(request.headers),
      body: { email, password },
    });
  }
}
