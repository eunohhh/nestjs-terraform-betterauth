import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify, SignJWT } from 'jose';
import { PrismaService } from '../prisma/prisma.service';

const APP_JWT_ISSUER = 'family-infra-backend';
const APP_JWT_AUDIENCE = 'app';
const DEFAULT_APP_JWT_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7; // 7 days
const APP_LOGIN_CODE_TTL_SECONDS = 60 * 2;

@Injectable()
export class AppAuthService {
  private readonly expiresInSeconds: number;

  constructor(private readonly prisma: PrismaService) {
    const configuredExpiresIn = Number(DEFAULT_APP_JWT_EXPIRES_IN_SECONDS);
    this.expiresInSeconds = configuredExpiresIn;
  }

  async exchangeCode(code: string) {
    if (!code) {
      throw new BadRequestException('code is required');
    }

    const now = new Date();
    const record = await this.prisma.appLoginCode.findUnique({
      where: { code },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt <= now) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    const updated = await this.prisma.appLoginCode.updateMany({
      where: { code, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });

    if (updated.count !== 1) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    const accessToken = await this.signToken(record.userId);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresInSeconds,
      user: {
        id: record.user.id,
        name: record.user.name,
        email: record.user.email,
        image: record.user.image,
      },
    };
  }

  async createAccessToken(userId: string) {
    const user = await this.getUser(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const accessToken = await this.signToken(userId);
    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresInSeconds,
      user,
    };
  }

  async createLoginCode(userId: string) {
    const code = randomUUID();
    const expiresAt = new Date(Date.now() + APP_LOGIN_CODE_TTL_SECONDS * 1000);

    await this.prisma.appLoginCode.create({
      data: {
        code,
        userId,
        expiresAt,
      },
    });

    return { code, expiresAt };
  }

  async reviewLogin(email: string, password: string) {
    const reviewCredentials = this.getReviewCredentials();
    if (!reviewCredentials) {
      throw new UnauthorizedException('Review login is not enabled');
    }

    if (email !== reviewCredentials.email || password !== reviewCredentials.password) {
      throw new UnauthorizedException('Invalid review credentials');
    }

    // 리뷰 사용자 조회 또는 생성 (외부 OAuth 없이 앱 심사용)
    let user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, image: true, role: true },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name: 'App Store Reviewer',
          emailVerified: true,
          role: 'user',
        },
        select: { id: true, name: true, email: true, image: true, role: true },
      });
    }

    const accessToken = await this.signToken(user.id);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.expiresInSeconds,
      user,
    };
  }

  private getReviewCredentials(): { email: string; password: string } | null {
    const allowReviewLogin = process.env.ALLOW_REVIEW_LOGIN;
    if (!allowReviewLogin || allowReviewLogin === 'false') {
      return null;
    }

    // 형식: email,password
    const parts = allowReviewLogin.split(',');
    if (parts.length < 2) {
      return null;
    }

    const email = parts[0].trim();
    const password = parts.slice(1).join(',').trim(); // 비밀번호에 콤마가 있을 수 있음

    if (!email || !password) {
      return null;
    }

    return { email, password };
  }

  async verifyToken(token: string): Promise<string> {
    try {
      const secret = this.getJwtSecret();
      const { payload } = await jwtVerify(token, secret, {
        issuer: APP_JWT_ISSUER,
        audience: APP_JWT_AUDIENCE,
      });
      if (!payload.sub) {
        throw new UnauthorizedException('Invalid token');
      }
      return payload.sub;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async getUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true, role: true },
    });
  }

  private async signToken(userId: string): Promise<string> {
    const secret = this.getJwtSecret();
    const nowSeconds = Math.floor(Date.now() / 1000);

    return new SignJWT({ typ: 'app' })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuer(APP_JWT_ISSUER)
      .setAudience(APP_JWT_AUDIENCE)
      .setIssuedAt(nowSeconds)
      .setExpirationTime(nowSeconds + this.expiresInSeconds)
      .sign(secret);
  }

  private getJwtSecret(): Uint8Array {
    const secret = process.env.APP_JWT_SECRET;
    if (!secret) {
      throw new Error('APP_JWT_SECRET is required');
    }
    return new TextEncoder().encode(secret);
  }
}
