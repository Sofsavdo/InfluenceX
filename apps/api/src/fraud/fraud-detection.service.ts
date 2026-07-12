import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorTier } from '@influencex/shared';

export interface FraudSignal {
  code: string;
  label: string;
  severity: number; // 0-100, shu signal yolg'iz o'zi qo'shadigan ball
}

export interface FraudReportEntry {
  creator: {
    id: string;
    userId: string;
    name: string;
    followers: number;
    avgViews: number;
    engagementRate: number;
    tier: string;
    verificationStatus: string;
  };
  suspicionScore: number; // 0-100
  signals: FraudSignal[];
}

// Tier bo'yicha "g'ayrioddiy yuqori" engagement chegarasi (%) - bundan yuqorisi
// ko'pincha bot/engagement pod belgisi (haqiqiy organik auditoriya bunchalik
// barqaror yuqori ko'rsatkichga ega bo'lmaydi).
const HIGH_ENGAGEMENT_THRESHOLD: Record<CreatorTier, number> = {
  [CreatorTier.MICRO]: 15,
  [CreatorTier.MEDIUM]: 10,
  [CreatorTier.LARGE]: 6,
  [CreatorTier.UGC]: 15,
};

/**
 * PRD "AI Fraud Detection": Fake followers, Fake engagement, Engagement pods,
 * Suspicious traffic, Artificial activity. MVP'da bu tashqi ma'lumot (masalan
 * Instagram/TikTok API orqali haqiqiy auditoriya tahlili) talab qilmaydigan,
 * faqat InfluenceX o'z ma'lumotlar bazasidagi profil ko'rsatkichlariga asoslangan
 * evristika (heuristic) - moderatorlarga QAERGA e'tibor qaratish kerakligini
 * ko'rsatuvchi signal, YAKUNIY qaror emas (moderator profilni qo'lda tekshiradi).
 */
@Injectable()
export class FraudDetectionService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(limit = 100): Promise<FraudReportEntry[]> {
    const creators = await this.prisma.creatorProfile.findMany({ take: 1000 });
    const scored = creators
      .map((creator) => this.evaluate(creator))
      .filter((entry) => entry.suspicionScore > 0)
      .sort((a, b) => b.suspicionScore - a.suspicionScore);
    return scored.slice(0, limit);
  }

  evaluate(creator: any): FraudReportEntry {
    const signals: FraudSignal[] = [];
    const tier = creator.tier as CreatorTier;

    const highThreshold = HIGH_ENGAGEMENT_THRESHOLD[tier] ?? 15;
    if (creator.engagementRate > highThreshold) {
      signals.push({
        code: 'HIGH_ENGAGEMENT',
        label: `Engagement (${creator.engagementRate.toFixed(1)}%) ${tier} uchun kutilganidan (${highThreshold}%) ancha yuqori - engagement pod/bot layk shubhasi`,
        severity: 40,
      });
    }

    if (creator.followers > 3000 && creator.engagementRate < 0.5) {
      signals.push({
        code: 'LOW_ENGAGEMENT_HIGH_FOLLOWERS',
        label: `${creator.followers.toLocaleString()} obunachiga nisbatan engagement juda past (${creator.engagementRate.toFixed(2)}%) - sotib olingan/soxta obunachi shubhasi`,
        severity: 45,
      });
    }

    if (creator.followers > 2000 && creator.avgViews < creator.followers * 0.02) {
      signals.push({
        code: 'LOW_VIEWS_TO_FOLLOWERS',
        label: `O'rtacha ko'rishlar soni obunachilar soniga nisbatan juda past (${creator.avgViews.toLocaleString()} / ${creator.followers.toLocaleString()}) - nofaol/soxta auditoriya shubhasi`,
        severity: 35,
      });
    }

    if (creator.followers > 500 && creator.avgViews > creator.followers * 8) {
      signals.push({
        code: 'VIEWS_FOLLOWERS_OUTLIER',
        label: `O'rtacha ko'rishlar obunachilar sonidan ${Math.round(creator.avgViews / Math.max(creator.followers, 1))}x yuqori - g'ayrioddiy (viral kontent ham bo'lishi mumkin, tekshirilsin)`,
        severity: 15,
      });
    }

    const suspicionScore = Math.min(100, signals.reduce((sum, s) => sum + s.severity, 0));

    return {
      creator: {
        id: creator.id,
        userId: creator.userId,
        name: creator.name,
        followers: creator.followers,
        avgViews: creator.avgViews,
        engagementRate: creator.engagementRate,
        tier: creator.tier,
        verificationStatus: creator.verificationStatus,
      },
      suspicionScore,
      signals,
    };
  }
}
