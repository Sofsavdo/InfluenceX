import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationStatus, CampaignStatus, EscrowStatus } from '@influencex/shared';

/**
 * applications.service.ts - PRD v2 §4.3 kampaniya oqimining o'rtasi:
 * zayavka berish -> biznes ko'rib chiqadi -> qabul qilinsa escrow+chat avtomatik ochiladi.
 * Bu yerda alohida e'tibor: (1) faqat kampaniya egasi biznes zayavkachilarni ko'ra oladi
 * (2026-07-11 xavfsizlik tuzatishi), (2) faqat kampaniya egasi status o'zgartira oladi.
 */
describe('ApplicationsService', () => {
  let prisma: any;
  let escrowService: any;
  let telegramBot: any;
  let service: ApplicationsService;

  const CAMPAIGN_ID = 'campaign-1';
  const APPLICATION_ID = 'application-1';
  const CREATOR_USER_ID = 'creator-user-1';
  const CREATOR_PROFILE_ID = 'creator-profile-1';
  const BUSINESS_USER_ID = 'business-user-1';

  beforeEach(() => {
    prisma = {
      creatorProfile: { findUnique: jest.fn() },
      campaign: { findUnique: jest.fn() },
      campaignApplication: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      chatThread: { upsert: jest.fn() },
    };
    escrowService = { createForApplication: jest.fn().mockResolvedValue({ id: 'escrow-1' }) };
    telegramBot = { notifyUser: jest.fn().mockResolvedValue(undefined) };

    service = new ApplicationsService(prisma, escrowService, telegramBot);
  });

  describe('apply', () => {
    it('kreator profili to\'ldirilmagan bo\'lsa ForbiddenException tashlaydi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue(null);
      await expect(
        service.apply(CREATOR_USER_ID, { campaignId: CAMPAIGN_ID } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('kampaniya PUBLISHED holatida bo\'lmasa NotFoundException tashlaydi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: CREATOR_PROFILE_ID, name: 'Kreator' });
      prisma.campaign.findUnique.mockResolvedValue({
        id: CAMPAIGN_ID,
        status: CampaignStatus.DRAFT,
        business: { userId: BUSINESS_USER_ID },
      });
      await expect(
        service.apply(CREATOR_USER_ID, { campaignId: CAMPAIGN_ID } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('kreator xuddi shu kampaniyaga qayta zayavka bersa ConflictException tashlaydi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: CREATOR_PROFILE_ID, name: 'Kreator' });
      prisma.campaign.findUnique.mockResolvedValue({
        id: CAMPAIGN_ID,
        status: CampaignStatus.PUBLISHED,
        title: 'Sinov',
        business: { userId: BUSINESS_USER_ID },
      });
      prisma.campaignApplication.findUnique.mockResolvedValue({ id: 'eski-zayavka' });

      await expect(
        service.apply(CREATOR_USER_ID, { campaignId: CAMPAIGN_ID } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('to\'g\'ri holatda PENDING zayavka yaratadi va biznesga bildirishnoma yuboradi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: CREATOR_PROFILE_ID, name: 'Aziza' });
      prisma.campaign.findUnique.mockResolvedValue({
        id: CAMPAIGN_ID,
        status: CampaignStatus.PUBLISHED,
        title: 'Kofe kampaniyasi',
        business: { userId: BUSINESS_USER_ID },
      });
      prisma.campaignApplication.findUnique.mockResolvedValue(null);
      prisma.campaignApplication.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: APPLICATION_ID, ...data }),
      );

      const result = await service.apply(CREATOR_USER_ID, {
        campaignId: CAMPAIGN_ID,
        message: 'Hamkorlik qilishni xohlayman',
      } as any);

      expect(result.status).toBe(ApplicationStatus.PENDING);
      expect(result.creatorId).toBe(CREATOR_PROFILE_ID);
      expect(telegramBot.notifyUser).toHaveBeenCalledWith(BUSINESS_USER_ID, expect.stringContaining('Aziza'));
    });
  });

  describe('findForCampaign', () => {
    it('kampaniya topilmasa NotFoundException tashlaydi', async () => {
      prisma.campaign.findUnique.mockResolvedValue(null);
      await expect(service.findForCampaign(BUSINESS_USER_ID, CAMPAIGN_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('kampaniya egasi bo\'lmagan foydalanuvchi uchun ForbiddenException tashlaydi (2026-07-11 tuzatish)', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: CAMPAIGN_ID,
        business: { userId: BUSINESS_USER_ID },
      });
      await expect(service.findForCampaign('begona-user', CAMPAIGN_ID)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('kampaniya egasi bo\'lsa zayavkachilar ro\'yxatini qaytaradi', async () => {
      prisma.campaign.findUnique.mockResolvedValue({
        id: CAMPAIGN_ID,
        business: { userId: BUSINESS_USER_ID },
      });
      prisma.campaignApplication.findMany.mockResolvedValue([{ id: APPLICATION_ID }]);

      const result = await service.findForCampaign(BUSINESS_USER_ID, CAMPAIGN_ID);
      expect(result).toEqual([{ id: APPLICATION_ID }]);
    });
  });

  describe('updateStatus', () => {
    function pendingApplication(overrides: Partial<any> = {}) {
      return {
        id: APPLICATION_ID,
        status: ApplicationStatus.PENDING,
        campaign: { id: CAMPAIGN_ID, title: 'Kofe kampaniyasi', business: { userId: BUSINESS_USER_ID } },
        creator: { userId: CREATOR_USER_ID, name: 'Aziza' },
        ...overrides,
      };
    }

    it('boshqa biznesga tegishli zayavka uchun ForbiddenException tashlaydi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(pendingApplication());
      await expect(
        service.updateStatus('begona-user', APPLICATION_ID, ApplicationStatus.ACCEPTED),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('ACCEPTED qilinganda escrow yaratadi, chat thread ochadi va kreatorga bildirishnoma yuboradi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(pendingApplication());
      const updateMock = jest.fn().mockResolvedValue({ ...pendingApplication(), status: ApplicationStatus.ACCEPTED });
      prisma.campaignApplication.update = updateMock;
      prisma.chatThread.upsert.mockResolvedValue({ id: 'thread-1' });

      const result = await service.updateStatus(BUSINESS_USER_ID, APPLICATION_ID, ApplicationStatus.ACCEPTED);

      expect(result.status).toBe(ApplicationStatus.ACCEPTED);
      expect(escrowService.createForApplication).toHaveBeenCalledWith(APPLICATION_ID);
      expect(prisma.chatThread.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { applicationId: APPLICATION_ID } }),
      );
      expect(telegramBot.notifyUser).toHaveBeenCalledWith(CREATOR_USER_ID, expect.stringContaining('qabul qilindi'));
    });

    it('REJECTED qilinganda escrow/chat yaratilmaydi, faqat kreatorga bildirishnoma yuboriladi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(pendingApplication());
      prisma.campaignApplication.update = jest
        .fn()
        .mockResolvedValue({ ...pendingApplication(), status: ApplicationStatus.REJECTED });

      const result = await service.updateStatus(BUSINESS_USER_ID, APPLICATION_ID, ApplicationStatus.REJECTED);

      expect(result.status).toBe(ApplicationStatus.REJECTED);
      expect(escrowService.createForApplication).not.toHaveBeenCalled();
      expect(prisma.chatThread.upsert).not.toHaveBeenCalled();
      expect(telegramBot.notifyUser).toHaveBeenCalledWith(CREATOR_USER_ID, expect.stringContaining('rad etildi'));
    });
  });

  describe('submitContent', () => {
    function acceptedApplication(overrides: Partial<any> = {}) {
      return {
        id: APPLICATION_ID,
        status: ApplicationStatus.ACCEPTED,
        creator: { userId: CREATOR_USER_ID, name: 'Aziza' },
        campaign: { title: 'Kofe kampaniyasi', business: { userId: BUSINESS_USER_ID } },
        escrow: { status: EscrowStatus.HELD },
        ...overrides,
      };
    }

    it('boshqa kreatorning zayavkasi uchun ForbiddenException tashlaydi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(acceptedApplication());
      await expect(
        service.submitContent('begona-user', APPLICATION_ID, { contentUrls: ['https://instagram.com/p/1'] } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('ACCEPTED holatida bo\'lmasa ConflictException tashlaydi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(
        acceptedApplication({ status: ApplicationStatus.PENDING }),
      );
      await expect(
        service.submitContent(CREATOR_USER_ID, APPLICATION_ID, { contentUrls: ['https://instagram.com/p/1'] } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('escrow HELD holatida bo\'lmasa ConflictException tashlaydi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(
        acceptedApplication({ escrow: { status: EscrowStatus.AWAITING_DEPOSIT } }),
      );
      await expect(
        service.submitContent(CREATOR_USER_ID, APPLICATION_ID, { contentUrls: ['https://instagram.com/p/1'] } as any),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('to\'g\'ri holatda contentUrls\'ni saqlaydi va biznesga bildirishnoma yuboradi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(acceptedApplication());
      prisma.campaignApplication.update.mockResolvedValue({
        ...acceptedApplication(),
        contentSubmittedAt: new Date(),
        contentUrls: ['https://instagram.com/p/1'],
      });

      const result = await service.submitContent(CREATOR_USER_ID, APPLICATION_ID, {
        contentUrls: ['https://instagram.com/p/1'],
        note: 'Reel joylandi',
      } as any);

      expect(result.contentUrls).toEqual(['https://instagram.com/p/1']);
      expect(prisma.campaignApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ contentUrls: ['https://instagram.com/p/1'], contentNote: 'Reel joylandi' }),
        }),
      );
      expect(telegramBot.notifyUser).toHaveBeenCalledWith(BUSINESS_USER_ID, expect.stringContaining('kontent'));
    });
  });
});
