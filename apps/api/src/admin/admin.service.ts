import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReviewVerificationDto } from './dto/review-verification.dto';
import { FraudDetectionService } from '../fraud/fraud-detection.service';
import { CollaborationModel, EscrowStatus } from '@influencex/shared';
interface RawRevenueEscrowRow {
  platformFee: unknown;
  amount: unknown;
  updatedAt: Date;
  application: {
    campaign: {
      title: string;
      collaborationModel: string;
    };
  };
}

interface RawRevenueConversionRow {
  platformFee: unknown;
  amount: unknown;
  paidAt: Date | null;
  application: {
    campaign: {
      title: string;
      collaborationModel: string;
    };
  };
}

interface RevenueEscrowRow {
  platformFee: number;
  amount: number;
  updatedAt: Date;
  application: {
    campaign: {
      title: string;
      collaborationModel: CollaborationModel;
    };
  };
}

interface RevenueConversionRow {
  platformFee: number;
  amount: number;
  paidAt: Date | null;
  application: {
    campaign: {
      title: string;
      collaborationModel: CollaborationModel;
    };
  };
}

export interface RevenueTransactionRow {
  date: string;
  type: 'escrow' | 'conversion';
  campaignTitle: string;
  model: CollaborationModel;
  grossAmount: number;
  platformFee: number;
}

export interface RevenueReport {
  currency: string;
  totalRevenue: number;
  totalGrossVolume: number;
  revenueByModel: Record<string, number>;
  monthlyRevenue: Record<string, number>;
  transactions: RevenueTransactionRow[];
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
      this.prisma.escrow.count({
        where: { status: 'HELD' as any },
      }),
      this.prisma.dispute.count({
        where: { status: 'OPEN' as any },
      }),
    ]).then(([users, campaigns, heldEscrows, openDisputes]) => ({
      users,
      campaigns,
      heldEscrows,
      openDisputes,
    }));
  }

  listUsers() {
    return this.prisma.user.findMany({
      include: {
        creatorProfile: true,
        businessProfile: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });
  }

  listCampaigns() {
    return this.prisma.campaign.findMany({
      include: {
        business: true,
        applications: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });
  }

  listEscrows() {
    return this.prisma.escrow.findMany({
      include: {
        application: {
          include: {
            creator: true,
            campaign: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });
  }

  listDisputes() {
    return this.prisma.dispute.findMany({
      include: {
        escrow: {
          include: {
            application: {
              include: {
                creator: true,
                campaign: {
                  include: {
                    business: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 200,
    });
  }

  listVerificationRequests() {
    return this.prisma.verificationRequest.findMany({
      where: {
        status: 'PENDING' as any,
      },
      include: {
        user: {
          include: {
            creatorProfile: true,
            businessProfile: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async reviewVerification(
    moderatorId: string,
    id: string,
    dto: ReviewVerificationDto,
  ) {
    const request = await this.prisma.verificationRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException("Verifikatsiya so'rovi topilmadi");
    }

    await this.prisma.verificationRequest.update({
      where: { id },
      data: {
        status: dto.status,
        note: dto.note,
        reviewedBy: moderatorId,
        reviewedAt: new Date(),
      },
    });

    if (dto.status === 'VERIFIED') {
      const creator = await this.prisma.creatorProfile.findUnique({
        where: {
          userId: request.userId,
        },
      });

      if (creator) {
        await this.prisma.creatorProfile.update({
          where: {
            userId: request.userId,
          },
          data: {
            verificationStatus: 'VERIFIED' as any,
          },
        });
      } else {
        await this.prisma.businessProfile.update({
          where: {
            userId: request.userId,
          },
          data: {
            verificationStatus: 'VERIFIED' as any,
          },
        });
      }
    }

    return this.prisma.verificationRequest.findUnique({
      where: { id },
    });
  }

  /**
   * PRD "AI Fraud Detection": moderator uchun shubhali kreator profillari.
   * Bu evristik signal bo‘lib, yakuniy qarorni moderator beradi.
   */
  fraudSignals() {
    return this.fraudDetection.generateReport(100);
  }

  /**
   * PRD Admin Panel "Revenue Reports".
   * Faqat RELEASED escrow va paidAt mavjud konversiyalar hisoblanadi.
   */
  async revenueReport(): Promise<RevenueReport> {
    const [rawEscrows, rawConversions] = await Promise.all([
      this.prisma.escrow.findMany({
        where: {
          status: EscrowStatus.RELEASED,
        },
        select: {
          platformFee: true,
          amount: true,
          updatedAt: true,
          application: {
            select: {
              campaign: {
                select: {
                  title: true,
                  collaborationModel: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.conversion.findMany({
        where: {
          paidAt: {
            not: null,
          },
        },
        select: {
          platformFee: true,
          amount: true,
          paidAt: true,
          application: {
            select: {
              campaign: {
                select: {
                  title: true,
                  collaborationModel: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const escrows: RevenueEscrowRow[] = rawEscrows.map(
  (row: RawRevenueEscrowRow) => ({
      platformFee: Number(row.platformFee),
      amount: Number(row.amount),
      updatedAt: row.updatedAt,
      application: {
        campaign: {
          title: row.application.campaign.title,
          collaborationModel:
            row.application.campaign.collaborationModel as CollaborationModel,
        },
      },
    }));

    const conversions: RevenueConversionRow[] = rawConversions.map(
  (row: RawRevenueConversionRow) => ({
      platformFee: Number(row.platformFee),
      amount: Number(row.amount),
      paidAt: row.paidAt,
      application: {
        campaign: {
          title: row.application.campaign.title,
          collaborationModel:
            row.application.campaign.collaborationModel as CollaborationModel,
        },
      },
    }));

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

    for (const escrow of escrows) {
      const fee = escrow.platformFee;
      const gross = escrow.amount;
      const model = escrow.application.campaign.collaborationModel;

      totalRevenue += fee;
      totalGrossVolume += gross;

      revenueByModel[model] = (revenueByModel[model] ?? 0) + fee;

      const monthKey = escrow.updatedAt.toISOString().slice(0, 7);
      monthlyRevenue[monthKey] =
        (monthlyRevenue[monthKey] ?? 0) + fee;

      transactions.push({
        date: escrow.updatedAt.toISOString(),
        type: 'escrow',
        campaignTitle: escrow.application.campaign.title,
        model,
        grossAmount: gross,
        platformFee: fee,
      });
    }

    for (const conversion of conversions) {
      if (!conversion.paidAt) {
        continue;
      }

      const fee = conversion.platformFee;
      const gross = conversion.amount;
      const model = conversion.application.campaign.collaborationModel;

      totalRevenue += fee;
      totalGrossVolume += gross;

      revenueByModel[model] = (revenueByModel[model] ?? 0) + fee;

      const monthKey = conversion.paidAt.toISOString().slice(0, 7);
      monthlyRevenue[monthKey] =
        (monthlyRevenue[monthKey] ?? 0) + fee;

      transactions.push({
        date: conversion.paidAt.toISOString(),
        type: 'conversion',
        campaignTitle: conversion.application.campaign.title,
        model,
        grossAmount: gross,
        platformFee: fee,
      });
    }

    transactions.sort((a, b) => b.date.localeCompare(a.date));

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