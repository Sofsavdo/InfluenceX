import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { RatingsService } from './ratings.service';

/**
 * ratings.service.ts - 2026-07-12 audit tuzatishi uchun unit testlar. Avval `create()` hech
 * qanday egalik/hamkorlik tekshiruvisiz ishlardi (istalgan user istalgan boshqa userga baho
 * qo'ya olardi). Bu testlar yangi xavfsizlik qatlamini tekshiradi: faqat haqiqiy ACCEPTED
 * zayavka orqali bog'langan biznes<->kreator jufti bir-birini baholay oladi, va bitta
 * hamkorlik uchun faqat bitta marta.
 */
describe('RatingsService', () => {
  let prisma: any;
  let service: RatingsService;

  const BUSINESS_USER_ID = 'business-user-1';
  const CREATOR_USER_ID = 'creator-user-1';
  const OTHER_USER_ID = 'unrelated-user-1';
  const CAMPAIGN_ID = 'campaign-1';

  beforeEach(() => {
    prisma = {
      campaignApplication: { findFirst: jest.fn() },
      rating: { create: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn() },
      creatorProfile: { findUnique: jest.fn(), update: jest.fn() },
      businessProfile: { findUnique: jest.fn(), update: jest.fn() },
    };
    service = new RatingsService(prisma);
  });

  describe('create', () => {
    it('o\'zini o\'ziga baholashga urinsa BadRequestException tashlaydi', async () => {
      await expect(
        service.create(BUSINESS_USER_ID, {
          targetUserId: BUSINESS_USER_ID,
          campaignId: CAMPAIGN_ID,
          score: 5,
        } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('haqiqiy ACCEPTED hamkorlik topilmasa ForbiddenException tashlaydi', async () => {
      prisma.campaignApplication.findFirst.mockResolvedValue(null);

      await expect(
        service.create(OTHER_USER_ID, {
          targetUserId: CREATOR_USER_ID,
          campaignId: CAMPAIGN_ID,
          score: 5,
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('hamkorlik boshqa juftlik uchun bo\'lsa (aloqasiz user) ForbiddenException tashlaydi', async () => {
      prisma.campaignApplication.findFirst.mockResolvedValue({
        campaign: { business: { userId: BUSINESS_USER_ID } },
        creator: { userId: CREATOR_USER_ID },
      });

      // OTHER_USER_ID na biznes, na kreator - hech qanday to'g'ri juftlik yo'q
      await expect(
        service.create(OTHER_USER_ID, {
          targetUserId: CREATOR_USER_ID,
          campaignId: CAMPAIGN_ID,
          score: 5,
        } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('to\'g\'ri biznes->kreator juftligida baho yaratadi va scoreni qayta hisoblaydi', async () => {
      prisma.campaignApplication.findFirst.mockResolvedValue({
        campaign: { business: { userId: BUSINESS_USER_ID } },
        creator: { userId: CREATOR_USER_ID },
      });
      prisma.rating.create.mockResolvedValue({ id: 'rating-1', score: 5 });
      prisma.rating.aggregate.mockResolvedValue({ _avg: { score: 5 } });
      prisma.creatorProfile.findUnique.mockResolvedValue({ userId: CREATOR_USER_ID });

      const result = await service.create(BUSINESS_USER_ID, {
        targetUserId: CREATOR_USER_ID,
        campaignId: CAMPAIGN_ID,
        score: 5,
      } as any);

      expect(result.id).toBe('rating-1');
      expect(prisma.rating.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: BUSINESS_USER_ID,
            targetId: CREATOR_USER_ID,
            campaignId: CAMPAIGN_ID,
            score: 5,
          }),
        }),
      );
      expect(prisma.creatorProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ rating: 5, creatorScore: 100 }) }),
      );
    });

    it('takroriy baho (unique constraint) ConflictException\'ga aylantiriladi', async () => {
      prisma.campaignApplication.findFirst.mockResolvedValue({
        campaign: { business: { userId: BUSINESS_USER_ID } },
        creator: { userId: CREATOR_USER_ID },
      });
      prisma.rating.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.create(BUSINESS_USER_ID, {
          targetUserId: CREATOR_USER_ID,
          campaignId: CAMPAIGN_ID,
          score: 4,
        } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('hasRated', () => {
    it('mavjud baho topilsa rated=true qaytaradi', async () => {
      prisma.rating.findFirst.mockResolvedValue({ id: 'rating-1' });
      const result = await service.hasRated(BUSINESS_USER_ID, CAMPAIGN_ID);
      expect(result).toEqual({ rated: true });
    });

    it('baho topilmasa rated=false qaytaradi', async () => {
      prisma.rating.findFirst.mockResolvedValue(null);
      const result = await service.hasRated(BUSINESS_USER_ID, CAMPAIGN_ID);
      expect(result).toEqual({ rated: false });
    });
  });
});
