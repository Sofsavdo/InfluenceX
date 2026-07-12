import { Body, Controller, Headers, Logger, Post } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { PaymeProvider } from './payment-providers/payme.provider';
import { UzumProvider } from './payment-providers/uzum.provider';

/**
 * Payme/Uzum'dan keladigan server-to-server webhook'lar (hozircha STUB - InfluenceX'ning
 * bu ikkalasi bilan hali rasmiy hamkorligi yo'q, PaymeProvider/UzumProvider'dagi
 * verifyWebhookSignature() har doim `true` qaytaradi - PRODUKSIYAGA CHIQISHDAN OLDIN
 * to'liq amalga oshirilishi SHART).
 *
 * MUHIM: Click uchun bu controller ENDI ISHLATILMAYDI - Click'ning haqiqiy Shop-API
 * (Prepare/Complete) oqimi ClickWebhookController'da (click-webhook.controller.ts)
 * to'liq amalga oshirilgan, chunki Click'ning webhook formati (ikkita bosqich, boshqa
 * imzo formulasi) bu yerdagi soddalashtirilgan bitta-so'rovli patternga to'g'ri kelmaydi.
 */
@Controller('escrow/webhook')
export class EscrowWebhooksController {
  private readonly logger = new Logger(EscrowWebhooksController.name);

  constructor(
    private readonly escrowService: EscrowService,
    private readonly paymeProvider: PaymeProvider,
    private readonly uzumProvider: UzumProvider,
  ) {}

  @Post('payme')
  async payme(@Body() body: any, @Headers() headers: Record<string, string>) {
    if (!this.paymeProvider.verifyWebhookSignature(body, headers)) {
      this.logger.warn('Payme webhook imzosi noto\'g\'ri');
      return { error: 'invalid signature' };
    }
    return this.escrowService.confirmDeposit(body.providerReference);
  }

  @Post('uzum')
  async uzum(@Body() body: any, @Headers() headers: Record<string, string>) {
    if (!this.uzumProvider.verifyWebhookSignature(body, headers)) {
      this.logger.warn('Uzum webhook imzosi noto\'g\'ri');
      return { error: 'invalid signature' };
    }
    return this.escrowService.confirmDeposit(body.providerReference);
  }
}
