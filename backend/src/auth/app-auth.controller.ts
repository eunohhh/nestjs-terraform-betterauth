import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
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

  @Post('review')
  @AllowAnonymous()
  async reviewLogin(@Req() request: Request) {
    const body = request.body as { email?: unknown; password?: unknown } | undefined;
    const email = body?.email;
    const password = body?.password;

    if (typeof email !== 'string' || email.length === 0) {
      throw new BadRequestException('email is required');
    }
    if (typeof password !== 'string' || password.length === 0) {
      throw new BadRequestException('password is required');
    }

    return this.appAuthService.reviewLogin(email, password);
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

  @Post('admin/token')
  async getAdminToken(@Req() request: Request) {
    const headers = this.toHeaders(request);
    const session = await auth.api.getSession({ headers });

    if (!session || !('user' in session) || !session.user?.id) {
      throw new UnauthorizedException('Not logged in');
    }

    return this.appAuthService.createAccessToken(session.user.id);
  }

  @Get('callback')
  @AllowAnonymous()
  async callback(@Req() request: Request, @Res() response: Response) {
    // Better Auth 에러 리다이렉트 처리
    const error = request.query.error;
    if (typeof error === 'string') {
      return response.redirect(this.buildDeepLink({ error }));
    }

    const headers = this.toHeaders(request);
    const session = await auth.api.getSession({ headers });

    if (!session || !('user' in session) || !session.user?.id) {
      return response.redirect(this.buildDeepLink({ error: 'not_logged_in' }));
    }

    if (!this.isEmailAllowed(session.user.email)) {
      return response.redirect(this.buildDeepLink({ error: 'unauthorized_email' }));
    }

    const { code, expiresAt } = await this.appAuthService.createLoginCode(session.user.id);

    return response.redirect(this.buildDeepLink({ code, expiresAt: expiresAt.toISOString() }));
  }

  @Get('login/google')
  @AllowAnonymous()
  async loginGoogle(@Req() request: Request, @Res() response: Response) {
    return this.startSocialLogin(request, response, 'google');
  }

  @Get('login/apple')
  @AllowAnonymous()
  async loginApple(@Req() request: Request, @Res() response: Response) {
    return this.startSocialLogin(request, response, 'apple');
  }

  @Get('me')
  @AllowAnonymous()
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

  /**
   * App Store 심사 대응: 계정(및 사용자 데이터) 영구 삭제
   *
   * - 토큰 인증 필요
   * - 프론트에서 별도 확인(재확인 팝업 등) 후 호출하는 것을 권장
   */
  @Delete('me')
  @AllowAnonymous()
  @UseGuards(AppJwtGuard)
  async deleteMe(@Req() request: AppAuthRequest) {
    if (!request.appUserId) {
      throw new UnauthorizedException('Invalid token');
    }

    await this.appAuthService.deleteAccount(request.appUserId);
    return { ok: true };
  }

  private getBaseUrl(request: Request) {
    if (process.env.BETTER_AUTH_URL) {
      return process.env.BETTER_AUTH_URL;
    }
    const protocol =
      (request.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ||
      request.protocol;
    return `${protocol}://${request.get('host')}`;
  }

  /**
   * Mobile OAuth 안정성 개선:
   * - 기존에는 `/auth/app/login/*`에서 HTML + fetch(POST)로 `/api/auth/sign-in/social`을 호출했는데,
   *   iOS(ASWebAuthenticationSession 계열)에서 XHR 응답의 Set-Cookie가 저장되지 않아
   *   `/api/auth/callback/*`에서 state_mismatch가 발생할 수 있음.
   * - 서버에서 직접 `/api/auth/sign-in/social`을 호출하고 Set-Cookie를 그대로 전달한 뒤
   *   provider authorize URL로 302 redirect 한다.
   */
  private async startSocialLogin(
    request: Request,
    response: Response,
    provider: 'google' | 'apple',
  ) {
    const baseUrl = this.getBaseUrl(request);
    const callbackURL = `${baseUrl}/auth/app/callback`;
    const signInUrl = `${baseUrl}/api/auth/sign-in/social`;

    const upstream = await fetch(signInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Note: This request is server-to-server. Cookies are returned in Set-Cookie headers.
      body: JSON.stringify({
        provider,
        callbackURL,
        errorCallbackURL: callbackURL,
      }),
    });

    // Forward Set-Cookie headers so the browser session has oauth_state before redirect.
    const setCookies: string[] =
      // undici / Node fetch supports getSetCookie()
      ((upstream.headers as any).getSetCookie?.() as string[] | undefined) ??
      (upstream.headers.get('set-cookie') ? [upstream.headers.get('set-cookie') as string] : []);

    for (const cookie of setCookies) {
      // Nest/Express supports multiple Set-Cookie via append
      response.append('Set-Cookie', cookie);
    }

    // Prefer Location header if upstream decided to redirect.
    const location = upstream.headers.get('location');
    if (location) {
      return response.redirect(location);
    }

    const data = (await upstream.json().catch(() => null)) as { url?: unknown } | null;
    const url = data?.url;
    if (typeof url !== 'string' || url.length === 0) {
      throw new InternalServerErrorException('Failed to start social login');
    }

    return response.redirect(url);
  }

  private buildDeepLink(params: Record<string, string>) {
    const base = process.env.APP_URL;
    if (!base) {
      throw new InternalServerErrorException('APP_URL is not set');
    }
    const baseUrl = new URL(base);
    const basePath = baseUrl.pathname === '/' ? '' : baseUrl.pathname.replace(/\/$/, '');
    baseUrl.pathname = `${basePath}/auth/callback`;
    try {
      for (const [key, value] of Object.entries(params)) {
        baseUrl.searchParams.set(key, value);
      }
      return baseUrl.toString();
    } catch {
      const search = new URLSearchParams(params).toString();
      return search.length > 0 ? `${baseUrl.toString()}?${search}` : baseUrl.toString();
    }
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

  private isEmailAllowed(email: string | undefined): boolean {
    if (!email) {
      return false;
    }
    const allowedEmails = process.env.ALLOWED_EMAILS;
    // IMPORTANT: treat empty string as "not set" to avoid blocking everyone.
    if (!allowedEmails || allowedEmails.trim().length === 0) {
      return true; // 환경 변수 미설정(또는 빈 값) 시 모든 이메일 허용
    }
    const emailList = allowedEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return emailList.includes(email.toLowerCase());
  }
}
