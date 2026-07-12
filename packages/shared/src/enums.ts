// Umumiy enumlar — PRD v2 asosida. api, mini-app va admin uchta joyda ham shu fayl ishlatiladi
// (Prisma schema ham shu qiymatlarga mos keladi, aynan mos nomlash bilan).

export enum UserRole {
  CREATOR = 'CREATOR',
  BUSINESS = 'BUSINESS',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

export enum CreatorTier {
  MICRO = 'MICRO', // 200 - 10,000 obunachi
  MEDIUM = 'MEDIUM', // 10,000 - 100,000 obunachi
  LARGE = 'LARGE', // 100,000+
  UGC = 'UGC', // UGC-kreator (obunachi soni muhim emas)
}

export enum Platform {
  INSTAGRAM = 'INSTAGRAM',
  TIKTOK = 'TIKTOK',
  YOUTUBE = 'YOUTUBE',
  TELEGRAM = 'TELEGRAM',
}

// PRD v2 §3: Faza 1 - FIXED, BARTER. Faza 2 - CPA, HYBRID.
export enum CollaborationModel {
  FIXED = 'FIXED',
  BARTER = 'BARTER',
  CPA = 'CPA',
  HYBRID = 'HYBRID',
}

// PRD v2 §4.4: MVP kontent turlari birinchi 5 tasi, qolgani Faza 2
export enum ContentType {
  REEL = 'REEL',
  STORY = 'STORY',
  POST = 'POST',
  UGC_VIDEO = 'UGC_VIDEO',
  PRODUCT_REVIEW = 'PRODUCT_REVIEW',
  VOICE_REVIEW = 'VOICE_REVIEW', // Faza 2
  SHORT_VIDEO = 'SHORT_VIDEO', // Faza 2
  LONG_VIDEO = 'LONG_VIDEO', // Faza 2
  YOUTUBE_INTEGRATION = 'YOUTUBE_INTEGRATION', // Faza 2
}

export const MVP_CONTENT_TYPES: ContentType[] = [
  ContentType.REEL,
  ContentType.STORY,
  ContentType.POST,
  ContentType.UGC_VIDEO,
  ContentType.PRODUCT_REVIEW,
];

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum ApplicationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

// PRD v2 §4.5: escrow - Telegram emas, InfluenceX ichki ledger + Payme/Click/Uzum orqali
export enum EscrowStatus {
  AWAITING_DEPOSIT = 'AWAITING_DEPOSIT',
  HELD = 'HELD', // mablag' ledger'da "muzlatilgan"
  RELEASE_PENDING = 'RELEASE_PENDING', // biznes tasdiqladi, chiqim navbatda
  RELEASED = 'RELEASED', // kreatorga to'landi
  REFUNDED = 'REFUNDED', // biznesga qaytarildi
  DISPUTED = 'DISPUTED', // moderator ko'rib chiqmoqda
}

export enum PaymentProvider {
  PAYME = 'PAYME',
  CLICK = 'CLICK',
  UZUM = 'UZUM',
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED_CREATOR = 'RESOLVED_CREATOR', // mablag' kreatorga chiqarildi
  RESOLVED_BUSINESS = 'RESOLVED_BUSINESS', // mablag' biznesga qaytarildi
  RESOLVED_SPLIT = 'RESOLVED_SPLIT',
}

export enum Language {
  UZ = 'uz',
  RU = 'ru',
  EN = 'en',
}

// PRD "CPA (Cost Per Action)" - 2026-07-11 qo'shildi
export enum ConversionType {
  SALE = 'SALE',
  LEAD = 'LEAD',
  REGISTRATION = 'REGISTRATION',
  SUBSCRIPTION = 'SUBSCRIPTION',
}

export enum ConversionStatus {
  PENDING = 'PENDING', // biznes tomonidan qayd etildi, hali tasdiqlanmagan
  CONFIRMED = 'CONFIRMED', // biznes tasdiqladi - kreatorga to'lanishi kerak (paidAt bilan to'langanlik belgilanadi)
  REJECTED = 'REJECTED', // spam/soxta deb topildi
}

// CPA atributsiya ishonch darajasi (2026-07-12). Kuchli tartibda: WEBHOOK (eng ishonchli,
// biznesning o'z tizimidan avtomatik) > TELEGRAM_DEEPLINK (bot orqali klik qayd etildi) >
// PROMO_CODE (moderator qo'lda tasdiqlagan chegirma-kod hisoboti) > SELF_REPORTED (eng zaif).
export enum ConversionSource {
  SELF_REPORTED = 'SELF_REPORTED',
  TELEGRAM_DEEPLINK = 'TELEGRAM_DEEPLINK',
  WEBHOOK = 'WEBHOOK',
  PROMO_CODE = 'PROMO_CODE',
}

// PRD "Subscription Plans": Starter (3 faol kampaniya) / Growth (20) / Pro (cheksiz) - 2026-07-11.
export enum SubscriptionPlan {
  STARTER = 'STARTER',
  GROWTH = 'GROWTH',
  PRO = 'PRO',
}

// null = cheksiz (Pro). "Faol kampaniya" = PUBLISHED yoki IN_PROGRESS holatidagi kampaniya
// (campaigns.service.ts#updateStatus shu limitni DRAFT -> PUBLISHED o'tishida tekshiradi).
export const SUBSCRIPTION_PLAN_LIMITS: Record<SubscriptionPlan, number | null> = {
  [SubscriptionPlan.STARTER]: 3,
  [SubscriptionPlan.GROWTH]: 20,
  [SubscriptionPlan.PRO]: null,
};

// PRD v2 §6 / PRD v1 Monetization: komissiya foizlari
export const PLATFORM_COMMISSION_RATES: Record<CollaborationModel, number> = {
  [CollaborationModel.FIXED]: 0.10,
  [CollaborationModel.BARTER]: 0.10,
  [CollaborationModel.CPA]: 0.15,
  [CollaborationModel.HYBRID]: 0.12,
};
