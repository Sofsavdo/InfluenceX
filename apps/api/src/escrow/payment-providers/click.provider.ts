import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import {
  CreateDepositInvoiceParams,
  DepositInvoiceResult,
  PaymentProviderAdapter,
  PayoutParams,
  PayoutResult,
} from './payment-provider.interface';

/**
 * Click.uz Merchant/Shop API - HAQIQIY integratsiya (rasmiy hujjat asosida:
 * https://docs.click.uz/en/click-api-request/ va https://docs.click.uz/en/merchant-api-request/).
 *
 * InfluenceX'ning Click bilan hamkorligi mavjud (2026-07-11), shuning uchun bu provayder
 * boshqa ikkitasi (Payme/Uzum, hali stub)dan farqli — to'liq ishlaydigan holatda.
 *
 * Ikki oqim ishlatiladi:
 * 1) DEPOSIT (Biznes -> InfluenceX): "Click orqali to'lov" havolasi (my.click.uz/services/pay)
 *    orqali - foydalanuvchi Click sahifasida to'laydi, so'ng Click bizning serverimizga
 *    Prepare (action=0) va Complete (action=1) so'rovlarini yuboradi (ClickWebhookController).
 * 2) PAYOUT (InfluenceX -> Creator): Click Merchant API'da kartaga chiqim (payout) uchun
 *    RASMIY HUJJATLASHTIRILGAN endpoint YO'Q (faqat kirim/to'lov qabul qilish qo'llab-quvvatlanadi:
 *    invoice/create, card_token/payment - bularning barchasi PULNI MIJOZDAN OLISH uchun, kartaga
 *    YUBORISH uchun emas). Shuning uchun payout() hozircha MANUAL_REQUIRED holatini qaytaradi -
 *    moderator/admin to'lovni Click Business ilovasi yoki bank o'tkazmasi orqali qo'lda amalga
 *    oshiradi va Admin Panel'da tasdiqlaydi (AdminController.confirmManualPayout, keyingi qadam).
 */
@Injectable()
export class ClickProvider implements PaymentProviderAdapter {
  readonly name = 'CLICK' as const;
  private readonly logger = new Logger(ClickProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get merchantId(): string {
    return this.required('CLICK_MERCHANT_ID');
  }
  private get serviceId(): string {
    return this.required('CLICK_SERVICE_ID');
  }
  private get secretKey(): string {
    return this.required('CLICK_SECRET_KEY');
  }
  private get merchantUserId(): string {
    return this.required('CLICK_MERCHANT_USER_ID');
  }

  private required(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new Error(`${key} sozlanmagan (.env) - Click integratsiyasi uchun majburiy`);
    return value;
  }

  /**
   * DEPOSIT: to'g'ridan-to'g'ri to'lov havolasi (SMS/telefon raqami shart emas).
   * transaction_param = escrowId - Click Prepare/Complete so'rovida shu qiymatni
   * "merchant_trans_id" sifatida qaytaradi, shu orqali bizning Escrow yozuvimizni topamiz.
   */
  async createDepositInvoice(params: CreateDepositInvoiceParams): Promise<DepositInvoiceResult> {
    const query = new URLSearchParams({
      service_id: this.serviceId,
      merchant_id: this.merchantId,
      amount: params.amount.toFixed(2),
      transaction_param: params.escrowId,
    });
    if (params.returnUrl) query.set('return_url', params.returnUrl);

    const checkoutUrl = `https://my.click.uz/services/pay?${query.toString()}`;
    this.logger.debug(`Click checkout havolasi yaratildi: escrow=${params.escrowId}`);
    return { checkoutUrl, providerReference: params.escrowId };
  }

  /**
   * Generic interfeys uchun (payment-provider.interface.ts) - Click'da bitta umumiy webhook
   * imzo tekshiruvi yo'q, chunki Prepare va Complete turli formulalar ishlatadi
   * (bu yerda "sana"/prepare_id farqi bor). Shuning uchun bu metod hech qachon chaqirilmaydi -
   * haqiqiy tekshiruv verifyPrepareSignature/verifyCompleteSignature orqali amalga oshiriladi
   * (ClickWebhookController tomonidan chaqiriladi, escrow-webhooks.controller.ts emas).
   */
  verifyWebhookSignature(): boolean {
    this.logger.warn(
      'ClickProvider.verifyWebhookSignature() chaqirildi - bu Click uchun ishlatilmasligi kerak, ' +
        'o\'rniga verifyPrepareSignature/verifyCompleteSignature dan foydalaning',
    );
    return false;
  }

  /** Rasmiy formula: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + amount + action + sign_time) */
  verifyPrepareSignature(p: {
    clickTransId: string | number;
    serviceId: string | number;
    merchantTransId: string;
    amount: string | number;
    action: string | number;
    signTime: string;
    signString: string;
  }): boolean {
    const raw = `${p.clickTransId}${p.serviceId}${this.secretKey}${p.merchantTransId}${p.amount}${p.action}${p.signTime}`;
    return this.md5(raw) === p.signString;
  }

  /** Rasmiy formula: md5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id + merchant_prepare_id + amount + action + sign_time) */
  verifyCompleteSignature(p: {
    clickTransId: string | number;
    serviceId: string | number;
    merchantTransId: string;
    merchantPrepareId: string | number;
    amount: string | number;
    action: string | number;
    signTime: string;
    signString: string;
  }): boolean {
    const raw = `${p.clickTransId}${p.serviceId}${this.secretKey}${p.merchantTransId}${p.merchantPrepareId}${p.amount}${p.action}${p.signTime}`;
    return this.md5(raw) === p.signString;
  }

  private md5(value: string): string {
    return createHash('md5').update(value).digest('hex');
  }

  /**
   * Merchant API (server-to-server) so'rovlari uchun autentifikatsiya header'i.
   * Rasmiy format: "Auth: merchant_user_id:digest:timestamp", digest = sha1(timestamp + secret_key).
   */
  private buildAuthHeader(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const digest = createHash('sha1').update(timestamp + this.secretKey).digest('hex');
    return `${this.merchantUserId}:${digest}:${timestamp}`;
  }

  /** To'lov holatini Click Merchant API orqali tekshirish (masalan admin panel uchun sinxronizatsiya). */
  async checkPaymentStatusByMerchantTransId(merchantTransId: string): Promise<{
    paymentId?: number;
    errorCode: number;
    errorNote: string;
  }> {
    const res = await fetch(
      `https://api.click.uz/v2/merchant/payment/status_by_mti/${this.serviceId}/${merchantTransId}`,
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Auth: this.buildAuthHeader(),
        },
      },
    );
    const data = await res.json();
    return { paymentId: data.payment_id, errorCode: data.error_code, errorNote: data.error_note };
  }

  /**
   * PAYOUT: Click Merchant API'da rasmiy kartaga chiqim endpoint'i mavjud emas (yuqoridagi
   * class-darajasidagi izohga qarang). Shuning uchun avtomatik amalga oshirilmaydi - moderator/admin
   * qo'lda to'laydi va Admin Panel orqali tasdiqlaydi. `status: 'PENDING'` shuni bildiradi.
   */
  async payout(params: PayoutParams): Promise<PayoutResult> {
    this.logger.warn(
      `Click payout AVTOMATIK EMAS: escrow=${params.escrowId} amount=${params.amount} - ` +
        `moderator qo'lda to'lashi va Admin Panel'da tasdiqlashi kerak`,
    );
    return {
      providerReference: `click_manual_${params.escrowId}_${Date.now()}`,
      status: 'PENDING',
    };
  }
}
