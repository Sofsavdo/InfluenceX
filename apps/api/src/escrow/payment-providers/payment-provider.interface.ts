/**
 * PRD v2 §4.5 — Escrow: Telegram pulni ushlab turmaydi, O'zbekiston qonunchiligi
 * (№578-sonli "To'lovlar va to'lov tizimlari to'g'risida"gi qonun) litsenziyasiz
 * custody'ni taqiqlaydi. Shu sababli InfluenceX pulni o'zida emas, litsenziyalangan
 * to'lov tashkilotlari (Payme/Click/Uzum) merchant hisobida saqlaydi va faqat
 * ICHKI LEDGER'da (Escrow/EscrowTransaction jadvallari) holatni kuzatadi.
 *
 * Har bir provider shu interfeysni implement qiladi. Haqiqiy API kalitlari va
 * so'rov formatlari ishlab chiqarishga chiqarishdan oldin har bir provayderning
 * rasmiy hujjatlariga (Payme Merchant API / Click Merchant API / Uzum) muvofiq
 * to'ldirilishi kerak — bu yerda struktura va oqim ishonchli qilib qo'yilgan.
 */
export interface CreateDepositInvoiceParams {
  escrowId: string;
  amount: number; // UZS, tiyin emas — provider adapter ichida kerakli birlikka o'tkaziladi
  description: string;
  returnUrl?: string;
}

export interface DepositInvoiceResult {
  checkoutUrl: string; // foydalanuvchi to'lovni yakunlashi uchun Payme/Click sahifasi
  providerReference: string;
}

export interface PayoutParams {
  escrowId: string;
  amount: number; // payoutAmount (komissiyadan keyin), UZS
  cardOrAccount: string; // Uzcard/Humo karta raqami yoki Payme/Click hisobi
  description: string;
}

export interface PayoutResult {
  providerReference: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

export interface PaymentProviderAdapter {
  readonly name: 'PAYME' | 'CLICK' | 'UZUM';
  createDepositInvoice(params: CreateDepositInvoiceParams): Promise<DepositInvoiceResult>;
  verifyWebhookSignature(rawBody: unknown, headers: Record<string, string>): boolean;
  payout(params: PayoutParams): Promise<PayoutResult>;
}
