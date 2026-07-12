import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CampaignStatus, SubscriptionPlan } from '@influencex/shared';

/**
 * campaigns.service.ts - PRD "Subscription Plans" (Starter=3/Growth=20/Pro=cheksiz
 * faol kampaniya) va "Featured Placement" uchun testlar. Muhim mantiq: limit faqat
 * DRAFT/tugagan holatdan PUBLISHED/IN_PROGRESS'ga O'TISHDA tekshiriladi (allaqachon
 * faol bo'lgan kampaniyaning statusini o'zgartirish - masalan PUBLISHED->IN_PROGRESS -
 * limitga tegmasligi kerak, chunki bu yangi faol kampaniya emas).
 */
describe('CampaignsService', () => {
  let prisma: any;
  let service: CampaignsService;

  const USER_ID = 'business-user-1';
  const BUSINESS_ID = 'business-1';
  const CAMPAIGN_ID = 'campaign-1';

  beforeEach(() => {
    prisma = {
      businessProfile: { findUnique: jest.fn() },
      campaign: {
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    service = new CampaignsService(prisma);
  });

  describe('updateStatus - tarif rejasi limiti', () => {
    it('Starter rejada 3ta faol kampaniya bor bo\'lsa, 4-chisini PUBLISHED qilishga urinishda BadRequestException tashlaydi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue({
        id: BUSINESS_ID,
        subscriptionPlan: SubscriptionPlan.STARTER,
      });
      prisma.campaign.findUnique.mockResolvedValue({
        id: CAMPAIGN_ID,
        businessId: BUSINESS_ID,
        status: CampaignStatus.DRAFT,
      });
      prisma.campaign.count.mockResolvedValue(3);

      await expect(
        service.updateStatus(USER_ID, CAMPAIGN_ID, { status: CampaignStatus.PUBLISHED } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.campaign.update).not.toHaveBeenCalled();
    });

    it('Starter rejada 2ta faol kampaniya bor bo\'lsa, 3-chisini PUBLISHED qilishga ruxsat beradi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue({
        id: BUSINESS_ID,
        subscriptionPlan: SubscriptionPlan.STARTER,
      });
      prisma.campaign.findUnique.mockResolvedValue({
        id: CAMPAIGN_ID,
        businessId: BUSINESS_ID,
        status: CampaignStatus.DRAFT,
      });
      prisma.campaign.count.mockResolvedValue(2);
      prisma.campaign.update.mockResolvedValue({ id: CAMPAIGN_ID, status: CampaignStatus.PUBLISHED });

      const result = await service.updateStatus(USER_ID, CAMPAIGN_ID, { status: CampaignStatus.PUBLISHED } as any);
      expect(result.status).toBe(CampaignStatus.PUBLISHED);
    });

    it('Pro rejada limit tekshirilmaydi (cheksiz)', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue({
        id: BUSINESS_ID,
        subscriptionPlan: SubscriptionPlan.PRO,
      });
      prisma.campaign.findUnique.mockResolvedValue({
        id: CAMPAIGN_ID,
        businessId: BUSINESS_ID,
        status: CampaignStatus.DRAFT,
      });
      prisma.campaign.update.mockResolvedValue({ id: CAMPAIGN_ID, status: CampaignStatus.PUBLISHED });

      const result = await service.updateStatus(USER_ID, CAMPAIGN_ID, { status: CampaignStatus.PUBLISHED } as any);
      expect(result.status).toBe(CampaignStatus.PUBLISHED);
      expect(prisma.campaign.count).not.toHaveBeenCalled();
    });

    it('allaqachon faol (PUBLISHED->IN_PROGRESS) o\'tishda limit tekshirilmaydi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue({
        id: BUSINESS_ID,
        subscriptionPlan: SubscriptionPlan.STARTER,
      });
      prisma.campaign.findUnique.mockResolvedValue({
        id: CAMPAIGN_ID,
        businessId: BUSINESS_ID,
        status: CampaignStatus.PUBLISHED,
      });
      prisma.campaign.update.mockResolvedValue({ id: CAMPAIGN_ID, status: CampaignStatus.IN_PROGRESS });

      const result = await service.updateStatus(USER_ID, CAMPAIGN_ID, { status: CampaignStatus.IN_PROGRESS } as any);
      expect(result.status).toBe(CampaignStatus.IN_PROGRESS);
      expect(prisma.campaign.count).not.toHaveBeenCalled();
    });

    it('boshqa biznesga tegishli kampaniya uchun NotFoundException tashlaydi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue({ id: BUSINESS_ID, subscriptionPlan: SubscriptionPlan.STARTER });
      prisma.campaign.findUnique.mockResolvedValue({ id: CAMPAIGN_ID, businessId: 'boshqa-biznes', status: CampaignStatus.DRAFT });

      await expect(
        service.updateStatus(USER_ID, CAMPAIGN_ID, { status: CampaignStatus.PUBLISHED } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('feature', () => {
    it('boshqa biznesga tegishli kampaniya uchun NotFoundException tashlaydi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue({ id: BUSINESS_ID });
      prisma.campaign.findUnique.mockResolvedValue({ id: CAMPAIGN_ID, businessId: 'boshqa-biznes' });

      await expect(service.feature(USER_ID, CAMPAIGN_ID, 7)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('biznes profili bo\'lmasa ForbiddenException tashlaydi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue(null);
      await expect(service.feature(USER_ID, CAMPAIGN_ID, 7)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('to\'g\'ri holatda isFeatured=true va featuredUntil\'ni kelajakka o\'rnatadi', async () => {
      prisma.businessProfile.findUnique.mockResolvedValue({ id: BUSINESS_ID });
      prisma.campaign.findUnique.mockResolvedValue({ id: CAMPAIGN_ID, businessId: BUSINESS_ID });
      prisma.campaign.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: CAMPAIGN_ID, ...data }),
      );

      const before = Date.now();
      const result = await service.feature(USER_ID, CAMPAIGN_ID, 7);

      expect(result.isFeatured).toBe(true);
      expect(result.featuredUntil!.getTime()).toBeGreaterThan(before);
      expect(result.featuredUntil!.getTime()).toBeLessThanOrEqual(before + 7 * 24 * 60 * 60 * 1000 + 1000);
    });
  });

  describe('findPublic', () => {
    it('muddati o\'tgan featured belgilarni tozalab, so\'ngra featured\'larni birinchi tartiblab qaytaradi', async () => {
      prisma.campaign.updateMany.mockResolvedValue({ count: 1 });
      prisma.campaign.findMany.mockResolvedValue([{ id: 'a', isFeatured: true }]);
      prisma.campaign.count.mockResolvedValue(1);

      const result = await service.findPublic({});

      expect(prisma.campaign.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isFeatured: true }) }),
      );
      expect(prisma.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }] }),
      );
      expect(result.items).toHaveLength(1);
    });
  });
});
