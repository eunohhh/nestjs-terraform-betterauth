import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Required for Better Auth
  });

  app.enableCors({
    origin: [process.env.FRONTEND_URL, process.env.APP_URL].filter(Boolean),
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
