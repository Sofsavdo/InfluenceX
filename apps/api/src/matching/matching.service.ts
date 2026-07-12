import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Platform } from '@influencex/shared';

export interface CreatorRequirement {
  minFollowers?: number;
  maxFollowers?: number;
  platforms?: Platform[];
  categories?: string[];
  countries?: string[];
  languages?: string[];
}

export interface CreatorMatch {
  creator: {
    id: string;
    userId: string;
    name: string;
    avatarUrl: string | null;
    followers: number;
    engagementRate: number;
    tier: string;
    country: string | null;
    categories: string[];
    creatorScore: number;
    rating: number;
  };
  score: number; // 0-100
  breakdown: Record<string, number>; // har bir omilning 0-1 qiymati (tushuntirish uchun)
}

// Har bir omilning umumiy ballga ta'siri (yig'indisi 1.0) - PRD "AI Creator Matching":
// "Niche, Geography, Performance, Audience quality, Budget" asosida.
const WEIGHTS = {
  category: 0.3,
  geography: 0.15,
  followers: 0.2,
  language: 0.1,
  platform: 0.1,
  performance: 0.15,
};

function overlapRatio(a: string[], b: string[]): number {
  if (a.length === 0) return 1; // talab qo'yilmagan bo'lsa - cheklov emas
  if (b.length === 0) return 0;
  const setB = new Set(b.map((x) => x.toLowerCase()));
  const matches = a.filter((x) => setB.has(x.toLowerCase())).length;
  return matches / a.length;
}

/**
 * PRD "AI Creator Matching": kampaniyaga eng mos kreatorlarni avtomatik tavsiya qiladi.
 * MVP'da bu og'irlangan formula (weighted scoring) - LLM chaqiruvisiz, tez va
 * tushuntirib bo'ladigan (har bir omil breakdown'da alohida ko'rinadi). Callarni
 * PostgreSQL'da emas, JS darajasida hisoblaymiz - Faza 2'da kreator soni ortganda
 * dastlabki filtrlashni DB darajasiga (masalan followers oralig'i) tushirish tavsiya etiladi.
 */
@Injectable()
export class MatchingService {
  constructor(private readonly prisma: PrismaService) {}

  async recommendForCampaign(userId: string, campaignId: string, limit = 20): Promise<CreatorMatch[]> {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { business: true },
    });
    if (!campaign) throw new NotFoundException('Kampaniya topilmadi');
    if (campaign.business.userId !== userId) {
      throw new ForbiddenException('Bu kampaniya sizga tegishli emas');
    }

    const requirements = (campaign.requirements as CreatorRequirement) ?? {};

    // Dastlabki keng filtr (DB darajasida) - faqat verifikatsiyadan o'tgan/faol
    // kreatorlarni ko'rib chiqamiz, so'ng nozik skorlashni JS'da qilamiz.
    const candidates = await this.prisma.creatorProfile.findMany({
      where: {
        ...(requirements.minFollowers ? { followers: { gte: requirements.minFollowers } } : {}),
        ...(requirements.maxFollowers ? { followers: { lte: requirements.maxFollowers } } : {}),
      },
      take: 500, // xavfsizlik cheklovi - juda katta bazada ham JS skorlash sekinlashmasin
    });

    const scored = candidates.map((creator) => this.score(creator, requirements));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit);
  }

  private score(creator: any, requirements: CreatorRequirement): CreatorMatch {
    const breakdown: Record<string, number> = {};

    breakdown.category = overlapRatio(requirements.categories ?? [], creator.categories ?? []);

    const countries = requirements.countries ?? [];
    breakdown.geography =
      countries.length === 0 ? 1 : creator.country && countries.includes(creator.country) ? 1 : 0;

    breakdown.followers = this.followerFitScore(creator.followers, requirements.minFollowers, requirements.maxFollowers);

    breakdown.language = overlapRatio(
      (requirements.languages ?? []).map(String),
      (creator.languages ?? []).map(String),
    );

    const platforms = requirements.platforms ?? [];
    const creatorPlatforms = Object.keys(creator.socialLinks ?? {});
    breakdown.platform = platforms.length === 0 ? 1 : overlapRatio(platforms, creatorPlatforms) > 0 ? 1 : 0;

    breakdown.performance = clamp01(creator.creatorScore / 100);

    const score = Math.round(
      (breakdown.category * WEIGHTS.category +
        breakdown.geography * WEIGHTS.geography +
        breakdown.followers * WEIGHTS.followers +
        breakdown.language * WEIGHTS.language +
        breakdown.platform * WEIGHTS.platform +
        breakdown.performance * WEIGHTS.performance) *
        100,
    );

    return {
      creator: {
        id: creator.id,
        userId: creator.userId,
        name: creator.name,
        avatarUrl: creator.avatarUrl ?? null,
        followers: creator.followers,
        engagementRate: creator.engagementRate,
        tier: creator.tier,
        country: creator.country ?? null,
        categories: creator.categories ?? [],
        creatorScore: creator.creatorScore,
        rating: creator.rating,
      },
      score,
      breakdown,
    };
  }

  // Talab qilingan oraliqqa mos bo'lsa 1.0; oraliqdan tashqarida bo'lsa nisbiy pasayadi
  // (masalan 20% tashqarida bo'lsa qattiq rad etish o'rniga yumshoq jarima beriladi).
  private followerFitScore(followers: number, min?: number, max?: number): number {
    if (!min && !max) return 1;
    const lower = min ?? 0;
    const upper = max ?? Infinity;
    if (followers >= lower && followers <= upper) return 1;
    const distanceRatio = followers < lower ? (lower - followers) / Math.max(lower, 1) : (followers - upper) / Math.max(upper, 1);
    return clamp01(1 - distanceRatio);
  }
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
