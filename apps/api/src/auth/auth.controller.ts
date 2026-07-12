import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TelegramAuthGuard } from './telegram-auth.guard';
import { AdminLoginDto } from './dto/admin-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Mini App ochilganda chaqiriladi. Body shart emas — TelegramAuthGuard
   * "X-Telegram-Init-Data" header'ini tekshiradi va req.telegramUser'ni to'ldiradi.
   */
  @UseGuards(TelegramAuthGuard)
  @Post('telegram')
  async loginWithTelegram(@Req() req: Request & { telegramUser: any }) {
    return this.authService.loginWithTelegram(req.telegramUser);
  }

  /**
   * Admin Panel (apps/admin) login — Moderator/Admin uchun email+parol.
   * PRD v2 §2: Moderator/Admin Mini App orqali emas, alohida veb Admin Panel orqali ishlaydi.
   * 2026-07-11 xavfsizlik kuchaytirilishi: global throttling'dan qattiqroq limit
   * (1 daqiqada 5 urinish) - parol qo'pol kuch (brute-force) hujumidan himoya.
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('admin/login')
  async loginAdmin(@Body() dto: AdminLoginDto) {
    return this.authService.loginAdmin(dto.email, dto.password);
  }
}
