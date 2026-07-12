import { EarningsService } from './earnings.service';
import { EscrowStatus, ConversionStatus } from '@influencex/shared';

/**
 * earnings.service.ts - PRD Creator Dashboard "Earnings" / Business Dashboard "Payments".
 * Muhim mantiq: faqat RELEASED escrow va paidAt bor konversiyalar "totalEarned"/"totalSpent"ga
 * kiradi; HELD/RELEASE_PENDING escrow va tasdiqlangan-lekin-to'lanmagan konversiyalar
 * "pending"ga kiradi - hali InfluenceX/biznes tomonidan yakunlanmagan pul harakati.
 */
describe('EarningsService', () => {
  let prisma: any;
  let service: EarningsService;

  beforeEach(() => {
    prisma = {
      creatorProfile: { findUnique: jest.fn() },
      businessProfile: { findUnique: jest.fn() },
      escrow: { findMany: jest.fn() },
      conversion: { findMany: jest.fn() },
    };
    service = new EarningsService(prisma);
  });

  describe('creatorSummary', () => {
    it('kreator profili bo\'lmasa nol qiymatlar qaytaradi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue(null);
      const result = await service.creatorSummary('no-profile-user');
      expect(result).toEqual({ totalEarned: 0, pending: 0, currency: 'UZS', transactions: [] });
    });

    it('RELEASED escrow va to\'langan konversiyalarni totalEarned\'ga, qolganlarni pending\'ga qo\'shadi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: 'creator-1' });
      prisma.escrow.findMany.mockResolvedValue([
        {
          payoutAmount: 100000,
          currency: 'UZS',
          status: EscrowStatus.RELEASED,
          updatedAt: new Date('2026-07-01'),
          application: { campaign: { title: 'Kampaniya A' } },
        },
        {
          payoutAmount: 50000,
          currency: 'UZS',
          status: EscrowStatus.HELD,
          updatedAt: new Date('2026-07-05'),
          application: { campaign: { title: 'Kampaniya B' } },
        },
      ]);
      prisma.conversion.findMany.mockResolvedValue([
        {
          payoutAmount: 8500,
          paidAt: new Date('2026-07-10'),
          status: ConversionStatus.CONFIRMED,
          application: { campaign: { title: 'Kampaniya C', currency: 'UZS' } },
        },
        {
          payoutAmount: 4250,
          paidAt: null,
          status: ConversionStatus.CONFIRMED,
          application: { campaign: { title: 'Kampaniya D', currency: 'UZS' } },
        },
      ]);

      const result = await service.creatorSummary('creator-user-1');

      expect(result.totalEarned).toBe(108500); // 100000 (escrow) + 8500 (konversiya)
      expect(result.pending).toBe(54250); // 50000 (escrow) + 4250 (konversiya)
      expect(result.transactions).toHaveLength(2);
      // eng yangi tranzaksiya birinchi bo'lishi kerak
      expect(result.transactions[0].campaignTitle).toBe('Kampaniya C');
    });
  });

  describe('businessSummary', () => {
    it('biznes profili bo\'lmasa nol qiymatlar qaytaradi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue(null);
      const result = await service.businessSummary('no-profile-user');
      expect(result).toEqual({ totalSpent: 0, pending: 0, currency: 'UZS', transactions: [] });
    });

    it('RELEASED escrow va to\'langan konversiyalarni totalSpent\'ga, qolganlarni pending\'ga qo\'shadi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue({ id: 'business-1' });
      prisma.escrow.findMany.mockResolvedValue([
        {
          amount: 200000,
          currency: 'UZS',
          status: EscrowStatus.RELEASED,
          updatedAt: new Date('2026-07-01'),
          application: { campaign: { title: 'Kampaniya A' } },
        },
        {
          amount: 75000,
          currency: 'UZS',
          status: EscrowStatus.AWAITING_DEPOSIT,
          updatedAt: new Date('2026-07-05'),
          application: { campaign: { title: 'Kampaniya B' } },
        },
      ]);
      prisma.conversion.findMany.mockResolvedValue([
        {
          amount: 10000,
          paidAt: new Date('2026-07-10'),
          status: ConversionStatus.CONFIRMED,
          application: { campaign: { title: 'Kampaniya C', currency: 'UZS' } },
        },
      ]);

      const result = await service.businessSummary('business-user-1');

      expect(result.totalSpent).toBe(210000); // 200000 + 10000
      expect(result.pending).toBe(75000);
    });
  });
});
