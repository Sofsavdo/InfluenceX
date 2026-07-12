import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversionsService } from './conversions.service';
import { ApplicationStatus, CollaborationModel, ConversionStatus, ConversionType } from '@influencex/shared';

/**
 * conversions.service.ts - PRD "CPA (Cost Per Action)": har bir tasdiqlangan konversiya
 * uchun komissiya escrow.service.ts bilan bir xil naqshda hisoblanadi (PLATFORM_COMMISSION_RATES.CPA
 * = 0.15). Muhim tekshiruvlar: (1) faqat kampaniya egasi biznes report/confirm/reject qila oladi,
 * (2) faqat ACCEPTED + CPA/HYBRID zayavkalar uchun konversiya qayd etiladi, (3) markPaid faqat
 * CONFIRMED va hali to'lanmagan konversiyalar uchun ishlaydi (qayta to'lashdan himoya).
 */
describe('ConversionsService', () => {
  let prisma: any;
  let telegramBot: any;
  let service: ConversionsService;

  const APPLICATION_ID = 'application-1';
  const CONVERSION_ID = 'conversion-1';
  const CREATOR_USER_ID = 'creator-user-1';
  const BUSINESS_USER_ID = 'business-user-1';

  function acceptedCpaApplication(overrides: Partial<any> = {}) {
    return {
      id: APPLICATION_ID,
      status: ApplicationStatus.ACCEPTED,
      creator: { userId: CREATOR_USER_ID, name: 'Aziza' },
      campaign: {
        title: 'Kofe kampaniyasi',
        currency: 'UZS',
        collaborationModel: CollaborationModel.CPA,
        business: { userId: BUSINESS_USER_ID },
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      campaignApplication: { findUnique: jest.fn(), update: jest.fn() },
      conversion: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    };
    telegramBot = { notifyUser: jest.fn().mockResolvedValue(undefined) };
    service = new ConversionsService(prisma, telegramBot);
  });

  describe('report', () => {
    it('boshqa biznesga tegishli zayavka uchun ForbiddenException tashlaydi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(acceptedCpaApplication());
      await expect(
        service.report('begona-user', APPLICATION_ID, { type: ConversionType.SALE, amount: 10000 } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('zayavka ACCEPTED bo\'lmasa BadRequestException tashlaydi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(
        acceptedCpaApplication({ status: ApplicationStatus.PENDING }),
      );
      await expect(
        service.report(BUSINESS_USER_ID, APPLICATION_ID, { type: ConversionType.SALE, amount: 10000 } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('kampaniya FIXED modelida bo\'lsa BadRequestException tashlaydi (faqat CPA/HYBRID)', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(
        acceptedCpaApplication({
          campaign: {
            title: 'X',
            currency: 'UZS',
            collaborationModel: CollaborationModel.FIXED,
            business: { userId: BUSINESS_USER_ID },
          },
        }),
      );
      await expect(
        service.report(BUSINESS_USER_ID, APPLICATION_ID, { type: ConversionType.SALE, amount: 10000 } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('to\'g\'ri holatda PLATFORM_COMMISSION_RATES.CPA (15%) bo\'yicha komissiya hisoblab PENDING konversiya yaratadi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(acceptedCpaApplication());
      prisma.conversion.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: CONVERSION_ID, ...data }),
      );

      const result = await service.report(BUSINESS_USER_ID, APPLICATION_ID, {
        type: ConversionType.SALE,
        amount: 10000,
      } as any);

      expect(result.status).toBe(ConversionStatus.PENDING);
      expect(result.platformFee).toBe(1500); // 10000 * 0.15
      expect(result.payoutAmount).toBe(8500); // 10000 - 1500
      expect(telegramBot.notifyUser).toHaveBeenCalledWith(CREATOR_USER_ID, expect.stringContaining('konversiya'));
    });
  });

  describe('confirm/reject', () => {
    function pendingConversion(overrides: Partial<any> = {}) {
      return {
        id: CONVERSION_ID,
        status: ConversionStatus.PENDING,
        payoutAmount: 8500,
        application: acceptedCpaApplication(),
        ...overrides,
      };
    }

    it('confirm: boshqa biznesga tegishli konversiya uchun ForbiddenException tashlaydi', async () => {
      prisma.conversion.findUnique.mockResolvedValue(pendingConversion());
      await expect(service.confirm('begona-user', CONVERSION_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('confirm: allaqachon CONFIRMED bo\'lsa BadRequestException tashlaydi', async () => {
      prisma.conversion.findUnique.mockResolvedValue(pendingConversion({ status: ConversionStatus.CONFIRMED }));
      await expect(service.confirm(BUSINESS_USER_ID, CONVERSION_ID)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('confirm: to\'g\'ri holatda CONFIRMED holatiga o\'tkazadi va kreatorga bildirishnoma yuboradi', async () => {
      prisma.conversion.findUnique.mockResolvedValue(pendingConversion());
      prisma.conversion.update.mockResolvedValue({ ...pendingConversion(), status: ConversionStatus.CONFIRMED });

      const result = await service.confirm(BUSINESS_USER_ID, CONVERSION_ID);
      expect(result.status).toBe(ConversionStatus.CONFIRMED);
      expect(telegramBot.notifyUser).toHaveBeenCalledWith(CREATOR_USER_ID, expect.stringContaining('tasdiqlandi'));
    });

    it('reject: PENDING bo\'lmasa BadRequestException tashlaydi', async () => {
      prisma.conversion.findUnique.mockResolvedValue(pendingConversion({ status: ConversionStatus.REJECTED }));
      await expect(service.reject(BUSINESS_USER_ID, CONVERSION_ID)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reject: to\'g\'ri holatda REJECTED holatiga o\'tkazadi', async () => {
      prisma.conversion.findUnique.mockResolvedValue(pendingConversion());
      prisma.conversion.update.mockResolvedValue({ ...pendingConversion(), status: ConversionStatus.REJECTED });

      const result = await service.reject(BUSINESS_USER_ID, CONVERSION_ID, 'Soxta buyurtma');
      expect(result.status).toBe(ConversionStatus.REJECTED);
    });
  });

  describe('markPaid', () => {
    function confirmedConversion(overrides: Partial<any> = {}) {
      return {
        id: CONVERSION_ID,
        status: ConversionStatus.CONFIRMED,
        payoutAmount: 8500,
        paidAt: null,
        application: acceptedCpaApplication(),
        ...overrides,
      };
    }

    it('konversiya topilmasa NotFoundException tashlaydi', async () => {
      prisma.conversion.findUnique.mockResolvedValue(null);
      await expect(service.markPaid(CONVERSION_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('CONFIRMED bo\'lmasa BadRequestException tashlaydi', async () => {
      prisma.conversion.findUnique.mockResolvedValue(confirmedConversion({ status: ConversionStatus.PENDING }));
      await expect(service.markPaid(CONVERSION_ID)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('allaqachon paidAt bor bo\'lsa BadRequestException tashlaydi (qayta to\'lashdan himoya)', async () => {
      prisma.conversion.findUnique.mockResolvedValue(confirmedConversion({ paidAt: new Date() }));
      await expect(service.markPaid(CONVERSION_ID)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('to\'g\'ri holatda paidAt va payoutReference\'ni belgilaydi, kreatorga bildirishnoma yuboradi', async () => {
      prisma.conversion.findUnique.mockResolvedValue(confirmedConversion());
      prisma.conversion.update.mockImplementation(({ data }: any) =>
        Promise.resolve({ ...confirmedConversion(), ...data }),
      );

      const result = await service.markPaid(CONVERSION_ID, 'click_tx_123');
      expect(result.paidAt).toBeTruthy();
      expect(result.payoutReference).toBe('click_tx_123');
      expect(telegramBot.notifyUser).toHaveBeenCalledWith(CREATOR_USER_ID, expect.stringContaining('to\'landi'));
    });
  });

  describe('trackClick', () => {
    it('zayavka topilmasa NotFoundException tashlaydi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(null);
      await expect(service.trackClick(APPLICATION_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('landingUrl belgilanmagan bo\'lsa BadRequestException tashlaydi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue({ campaign: { landingUrl: null } });
      await expect(service.trackClick(APPLICATION_ID)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('to\'g\'ri holatda clickCount\'ni oshiradi va landingUrl qaytaradi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue({
        campaign: { landingUrl: 'https://shop.example.uz/promo' },
      });
      prisma.campaignApplication.update.mockResolvedValue({});

      const url = await service.trackClick(APPLICATION_ID);
      expect(url).toBe('https://shop.example.uz/promo');
      expect(prisma.campaignApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { clickCount: { increment: 1 } } }),
      );
    });
  });
});
