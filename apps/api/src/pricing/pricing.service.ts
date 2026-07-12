import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorTier, ContentType, CollaborationModel } from '@influencex/shared';

export interface PricingFactor {
  label: string;
  multiplier: number;
}

export interface PricingRecommendation {
  currency: 'UZS';
  min: number;
  recommended: number;
  max: number;
  factors: PricingFactor[];
  note: string;
}

// Har bir tier uchun 1 obunachiga to'g'ri keladigan bazaviy narx (UZS) - O'zbekiston
// bozori uchun taxminiy boshlang'ich nuqta (PRD "Geografiya" omili - Faza 2'da
// mamlakat/shahar bo'yicha ko'paytiruvchilar bilan aniqlashtiriladi). Followers ortishi
// bilan 1 obunachiga narx pasayadi (marketingda odatiy "diminishing returns" xossasi).
const RATE_PER_FOLLOWER_UZS: Record<CreatorTier, number> = {
  [CreatorTier.MICRO]: 120,
  [CreatorTier.MEDIUM]: 60,
  [CreatorTier.LARGE]: 30,
  [CreatorTier.UGC]: 0, // UGC uchun followers asos emas - pastqa qarang
};

// UGC-kreatorlar (ko'pincha kam yoki umuman obunachisiz) uchun flat bazaviy haq -
// PRD: "UGC creators" alohida toifa, followers ularning narxini belgilamaydi.
const UGC_BASE_FEE_UZS = 300_000;

// Har bir tier uchun "kutilgan" (typical) engagement rate (%) - haqiqiy engagement
// shundan qancha yuqori/past ekaniga qarab narx tuzatiladi. Real hayotda kichik
// akkauntlarning engagement foizi odatda kattalarnikidan yuqori bo'ladi.
const EXPECTED_ENGAGEMENT_BY_TIER: Record<CreatorTier, number> = {
  [CreatorTier.MICRO]: 5.0,
  [CreatorTier.MEDIUM]: 3.0,
  [CreatorTier.LARGE]: 1.5,
  [CreatorTier.UGC]: 3.0,
};

// Kontent turi uchun ishlab chiqarish/vaqt sarfi ko'paytiruvchisi.
const CONTENT_TYPE_MULTIPLIER: Record<ContentType, number> = {
  [ContentType.STORY]: 0.6,
  [ContentType.POST]: 1.0,
  [ContentType.REEL]: 1.2,
  [ContentType.SHORT_VIDEO]: 1.2,
  [ContentType.UGC_VIDEO]: 1.3,
  [ContentType.PRODUCT_REVIEW]: 1.3,
  [ContentType.VOICE_REVIEW]: 1.1,
  [ContentType.LONG_VIDEO]: 1.8,
  [ContentType.YOUTUBE_INTEGRATION]: 2.0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round5000(value: number): number {
  return Math.max(50_000, Math.round(value / 5_000) * 5_000);
}

/**
 * PRD "AI Pricing Engine": followers/engagement/reach/niche/geography/tarixiy natijalar
 * asosida adolatli bozor narxini hisoblaydi. MVP'da bu formulaga asoslangan deterministik
 * algoritm (LLM emas) - tez, bepul, va tushuntirib bo'ladigan (har bir omil alohida
 * ko'rsatiladi). "AI provides recommendations only. Final price is determined by
 * creator and business" (asl PRD) - shuning uchun natija har doim min/recommended/max
 * oralig'i sifatida qaytariladi, kelishuv uchun joy qoldiriladi.
 */
@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  async recommendForCreator(
    creatorId: string,
    contentType: ContentType = ContentType.REEL,
    collaborationModel: CollaborationModel = CollaborationModel.FIXED,
  ): Promise<PricingRecommendation> {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { id: creatorId } });
    if (!creator) throw new NotFoundException('Kreator profili topilmadi');

    return this.compute(
      {
        followers: creator.followers,
        engagementRate: creator.engagementRate,
        tier: creator.tier as CreatorTier,
        creatorScore: creator.creatorScore,
      },
      contentType,
      collaborationModel,
    );
  }

  compute(
    creator: { followers: number; engagementRate: number; tier: CreatorTier; creatorScore: number },
    contentType: ContentType,
    collaborationModel: CollaborationModel,
  ): PricingRecommendation {
    const factors: PricingFactor[] = [];

    // 1) Bazaviy narx: tier + followers (yoki UGC uchun flat)
    let base: number;
    if (creator.tier === CreatorTier.UGC) {
      base = UGC_BASE_FEE_UZS;
      factors.push({ label: "UGC bazaviy haqi (obunachidan qat'i nazar)", multiplier: 1 });
    } else {
      const rate = RATE_PER_FOLLOWER_UZS[creator.tier];
      base = creator.followers * rate;
      factors.push({ label: `${creator.tier} tier: ${rate} so'm/obunachi`, multiplier: 1 });
    }

    // 2) Engagement rate - kutilganidan yuqori/past bo'lsa narxni tuzatadi
    const expected = EXPECTED_ENGAGEMENT_BY_TIER[creator.tier];
    const engagementRatio = expected > 0 ? creator.engagementRate / expected : 1;
    const engagementMultiplier = clamp(engagementRatio, 0.6, 1.8);
    factors.push({
      label: `Engagement rate ${creator.engagementRate.toFixed(1)}% (kutilgan: ${expected}%)`,
      multiplier: engagementMultiplier,
    });

    // 3) Kontent turi - ishlab chiqarish murakkabligi
    const contentMultiplier = CONTENT_TYPE_MULTIPLIER[contentType] ?? 1.0;
    factors.push({ label: `Kontent turi: ${contentType}`, multiplier: contentMultiplier });

    // 4) Creator Score (reputatsiya) - past reyting narxni biroz pasaytiradi, yuqori - biroz oshiradi
    const scoreMultiplier = 0.85 + (creator.creatorScore / 100) * 0.3;
    factors.push({ label: `Creator Score: ${creator.creatorScore}/100`, multiplier: scoreMultiplier });

    const recommended = round5000(base * engagementMultiplier * contentMultiplier * scoreMultiplier);
    const min = round5000(recommended * 0.85);
    const max = round5000(recommended * 1.2);

    const note =
      collaborationModel === CollaborationModel.CPA
        ? "CPA modelida bu narx faqat mos keladigan boshlang'ich (agar HYBRID bo'lsa) taxmin uchun - asosiy to'lov harakat (sotuv/lid) uchun alohida belgilanadi."
        : "Bu faqat tavsiya - yakuniy narxni kreator va biznes o'zaro kelishadi (PRD §5 AI Pricing Engine).";

    return { currency: 'UZS', min, recommended, max, factors, note };
  }
}
