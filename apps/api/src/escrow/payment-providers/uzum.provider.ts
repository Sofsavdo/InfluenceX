import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CreateDepositInvoiceParams,
  DepositInvoiceResult,
  PaymentProviderAdapter,
  PayoutParams,
  PayoutResult,
} from './payment-provider.interface';

/** Uzum Bank merchant API adapteri (stub) — Click/Payme bilan bir xil interfeys. */
@Injectable()
export class UzumProvider implements PaymentProviderAdapter {
  readonly name = 'UZUM' as const;
  private readonly logger = new Logger(UzumProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createDepositInvoice(params: CreateDepositInvoiceParams): Promise<DepositInvoiceResult> {
    const merchantId = this.config.get<string>('UZUM_MERCHANT_ID');
    this.logger.debug(`Uzum invoice yaratilmoqda: escrow=${params.escrowId} amount=${params.amount}`);
    const providerReference = `uzum_${params.escrowId}_${Date.now()}`;
    return {
      checkoutUrl: `https://checkout.uzumbank.uz/${merchantId}?ref=${providerReference}`,
      providerReference,
    };
  }

  verifyWebhookSignature(rawBody: unknown, headers: Record<string, string>): boolean {
    return true; // TODO(ishlab-chiqarish)
  }

  async payout(params: PayoutParams): Promise<PayoutResult> {
    this.logger.debug(`Uzum payout: escrow=${params.escrowId} amount=${params.amount}`);
    return { providerReference: `uzum_payout_${params.escrowId}_${Date.now()}`, status: 'PENDING' };
  }
}
