import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateDepositInvoiceParams,
  DepositInvoiceResult,
  PaymentProviderAdapter,
  PayoutParams,
  PayoutResult,
} from './payment-provider.interface';

/**
 * Payme Merchant API adapteri (stub).
 * Rasmiy hujjat: https://developer.help.paycom.uz/
 * Ishlab chiqarishda: Cards API / Receipts API orqali invoice yaratiladi,
 * webhook JSON-RPC formatida keladi va Basic Auth (merchant_id:secret_key) bilan tasdiqlanadi.
 */
@Injectable()
export class PaymeProvider implements PaymentProviderAdapter {
  readonly name = 'PAYME' as const;
  private readonly logger = new Logger(PaymeProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createDepositInvoice(params: CreateDepositInvoiceParams): Promise<DepositInvoiceResult> {
    const merchantId = this.config.get<string>('PAYME_MERCHANT_ID');
    // TODO(ishlab-chiqarish): Payme Checkout API chaqiruvi — hozircha stub URL qaytaradi
    this.logger.debug(`Payme invoice yaratilmoqda: escrow=${params.escrowId} amount=${params.amount}`);
    const providerReference = `payme_${params.escrowId}_${Date.now()}`;
    return {
      checkoutUrl: `https://checkout.paycom.uz/${merchantId}?ref=${providerReference}`,
      providerReference,
    };
  }

  verifyWebhookSignature(rawBody: unknown, headers: Record<string, string>): boolean {
    // TODO(ishlab-chiqarish): Basic Auth header'ni PAYME_SECRET_KEY bilan solishtirish
    return true;
  }

  async payout(params: PayoutParams): Promise<PayoutResult> {
    // TODO(ishlab-chiqarish): Payme Business (P2P/card payout) API chaqiruvi
    this.logger.debug(`Payme payout: escrow=${params.escrowId} amount=${params.amount}`);
    return { providerReference: `payme_payout_${params.escrowId}_${Date.now()}`, status: 'PENDING' };
  }
}
