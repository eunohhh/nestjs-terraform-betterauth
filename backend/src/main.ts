import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Required for Better Auth
  });

  // ALB 등 프록시 뒤에서 클라이언트 IP(X-Forwarded-For)를 올바르게 인식
  app.set('trust proxy', 1);

  app.enableCors({
    origin: [process.env.FRONTEND_URL, process.env.APP_URL].filter(Boolean),
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
