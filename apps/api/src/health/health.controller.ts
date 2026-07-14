import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Railway sog'liqni tekshirish (health check) endpoint'i (2026-07-14 qo'shildi).
// Faqat DB ulanishini yengil tekshiradi (SELECT 1) - hech qanday sirni (DATABASE_URL,
// tokenlar) javobda chiqarmaydi. Migratsiya muvaffaqiyatli qo'llanganidan keyin
// production'da GET /api/v1/health orqali tashqi tomondan tasdiqlash uchun ishlatiladi.
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new HttpException(
        {
          status: 'error',
          database: 'disconnected',
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
