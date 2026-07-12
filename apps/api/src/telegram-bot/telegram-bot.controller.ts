import { Body, Controller, Headers, Logger, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramBotService } from './telegram-bot.service';

/**
 * Telegram webhook endpoint. Ishga tushirishda quyidagi buyruq bilan ro'yxatdan o'tkaziladi:
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=<API_URL>/api/v1/telegram-bot/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
 * Telegram har bir so'rovda "X-Telegram-Bot-Api-Secret-Token" header'ini yuboradi - shu orqali
 * so'rov haqiqatan Telegramdan kelganini tekshiramiz (TelegramAuthGuard bu yerga mos emas,
 * chunki bu so'rov foydalanuvchi emas, Telegram serverlaridan keladi).
 */
@Controller('telegram-bot')
export class TelegramBotController {
  private readonly logger = new Logger(TelegramBotController.name);

  constructor(
    private readonly botService: TelegramBotService,
    private readonly config: ConfigService,
  ) {}

  @Post('webhook')
  async webhook(@Body() update: any, @Headers('x-telegram-bot-api-secret-token') secretHeader?: string) {
    const expectedSecret = this.config.get<string>('TELEGRAM_WEBHOOK_SECRET');
    if (expectedSecret && secretHeader !== expectedSecret) {
      throw new UnauthorizedException('Noto\'g\'ri webhook secret token');
    }

    const message = update?.message;
    if (typeof message?.text === 'string' && message.text.startsWith('/start')) {
      // CPA atributsiya - Telegram deep-link (2026-07-12): t.me/<bot>?start=ref_<referralCode>
      // formatida kelgan payload'ni "/start ref_<kod>" ko'rinishida qabul qilamiz.
      const parts = message.text.trim().split(/\s+/);
      const payload = parts[1];
      if (payload && payload.startsWith('ref_')) {
        await this.botService.handleReferralStart(message.chat.id, payload.slice('ref_'.length));
      } else {
        await this.botService.handleStartCommand(message.chat.id);
      }
    }

    return { ok: true };
  }
}
