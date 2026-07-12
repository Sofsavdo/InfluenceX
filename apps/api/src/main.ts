import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

// KRITIK TUZATISH (2026-07-11, production-tayyorlik tahlili): Prisma'da BigInt
// ishlatiladigan maydonlar bor (User.telegramId, ClickTransaction.clickTransId/
// clickPaydocId). Node.js'ning standart JSON.stringify() BigInt qiymatlarni
// serializatsiya QILA OLMAYDI va "TypeError: Do not know how to serialize a BigInt"
// xatosini tashlaydi - bu GET /users/me kabi ENG KO'P chaqiriladigan endpoint'ni
// har safar ishlab chiqarishda 500 xatosi bilan buzardi (hech qachon haqiqiy
// Node muhitida ishga tushirilmagani uchun bu xato hozirgacha aniqlanmagan edi).
// Yechim: BigInt.prototype.toJSON() global polyfill - butun ilova bo'ylab barcha
// javoblarga tarqaladi (raqamli aniqlik yo'qolmasligi uchun string'ga o'giradi).
(BigInt.prototype as any).toJSON = function (this: bigint) {
  return this.toString();
};

function resolveCorsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGIN;
  if (!raw || raw === '*') return true; // dev/standart: hammasi ruxsat
  return raw.split(',').map((o) => o.trim());
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: { origin: resolveCorsOrigins() } });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const port = process.env.API_PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`InfluenceX API http://localhost:${port}/api/v1`);
}
bootstrap();
