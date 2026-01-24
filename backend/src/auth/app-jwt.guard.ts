import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AppAuthService } from './app-auth.service';

@Injectable()
export class AppJwtGuard implements CanActivate {
  constructor(private readonly appAuthService: AppAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const header = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing token');
    }

    const token = header.slice('Bearer '.length).trim();
    const userId = await this.appAuthService.verifyToken(token);
    (request as Request & { appUserId: string }).appUserId = userId;
    return true;
  }
}
