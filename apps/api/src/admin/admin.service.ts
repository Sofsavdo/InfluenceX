import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { FraudDetectionService } from '../fraud/fraud-detection.service';
import { CollaborationModel, EscrowStatus } from '@influencex/shared';

interface RevenueEscrowRow {
  platformFee: number;
  amount: number;
  updatedAt: Date;
  application: { campaign: { title: string; collaborationModel: CollaborationModel } };
}

interface RevenueConversionRow {
  platformFee: number;
  amount: number;
  paidAt: Date | null;
  application: { campaign: { title: string; collaborationModel: CollaborationModel } };
}

interface RevenueTransactionRow {
  date: string;
  type: 'escrow' | 'conversion';
  campaignTitle: string;
  model: CollaborationModel;
  grossAmount: number;
  platformFee: number;
}

/**
 * PRD v1 Admin Panel moduli: Users, Campaigns, Payments/Escrow, Disputes,
 * Verification Requests, Revenue Reports. MVP'da bu servis apps/admin
 * (Next.js) tomonidan iste'mol qilinadi — Mini App emas (PRD v2 §2).
 */
@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fraudDetection: FraudDetectionService,
  ) {}

  overview() {
    return Promise.all([
      this.prisma.user.count(),
      this.prisma.campaign.count(),
      this.prisma.escrow.count({ where: { status: 'HELD' as any } }),
      this.prisma.dispute.count({ where: { status: 'OPEN' as any } }),
    ]).then(([users, campaigns, heldEscrows, openDisputes]) => ({
      users,
      campaigns,
      heldEscrows,
      openDisputes,
    }));
  }

  listUsers() {
    return this.prisma.user.findMany({
      include: { creatorProfile: true, businessProfile: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listCampaigns() {
    return this.prisma.campaign.findMany({
      include: { business: true, applications: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listEscrows() {
    return this.prisma.escrow.findMany({
      include: { application: { include: { creator: true, campaign: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listDisputes() {
    return this.prisma.dispute.findMany({
      include: { escrow: { include: { application: { include: { creator: true, campaign: { include: { business: true } } } } } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  listVerificationRequests() {
    return this.prisma.verificationRequest.findMany({
      where: { status: 'PENDING' as any },
      include: { user: { include: { creatorProfile: true, businessProfile: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewVerification(moderatorId: string, id: string, dto: ReviewVerificationDto) {
    const request = await this.prisma.verificationRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Verifikatsiya so\'rovi topilmadi');

    await this.prisma.verificationRequest.update({
      where: { id },
      data: { status: dto.status, note: dto.note, reviewedBy: moderatorId, reviewedAt: new Date() },
    });

    if (dto.status === 'VERIFIED') {
      const creator = await this.prisma.creatorProfile.findUnique({ where: { userId: request.userId } });
      if (creator) {
        await this.prisma.creatorProfile.update({ where: { userId: request.userId }, data: { verificationStatus: 'VERIFIED' as any } });
      } else {
        await this.prisma.businessProfile.update({ where: { userId: request.userId }, data: { verificationStatus: 'VERIFIED' as any } });
      }
    }

    return this.prisma.verificationRequest.findUnique({ where: { id } });
  }

  // PRD "AI Fraud Detection": moderator uchun shubhali kreator profillari ro'yxati
  // (fraud/fraud-detection.service.ts - evristika, yakuniy qaror emas).
  fraudSignals() {
    return this.fraudDetection.generateReport(100);
  }

  /**
   * PRD Admin Panel "Revenue Reports". InfluenceX'ning HAQIQIY komissiya daromadi
   * (platformFee) - yalpi tranzaksiya hajmidan (amount) farqli, chunki amount'ning
   * katta qismi keyin kreatorga hamkorlik haqi sifatida chiqib ketadi (payoutAmount).
   * Faqat yakunlangan pul harakatlari hisoblanadi: RELEASED escrow va paidAt bor
   * konversiyalar - hali HELD/PENDING bo'lganlar "kutilayotgan daromad" emas,
   * chunki nizo/bekor qilinishi mumkin.
   */
  async revenueReport() {
    const [escrows, conversions]: [RevenueEscrowRow[], RevenueConversionRow[]] = await Promise.all([
      this.prisma.escrow.findMany({
        where: { status: EscrowStatus.RELEASED },
        select: {
          platformFee: true,
          amount: true,
          updatedAt: true,
          application: { select: { campaign: { select: { title: true, collaborationModel: true } } } },
        },
      }),
      this.prisma.conversion.findMany({
        where: { paidAt: { not: null } },
        select: {
          platformFee: true,
          amount: true,
          paidAt: true,
          application: { select: { campaign: { select: { title: true, collaborationModel: true } } } },
        },
      }),
    ]);

    const transactions: RevenueTransactionRow[] = [];
    let totalRevenue = 0;
    let totalGrossVolume = 0;
    const revenueByModel: Record<string, number> = {
      [CollaborationModel.FIXED]: 0,
      [CollaborationModel.BARTER]: 0,
      [CollaborationModel.CPA]: 0,
      [CollaborationModel.HYBRID]: 0,
    };
    const monthlyRevenue: Record<string, number> = {};

    for (const e of escrows) {
      const fee = Number(e.platformFee);
      const gross = Number(e.amount);
      const model = e.application.campaign.collaborationModel;
      totalRevenue += fee;
      totalGrossVolume += gross;
      revenueByModel[model] = (revenueByModel[model] ?? 0) + fee;
      const monthKey = e.updatedAt.toISOString().slice(0, 7);
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] ?? 0) + fee;
      transactions.push({
        date: e.updatedAt.toISOString(),
        type: 'escrow',
        campaignTitle: e.application.campaign.title,
        model,
        grossAmount: gross,
        platformFee: fee,
      });
    }

    for (const c of conversions) {
      const fee = Number(c.platformFee);
      const gross = Number(c.amount);
      const model = c.application.campaign.collaborationModel;
      totalRevenue += fee;
      totalGrossVolume += gross;
      revenueByModel[model] = (revenueByModel[model] ?? 0) + fee;
      const monthKey = (c.paidAt as Date).toISOString().slice(0, 7);
      monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] ?? 0) + fee;
      transactions.push({
        date: (c.paidAt as Date).toISOString(),
        type: 'conversion',
        campaignTitle: c.application.campaign.title,
        model,
        grossAmount: gross,
        platformFee: fee,
      });
    }

    transactions.sort((a, b) => (a.date < b.date ? 1 : -1));

    return {
      currency: 'UZS',
      totalRevenue: round2(totalRevenue),
      totalGrossVolume: round2(totalGrossVolume),
      revenueByModel,
      monthlyRevenue,
      transactions: transactions.slice(0, 100),
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
