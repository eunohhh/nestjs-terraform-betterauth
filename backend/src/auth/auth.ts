import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { APIError, betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import pg from 'pg';
import { PrismaClient } from '../generated/prisma/client';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

const isEmailAllowed = (email: string | null | undefined): boolean => {
  if (!email) {
    return false;
  }
  const allowedEmails = process.env.ALLOWED_EMAILS;
  if (!allowedEmails) {
    return true; // 환경 변수 미설정 시 모든 이메일 허용
  }
  const emailList = allowedEmails.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  return emailList.includes(email.toLowerCase());
};

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  databaseHooks: {
    user: {
      create: {
        async before(user) {
          if (!isEmailAllowed(user.email)) {
            throw new APIError('FORBIDDEN', { message: 'unauthorized_email' });
          }
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: 'user',
        input: false, // Prevents users from setting their own role during signup
      },
    },
  },
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
    // defaultCookieAttributes: {
    //   secure: true, // Always true for HTTPS (ngrok)
    //   sameSite: 'lax',
    //   httpOnly: true,
    //   path: '/',
    // },
  },
  trustedOrigins: [
    process.env.BETTER_AUTH_URL,
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    process.env.APP_URL?.replace('/--', ''),
  ].filter((origin): origin is string => !!origin),
});

export type Session = typeof auth.$Infer.Session;
