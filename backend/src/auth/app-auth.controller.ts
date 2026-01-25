import {
  BadRequestException,
  Controller,
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
    const headers = this.toHeaders(request);
    const session = await auth.api.getSession({ headers });

    if (!session || !('user' in session) || !session.user?.id) {
      return response.redirect(this.buildDeepLink({ error: 'not_logged_in' }));
    }

    const { code, expiresAt } = await this.appAuthService.createLoginCode(session.user.id);

    return response.redirect(this.buildDeepLink({ code, expiresAt: expiresAt.toISOString() }));
  }

  @Get('login/google')
  @AllowAnonymous()
  async loginGoogle(@Req() request: Request, @Res() response: Response) {
    const baseUrl = this.getBaseUrl(request);
    const callbackURL = `${baseUrl}/auth/app/callback`;
    const signInUrl = `${baseUrl}/api/auth/sign-in/social`;

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Signing in...</title>
  </head>
  <body>
    <p>Signing in…</p>
    <script>
      (function () {
        fetch(${JSON.stringify(signInUrl)}, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            provider: 'google',
            callbackURL: ${JSON.stringify(callbackURL)}
          })
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (data && data.url) {
              window.location.href = data.url;
              return;
            }
            document.body.innerText = 'Failed to start login.';
          })
          .catch(function () {
            document.body.innerText = 'Failed to start login.';
          });
      })();
    </script>
  </body>
</html>`;

    return response.status(200).type('text/html').send(html);
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

  private getBaseUrl(request: Request) {
    if (process.env.BETTER_AUTH_URL) {
      return process.env.BETTER_AUTH_URL;
    }
    const protocol =
      (request.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0] ||
      request.protocol;
    return `${protocol}://${request.get('host')}`;
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
}
