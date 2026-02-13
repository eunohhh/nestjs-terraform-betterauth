import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // Required for Better Auth
  });

  app.use('/auth/app', json({ limit: '1mb' }));
  app.use('/graphql', json({ limit: '1mb' }));

  // GraphQL (Historian / Timeline prototype)
  const { yoga } = await import('./graphql/yoga.js');
  app.use('/graphql', yoga);

  // ALB 등 프록시 뒤에서 클라이언트 IP(X-Forwarded-For)를 올바르게 인식
  app.set('trust proxy', 1);

  const allowedOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => s.replace(/^<|>$/g, ''));

  app.enableCors({
    origin: (origin, callback) => {
      // allow server-to-server / curl / same-origin where Origin header may be missing
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalized = origin.trim();
      callback(null, allowedOrigins.includes(normalized));
    },
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
