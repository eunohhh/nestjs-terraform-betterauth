import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import pg from 'pg';
import { PrismaClient } from '../generated/prisma/client';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      prompt: 'select_account',
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7일
    updateAge: 60 * 60 * 24, // 1일마다 갱신
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 12, // 12시간마다 갱신
    },
  },
  advanced: {
    database: {
      // 모든 테이블의 ID를 UUID v4로 생성
      generateId: () => crypto.randomUUID(),
    },
    defaultCookieAttributes: {
      secure: process.env.NODE_ENV === 'production',
      domain:
        process.env.NODE_ENV === 'production'
          ? `.${new URL(process.env.FRONTEND_URL ?? '').hostname.replace('api.', '')}`
          : undefined,
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.FRONTEND_URL,
    process.env.APP_URL,
  ].filter((origin): origin is string => !!origin),
});

export type Session = typeof auth.$Infer.Session;
