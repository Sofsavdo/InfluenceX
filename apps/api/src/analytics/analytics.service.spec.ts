import { AnalyticsService } from './analytics.service';
import { ApplicationStatus, CampaignStatus, ConversionStatus, EscrowStatus } from '@influencex/shared';

/**
 * analytics.service.ts - PRD Creator/Business Dashboard "Analytics". Barcha ko'rsatkichlar
 * mavjud DB yozuvlaridan hisoblanadi - bu test asosiy funnel/CPA hisob-kitoblarining
 * to'g'riligini tekshiradi (masalan acceptanceRate = accepted/total * 100).
 */
describe('AnalyticsService', () => {
  let prisma: any;
  let service: AnalyticsService;

  beforeEach(() => {
    prisma = {
      creatorProfile: { findUnique: jest.fn() },
      businessProfile: { findUnique: jest.fn() },
      campaignApplication: { findMany: jest.fn() },
      escrow: { count: jest.fn() },
      conversion: { findMany: jest.fn() },
      campaign: { findMany: jest.fn() },
    };
    service = new AnalyticsService(prisma);
  });

  describe('creatorAnalytics', () => {
    it('kreator profili bo\'lmasa nol qiymatlar qaytaradi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue(null);
      const result = await service.creatorAnalytics('no-profile-user');
      expect(result.applications.total).toBe(0);
      expect(result.cpa.conversionRate).toBe(0);
    });

    it('zayavkalar funneli va CPA ko\'rsatkichlarini to\'g\'ri hisoblaydi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({
        id: 'creator-1',
        followers: 5000,
        engagementRate: 4.2,
        rating: 4.5,
        creatorScore: 80,
      });
      prisma.campaignApplication.findMany.mockResolvedValue([
        { status: ApplicationStatus.ACCEPTED, clickCount: 50 },
        { status: ApplicationStatus.ACCEPTED, clickCount: 30 },
        { status: ApplicationStatus.REJECTED, clickCount: 0 },
        { status: ApplicationStatus.PENDING, clickCount: 0 },
      ]);
      prisma.escrow.count.mockResolvedValue(2);
      prisma.conversion.findMany.mockResolvedValue([
        { status: ConversionStatus.CONFIRMED },
        { status: ConversionStatus.CONFIRMED },
        { status: ConversionStatus.PENDING },
      ]);

      const result = await service.creatorAnalytics('creator-user-1');

      expect(result.applications).toEqual({ total: 4, accepted: 2, rejected: 1, pending: 1, acceptanceRate: 50 });
      expect(result.campaignsCompleted).toBe(2);
      expect(result.cpa.totalClicks).toBe(80);
      expect(result.cpa.confirmedConversions).toBe(2);
      expect(result.cpa.conversionRate).toBe(2.5); // 2/80 * 100
    });
  });

  describe('businessAnalytics', () => {
    it('biznes profili bo\'lmasa nol qiymatlar qaytaradi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue(null);
      const result = await service.businessAnalytics('no-profile-user');
      expect(result.applications.total).toBe(0);
      expect(result.topCreators).toEqual([]);
    });

    it('kampaniyalar holati va eng ko\'p qabul qilingan kreatorlarni to\'g\'ri hisoblaydi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue({ id: 'business-1' });
      prisma.campaign.findMany.mockResolvedValue([
        { status: CampaignStatus.PUBLISHED },
        { status: CampaignStatus.PUBLISHED },
        { status: CampaignStatus.COMPLETED },
      ]);
      prisma.campaignApplication.findMany.mockResolvedValue([
        { status: ApplicationStatus.ACCEPTED, clickCount: 10, creatorId: 'c1', creator: { name: 'Aziza' } },
        { status: ApplicationStatus.ACCEPTED, clickCount: 5, creatorId: 'c1', creator: { name: 'Aziza' } },
        { status: ApplicationStatus.ACCEPTED, clickCount: 20, creatorId: 'c2', creator: { name: 'Bek' } },
        { status: ApplicationStatus.PENDING, clickCount: 0, creatorId: 'c3', creator: { name: 'Vali' } },
      ]);
      prisma.conversion.findMany.mockResolvedValue([{ status: ConversionStatus.CONFIRMED }]);

      const result = await service.businessAnalytics('business-user-1');

      expect(result.campaignsByStatus[CampaignStatus.PUBLISHED]).toBe(2);
      expect(result.campaignsByStatus[CampaignStatus.COMPLETED]).toBe(1);
      expect(result.applications).toEqual({ total: 4, accepted: 3, acceptanceRate: 75 });
      expect(result.topCreators[0]).toEqual({ creatorId: 'c1', name: 'Aziza', acceptedCount: 2 });
      expect(result.cpa.totalClicks).toBe(35);
    });
  });
});
