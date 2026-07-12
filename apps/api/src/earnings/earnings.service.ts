import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EscrowStatus, ConversionStatus } from '@influencex/shared';

interface TransactionRow {
  type: 'escrow' | 'conversion';
  campaignTitle: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
}

/**
 * PRD Creator Dashboard "Earnings" / Business Dashboard "Payments" sahifalari.
 * 2026-07-11 qo'shildi - avval bu sahifalar uchun hech qanday backend agregatsiya
 * yo'q edi (escrow/conversion ma'lumotlari alohida-alohida ekranlarda ko'rinardi,
 * lekin umumiy "qancha ishlab topdim / qancha sarfladim" ko'rinishi yo'q edi).
 *
 * Oddiylik uchun yozuvlar JS'da yig'iladi (Decimal aggregate ishlatilmaydi) -
 * MVP miqyosida bu yetarli va Escrow/Conversion service'lardagi uslubga mos keladi.
 */
@Injectable()
export class EarningsService {
  constructor(private readonly prisma: PrismaService) {}

  async creatorSummary(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) return { totalEarned: 0, pending: 0, currency: 'UZS', transactions: [] as TransactionRow[] };

    const [escrows, conversions] = await Promise.all([
      this.prisma.escrow.findMany({
        where: { application: { creatorId: creator.id } },
        include: { application: { include: { campaign: true } } },
      }),
      this.prisma.conversion.findMany({
        where: { application: { creatorId: creator.id } },
        include: { application: { include: { campaign: true } } },
      }),
    ]);

    let totalEarned = 0;
    let pending = 0;
    const transactions: TransactionRow[] = [];

    for (const e of escrows) {
      const amount = Number(e.payoutAmount);
      if (e.status === EscrowStatus.RELEASED) {
        totalEarned += amount;
        transactions.push({
          type: 'escrow',
          campaignTitle: e.application.campaign.title,
          amount,
          currency: e.currency,
          status: e.status,
          date: e.updatedAt.toISOString(),
        });
      } else if (e.status === EscrowStatus.HELD || e.status === EscrowStatus.RELEASE_PENDING) {
        pending += amount;
      }
    }

    for (const c of conversions) {
      const amount = Number(c.payoutAmount);
      if (c.paidAt) {
        totalEarned += amount;
        transactions.push({
          type: 'conversion',
          campaignTitle: c.application.campaign.title,
          amount,
          currency: c.application.campaign.currency,
          status: 'PAID',
          date: c.paidAt.toISOString(),
        });
      } else if (c.status === ConversionStatus.CONFIRMED) {
        pending += amount;
      }
    }

    transactions.sort((a, b) => (a.date < b.date ? 1 : -1));

    return {
      totalEarned: round2(totalEarned),
      pending: round2(pending),
      currency: 'UZS',
      transactions,
    };
  }

  async businessSummary(userId: string) {
    const business = await this.prisma.businessProfile.findUnique({ where: { userId } });
    if (!business) return { totalSpent: 0, pending: 0, currency: 'UZS', transactions: [] as TransactionRow[] };

    const [escrows, conversions] = await Promise.all([
      this.prisma.escrow.findMany({
        where: { application: { campaign: { businessId: business.id } } },
        include: { application: { include: { campaign: true } } },
      }),
      this.prisma.conversion.findMany({
        where: { application: { campaign: { businessId: business.id } } },
        include: { application: { include: { campaign: true } } },
      }),
    ]);

    let totalSpent = 0;
    let pending = 0;
    const transactions: TransactionRow[] = [];

    for (const e of escrows) {
      const amount = Number(e.amount);
      if (e.status === EscrowStatus.RELEASED) {
        totalSpent += amount;
        transactions.push({
          type: 'escrow',
          campaignTitle: e.application.campaign.title,
          amount,
          currency: e.currency,
          status: e.status,
          date: e.updatedAt.toISOString(),
        });
      } else if (
        e.status === EscrowStatus.AWAITING_DEPOSIT ||
        e.status === EscrowStatus.HELD ||
        e.status === EscrowStatus.RELEASE_PENDING
      ) {
        pending += amount;
      }
    }

    for (const c of conversions) {
      const amount = Number(c.amount);
      if (c.paidAt) {
        totalSpent += amount;
        transactions.push({
          type: 'conversion',
          campaignTitle: c.application.campaign.title,
          amount,
          currency: c.application.campaign.currency,
          status: 'PAID',
          date: c.paidAt.toISOString(),
        });
      } else if (c.status === ConversionStatus.PENDING || c.status === ConversionStatus.CONFIRMED) {
        pending += amount;
      }
    }

    transactions.sort((a, b) => (a.date < b.date ? 1 : -1));

    return {
      totalSpent: round2(totalSpent),
      pending: round2(pending),
      currency: 'UZS',
      transactions,
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
