import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationStatus, CampaignStatus, ConversionStatus, EscrowStatus } from '@influencex/shared';

interface ApplicationRow {
  status: ApplicationStatus;
  clickCount: number;
}

interface BusinessApplicationRow extends ApplicationRow {
  creatorId: string;
  creator: { name: string };
}

interface ConversionRow {
  status: ConversionStatus;
}

/**
 * PRD Creator Dashboard "Analytics" / Business Dashboard "Analytics" sahifalari.
 * 2026-07-11 qo'shildi. MUHIM: bu yerdagi barcha ko'rsatkichlar HAQIQIY DB
 * yozuvlaridan hisoblanadi (soxta/tasodifiy raqamlar emas) - vaqt seriyali
 * kuzatuv infratuzilmasi (masalan kunlik obunachi o'sishi) hali yo'q, shuning
 * uchun bu yerda faqat hozircha mavjud ma'lumotlardan chiqariladigan
 * ko'rsatkichlar (zayavkalar funneli, CPA bosish/konversiya darajasi va h.k.) beriladi.
 */
@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async creatorAnalytics(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) {
      return {
        applications: { total: 0, accepted: 0, rejected: 0, pending: 0, acceptanceRate: 0 },
        campaignsCompleted: 0,
        profile: { followers: 0, engagementRate: 0, rating: 0, creatorScore: 0 },
        cpa: { totalClicks: 0, totalConversions: 0, confirmedConversions: 0, conversionRate: 0 },
      };
    }

    const [applications, completedEscrowsCount, conversions]: [ApplicationRow[], number, ConversionRow[]] =
      await Promise.all([
        this.prisma.campaignApplication.findMany({
          where: { creatorId: creator.id },
          select: { status: true, clickCount: true },
        }),
        this.prisma.escrow.count({
          where: { status: EscrowStatus.RELEASED, application: { creatorId: creator.id } },
        }),
        this.prisma.conversion.findMany({
          where: { application: { creatorId: creator.id } },
          select: { status: true },
        }),
      ]);

    const total = applications.length;
    const accepted = applications.filter((a: ApplicationRow) => a.status === ApplicationStatus.ACCEPTED).length;
    const rejected = applications.filter((a: ApplicationRow) => a.status === ApplicationStatus.REJECTED).length;
    const pending = applications.filter((a: ApplicationRow) => a.status === ApplicationStatus.PENDING).length;
    const totalClicks = applications.reduce((sum: number, a: ApplicationRow) => sum + a.clickCount, 0);
    const confirmedConversions = conversions.filter(
      (c: ConversionRow) => c.status === ConversionStatus.CONFIRMED,
    ).length;

    return {
      applications: {
        total,
        accepted,
        rejected,
        pending,
        acceptanceRate: total > 0 ? round2((accepted / total) * 100) : 0,
      },
      campaignsCompleted: completedEscrowsCount,
      profile: {
        followers: creator.followers,
        engagementRate: creator.engagementRate,
        rating: creator.rating,
        creatorScore: creator.creatorScore,
      },
      cpa: {
        totalClicks,
        totalConversions: conversions.length,
        confirmedConversions,
        conversionRate: totalClicks > 0 ? round2((confirmedConversions / totalClicks) * 100) : 0,
      },
    };
  }

  async businessAnalytics(userId: string) {
    const business = await this.prisma.businessProfile.findUnique({ where: { userId } });
    if (!business) {
      return {
        campaignsByStatus: {} as Record<string, number>,
        applications: { total: 0, accepted: 0, acceptanceRate: 0 },
        topCreators: [] as { creatorId: string; name: string; acceptedCount: number }[],
        cpa: { totalClicks: 0, totalConversions: 0, confirmedConversions: 0, conversionRate: 0 },
      };
    }

    const [campaigns, applications, conversions]: [
      { status: CampaignStatus }[],
      BusinessApplicationRow[],
      ConversionRow[],
    ] = await Promise.all([
      this.prisma.campaign.findMany({ where: { businessId: business.id }, select: { status: true } }),
      this.prisma.campaignApplication.findMany({
        where: { campaign: { businessId: business.id } },
        select: { status: true, clickCount: true, creatorId: true, creator: { select: { name: true } } },
      }),
      this.prisma.conversion.findMany({
        where: { application: { campaign: { businessId: business.id } } },
        select: { status: true },
      }),
    ]);

    const statusValues: CampaignStatus[] = [
      CampaignStatus.DRAFT,
      CampaignStatus.PUBLISHED,
      CampaignStatus.IN_PROGRESS,
      CampaignStatus.COMPLETED,
      CampaignStatus.CANCELLED,
    ];
    const campaignsByStatus: Record<string, number> = {};
    for (const s of statusValues) campaignsByStatus[s] = 0;
    for (const c of campaigns) campaignsByStatus[c.status] = (campaignsByStatus[c.status] ?? 0) + 1;

    const total = applications.length;
    const accepted = applications.filter(
      (a: BusinessApplicationRow) => a.status === ApplicationStatus.ACCEPTED,
    ).length;
    const totalClicks = applications.reduce((sum: number, a: BusinessApplicationRow) => sum + a.clickCount, 0);
    const confirmedConversions = conversions.filter(
      (c: ConversionRow) => c.status === ConversionStatus.CONFIRMED,
    ).length;

    // Ushbu biznesning zayavkalarida eng ko'p qabul qilingan (ACCEPTED) kreatorlar - ishonchli hamkorlar.
    const acceptedByCreator = new Map<string, { name: string; count: number }>();
    for (const a of applications) {
      if (a.status !== ApplicationStatus.ACCEPTED) continue;
      const entry = acceptedByCreator.get(a.creatorId) ?? { name: a.creator.name, count: 0 };
      entry.count += 1;
      acceptedByCreator.set(a.creatorId, entry);
    }
    const topCreators = Array.from(acceptedByCreator.entries())
      .map(([creatorId, v]) => ({ creatorId, name: v.name, acceptedCount: v.count }))
      .sort((a, b) => b.acceptedCount - a.acceptedCount)
      .slice(0, 5);

    return {
      campaignsByStatus,
      applications: {
        total,
        accepted,
        acceptanceRate: total > 0 ? round2((accepted / total) * 100) : 0,
      },
      topCreators,
      cpa: {
        totalClicks,
        totalConversions: conversions.length,
        confirmedConversions,
        conversionRate: totalClicks > 0 ? round2((confirmedConversions / totalClicks) * 100) : 0,
      },
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
