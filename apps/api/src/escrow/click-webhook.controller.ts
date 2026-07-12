import { Body, Controller, Logger, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { EscrowService } from './escrow.service';
import { ClickWebhookDto } from './dto/click-webhook.dto';

/**
 * Click Shop-API webhook - HAQIQIY integratsiya (docs.click.uz/en/click-api-request/).
 * Click bitta URL'ga ikkala bosqichni ham yuboradi, "action" maydoni orqali ajratiladi:
 *   action=0 -> Prepare, action=1 -> Complete
 *
 * Ro'yxatdan o'tkazish: Click hamkorlik shartnomasi doirasida ushbu URL ularga
 * "Callback URL" sifatida taqdim etiladi (odatda Click qo'llab-quvvatlash jamoasi orqali,
 * o'zi setWebhook kabi ochiq API'ga ega emas - Telegram botidan farqli).
 *
 * Bu endpoint TelegramAuthGuard/JwtAuthGuard bilan HIMOYALANMAYDI - Click serverlari
 * bizning tizimimizga Telegram foydalanuvchisi sifatida kira olmaydi. Xavfsizlik butunlay
 * sign_string (MD5) tekshiruvi + sign_time yangilik tekshiruviga (replay himoyasi,
 * 2026-07-11) asoslanadi (escrow.service.ts handleClickPrepare/Complete).
 *
 * Throttling: global standart (100/daqiqa)dan yuqoriroq limit beriladi - bir vaqtda
 * ko'p tranzaksiya bo'lganda Click'ning haqiqiy Prepare/Complete so'rovlari global
 * limitga tegib, TO'LOV TASDIQLANMASLIGIGA olib kelishi mumkin edi.
 */
@Throttle({ default: { limit: 300, ttl: 60000 } })
@Controller('escrow/webhook/click')
export class ClickWebhookController {
  private readonly logger = new Logger(ClickWebhookController.name);

  constructor(private readonly escrowService: EscrowService) {}

  @Post()
  async handle(@Body() dto: ClickWebhookDto) {
    this.logger.debug(`Click webhook: action=${dto.action} merchant_trans_id=${dto.merchant_trans_id}`);

    if (dto.action === '0') {
      return this.escrowService.handleClickPrepare(dto);
    }
    if (dto.action === '1') {
      return this.escrowService.handleClickComplete(dto);
    }

    return {
      click_trans_id: dto.click_trans_id,
      merchant_trans_id: dto.merchant_trans_id,
      error: -3,
      error_note: 'Action not found',
    };
  }
}
