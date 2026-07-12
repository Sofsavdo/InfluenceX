import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

(BigInt.prototype as any).toJSON = function (this: bigint) {
  return this.toString();
};

function resolveCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN;

  if (!raw || raw === '*') {
    return true;
  }

  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: resolveCorsOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Telegram-Init-Data',
      ],
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3000);

  await app.listen(port, '0.0.0.0');

  // eslint-disable-next-line no-console
  console.log(`InfluenceX API listening on 0.0.0.0:${port}/api/v1`);
}

bootstrap();
