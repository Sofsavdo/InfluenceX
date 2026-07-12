import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EscrowService } from './escrow.service';
import { CollaborationModel, EscrowStatus, PaymentProvider, DisputeStatus } from '@influencex/shared';

/**
 * escrow.service.ts - "Xizmat sotib olish + Hamkorga to'lov" ledgerining asosiy holat
 * mashinasi uchun unit testlar (PRD v2 §4.5). Prisma/provider/Telegram bog'liqliklari
 * to'liq mocklanadi - bu yerda maqsad haqiqiy DB emas, balki business-logika
 * (holat o'tishlari, komissiya hisob-kitobi, ruxsatlar, Click Prepare/Complete
 * idempotentligi) to'g'riligini tekshirish.
 */
describe('EscrowService', () => {
  let prisma: any;
  let paymeProvider: any;
  let clickProvider: any;
  let uzumProvider: any;
  let telegramBot: any;
  let service: EscrowService;

  const ESCROW_ID = 'escrow-1';
  const APPLICATION_ID = 'application-1';
  const BUSINESS_USER_ID = 'business-user-1';
  const CREATOR_USER_ID = 'creator-user-1';

  // Click sign_time formati "YYYY-MM-DD HH:mm:ss" - replay-himoya tekshiruvi (escrow.service.ts)
  // buni "hozir"dan +-15 daqiqa ichida talab qiladi, shuning uchun testlar buni har doim
  // joriy vaqtga nisbatan hisoblab olishi kerak (qattiq kodlangan sana emas).
  function freshClickSignTime(offsetMs = 0): string {
    const d = new Date(Date.now() + offsetMs);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function baseEscrow(overrides: Partial<any> = {}) {
    return {
      id: ESCROW_ID,
      applicationId: APPLICATION_ID,
      amount: 1_000_000,
      currency: 'UZS',
      commissionRate: 0.1,
      platformFee: 100_000,
      payoutAmount: 900_000,
      // depositAmount = biznes haqiqatda naqd to'laydigan summa (2026-07-12 qo'shildi,
      // Barter tuzatishi). FIXED/CPA/HYBRID uchun = amount; standart holatda shu qiymatga teng.
      depositAmount: 1_000_000,
      status: EscrowStatus.AWAITING_DEPOSIT,
      provider: null,
      depositReference: null,
      payoutReference: null,
      ...overrides,
    };
  }

  function applicationWithBusiness(overrides: Partial<any> = {}) {
    return {
      id: APPLICATION_ID,
      escrow: { id: ESCROW_ID },
      campaign: { business: { userId: BUSINESS_USER_ID }, title: 'Sinov kampaniyasi' },
      creator: {
        userId: CREATOR_USER_ID,
        name: 'Sinov Kreator',
        payoutProvider: PaymentProvider.PAYME,
        payoutAccount: '8600 1234 5678 9012',
      },
      // 2026-07-11: approveAndRelease() endi kontent yuborilganini talab qiladi (PRD workflow
      // 8-9-bosqich) - standart holatda "allaqachon yuborilgan" deb belgilaymiz, chunki bu
      // helper'dan foydalanadigan testlarning aksariyati BOSHQA narsani (chiqim mantig'ini)
      // tekshiradi. Aynan shu tekshiruv uchun pastda alohida test bor.
      contentSubmittedAt: new Date('2026-07-10T12:00:00Z'),
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      campaignApplication: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      escrow: {
        create: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
      escrowTransaction: { create: jest.fn() },
      clickTransaction: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
      dispute: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    };

    paymeProvider = {
      name: 'PAYME',
      createDepositInvoice: jest.fn(),
      verifyWebhookSignature: jest.fn(),
      payout: jest.fn(),
    };
    uzumProvider = {
      name: 'UZUM',
      createDepositInvoice: jest.fn(),
      verifyWebhookSignature: jest.fn(),
      payout: jest.fn(),
    };
    clickProvider = {
      name: 'CLICK',
      createDepositInvoice: jest.fn(),
      verifyWebhookSignature: jest.fn(),
      verifyPrepareSignature: jest.fn(),
      verifyCompleteSignature: jest.fn(),
      payout: jest.fn(),
    };
    telegramBot = { notifyUser: jest.fn().mockResolvedValue(undefined) };

    service = new EscrowService(prisma, paymeProvider, clickProvider, uzumProvider, telegramBot);
  });

  // ---------------------------------------------------------------------
  describe('createForApplication', () => {
    it('FIXED model uchun 10% komissiya va payoutAmount to\'g\'ri hisoblanadi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue({
        id: APPLICATION_ID,
        proposedPrice: null,
        campaign: { budget: 1_000_000, currency: 'UZS', collaborationModel: CollaborationModel.FIXED },
      });
      prisma.escrow.create.mockImplementation(({ data }: any) => Promise.resolve({ id: ESCROW_ID, ...data }));

      const escrow = await service.createForApplication(APPLICATION_ID);

      expect(escrow.commissionRate).toBe(0.1);
      expect(escrow.platformFee).toBe(100_000);
      expect(escrow.payoutAmount).toBe(900_000);
      expect(escrow.status).toBe(EscrowStatus.AWAITING_DEPOSIT);
      expect(prisma.escrowTransaction.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ toStatus: EscrowStatus.AWAITING_DEPOSIT }) }),
      );
    });

    it('CPA model uchun 15% komissiya ishlatiladi va proposedPrice budget\'dan ustun turadi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue({
        id: APPLICATION_ID,
        proposedPrice: 500_000,
        campaign: { budget: 1_000_000, currency: 'UZS', collaborationModel: CollaborationModel.CPA },
      });
      prisma.escrow.create.mockImplementation(({ data }: any) => Promise.resolve({ id: ESCROW_ID, ...data }));

      const escrow = await service.createForApplication(APPLICATION_ID);

      expect(escrow.amount).toBe(500_000);
      expect(escrow.commissionRate).toBe(0.15);
      expect(escrow.platformFee).toBe(75_000);
      expect(escrow.payoutAmount).toBe(425_000);
    });

    it('BARTER model uchun payoutAmount=0 va depositAmount=platformFee bo\'ladi (2026-07-12 tuzatish)', async () => {
      // PRD "Barter": mahsulot/xizmat to'g'ridan-to'g'ri biznesdan kreatorga o'tadi - InfluenceX
      // orqali naqd pul o'tmaydi, faqat komissiya (platformFee) naqd to'lanadi. Avval bu farq
      // qilinmagan edi va BARTER FIXED bilan bir xil ishlardi.
      prisma.campaignApplication.findUnique.mockResolvedValue({
        id: APPLICATION_ID,
        proposedPrice: null,
        campaign: { budget: 300_000, currency: 'UZS', collaborationModel: CollaborationModel.BARTER },
      });
      prisma.escrow.create.mockImplementation(({ data }: any) => Promise.resolve({ id: ESCROW_ID, ...data }));

      const escrow = await service.createForApplication(APPLICATION_ID);

      expect(escrow.amount).toBe(300_000);
      expect(escrow.commissionRate).toBe(0.1);
      expect(escrow.platformFee).toBe(30_000);
      expect(escrow.payoutAmount).toBe(0);
      expect(escrow.depositAmount).toBe(30_000);
    });

    it('zayavka topilmasa NotFoundException tashlaydi', async () => {
      prisma.campaignApplication.findUnique.mockResolvedValue(null);
      await expect(service.createForApplication('yoq')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  // ---------------------------------------------------------------------
  describe('initiateDeposit', () => {
    it('boshqa biznesga tegishli escrow uchun ForbiddenException tashlaydi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow(),
        application: { campaign: { business: { userId: 'boshqa-biznes' } } },
      });

      await expect(
        service.initiateDeposit(BUSINESS_USER_ID, ESCROW_ID, PaymentProvider.CLICK),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('AWAITING_DEPOSIT holatida bo\'lmasa BadRequestException tashlaydi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.HELD }),
        application: { campaign: { business: { userId: BUSINESS_USER_ID } } },
      });

      await expect(
        service.initiateDeposit(BUSINESS_USER_ID, ESCROW_ID, PaymentProvider.CLICK),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('to\'g\'ri holatda provider.createDepositInvoice chaqiradi va depositReference saqlaydi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow(),
        application: { campaign: { business: { userId: BUSINESS_USER_ID } } },
      });
      clickProvider.createDepositInvoice.mockResolvedValue({
        checkoutUrl: 'https://my.click.uz/services/pay?...',
        providerReference: ESCROW_ID,
      });
      prisma.escrow.update.mockResolvedValue({});

      const invoice = await service.initiateDeposit(BUSINESS_USER_ID, ESCROW_ID, PaymentProvider.CLICK);

      expect(clickProvider.createDepositInvoice).toHaveBeenCalledWith(
        expect.objectContaining({ escrowId: ESCROW_ID, amount: 1_000_000 }),
      );
      expect(prisma.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ provider: PaymentProvider.CLICK, depositReference: ESCROW_ID }),
        }),
      );
      expect(invoice.providerReference).toBe(ESCROW_ID);
    });
  });

  // ---------------------------------------------------------------------
  describe('confirmDeposit (generic Payme/Uzum oqimi)', () => {
    it('escrow topilmasa NotFoundException tashlaydi', async () => {
      prisma.escrow.findFirst.mockResolvedValue(null);
      await expect(service.confirmDeposit('yoq-ref')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('allaqachon HELD bo\'lsa qayta o\'tkazmaydi (idempotent)', async () => {
      const escrow = baseEscrow({ status: EscrowStatus.HELD });
      prisma.escrow.findFirst.mockResolvedValue(escrow);

      const result = await service.confirmDeposit('ref-1');

      expect(result).toBe(escrow);
      expect(prisma.escrow.update).not.toHaveBeenCalled();
    });

    it('AWAITING_DEPOSIT -> HELD o\'tkazadi va kreatorga bildirishnoma yuboradi', async () => {
      prisma.escrow.findFirst.mockResolvedValue(baseEscrow());
      prisma.escrow.update.mockResolvedValue(baseEscrow({ status: EscrowStatus.HELD }));
      prisma.campaignApplication.findFirst.mockResolvedValue(applicationWithBusiness());

      const result = await service.confirmDeposit('ref-1');

      expect(result.status).toBe(EscrowStatus.HELD);
      expect(prisma.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: EscrowStatus.HELD } }),
      );
      expect(telegramBot.notifyUser).toHaveBeenCalledWith(CREATOR_USER_ID, expect.any(String));
    });
  });

  // ---------------------------------------------------------------------
  describe('Click Shop-API: handleClickPrepare', () => {
    // sign_time doim "hozir"ga nisbatan hisoblanadi (2026-07-11 replay-himoya
    // tekshiruvi qo'shilgandan keyin) - qattiq kodlangan sana testni istalgan
    // vaqtda ishga tushirilganda muddati o'tgan deb rad etilishining oldini oladi.
    const dto = {
      click_trans_id: 111,
      service_id: 222,
      click_paydoc_id: 333,
      merchant_trans_id: ESCROW_ID,
      amount: 1_000_000,
      action: 0,
      error: 0,
      error_note: 'Success',
      sign_time: freshClickSignTime(),
      sign_string: 'irrelevant-in-mock',
    };

    it('imzo noto\'g\'ri bo\'lsa error -1 qaytaradi', async () => {
      clickProvider.verifyPrepareSignature.mockReturnValue(false);
      const result = await service.handleClickPrepare(dto as any);
      expect(result.error).toBe(-1);
    });

    it('escrow topilmasa error -5 qaytaradi', async () => {
      clickProvider.verifyPrepareSignature.mockReturnValue(true);
      prisma.escrow.findUnique.mockResolvedValue(null);
      const result = await service.handleClickPrepare(dto as any);
      expect(result.error).toBe(-5);
    });

    it('escrow AWAITING_DEPOSIT holatida bo\'lmasa error -4 qaytaradi', async () => {
      clickProvider.verifyPrepareSignature.mockReturnValue(true);
      prisma.escrow.findUnique.mockResolvedValue(baseEscrow({ status: EscrowStatus.HELD }));
      const result = await service.handleClickPrepare(dto as any);
      expect(result.error).toBe(-4);
    });

    it('summa mos kelmasa error -2 qaytaradi', async () => {
      clickProvider.verifyPrepareSignature.mockReturnValue(true);
      // Tekshiruv escrow.depositAmount'ga nisbatan (2026-07-12, Barter tuzatishi) - amount emas.
      prisma.escrow.findUnique.mockResolvedValue(baseEscrow({ depositAmount: 2_000_000 }));
      const result = await service.handleClickPrepare(dto as any);
      expect(result.error).toBe(-2);
    });

    it('muvaffaqiyatli bo\'lsa ClickTransaction yaratadi va merchant_prepare_id qaytaradi', async () => {
      clickProvider.verifyPrepareSignature.mockReturnValue(true);
      prisma.escrow.findUnique.mockResolvedValue(baseEscrow());
      prisma.clickTransaction.findUnique.mockResolvedValue(null);
      prisma.clickTransaction.create.mockResolvedValue({ id: 42, escrowId: ESCROW_ID, status: 'PREPARED' });

      const result = await service.handleClickPrepare(dto as any);

      expect(result.error).toBe(0);
      expect((result as any).merchant_prepare_id).toBe(42);
      expect(prisma.clickTransaction.create).toHaveBeenCalledTimes(1);
    });

    it('xuddi shu click_trans_id bilan qayta Prepare kelsa - idempotent, qayta yaratmaydi', async () => {
      clickProvider.verifyPrepareSignature.mockReturnValue(true);
      prisma.escrow.findUnique.mockResolvedValue(baseEscrow());
      prisma.clickTransaction.findUnique.mockResolvedValue({ id: 42, escrowId: ESCROW_ID, status: 'PREPARED' });

      const result = await service.handleClickPrepare(dto as any);

      expect((result as any).merchant_prepare_id).toBe(42);
      expect(prisma.clickTransaction.create).not.toHaveBeenCalled();
    });

    it('replay himoyasi: sign_time 15 daqiqadan eski bo\'lsa (imzo to\'g\'ri bo\'lsa ham) error -1 qaytaradi', async () => {
      clickProvider.verifyPrepareSignature.mockReturnValue(true);
      prisma.escrow.findUnique.mockResolvedValue(baseEscrow());
      const staleDto = { ...dto, sign_time: freshClickSignTime(-20 * 60 * 1000) };

      const result = await service.handleClickPrepare(staleDto as any);

      expect(result.error).toBe(-1);
      expect(prisma.clickTransaction.create).not.toHaveBeenCalled();
    });
  });

  describe('Click Shop-API: handleClickComplete', () => {
    const dto = {
      click_trans_id: 111,
      service_id: 222,
      merchant_trans_id: ESCROW_ID,
      merchant_prepare_id: 42,
      amount: 1_000_000,
      action: 1,
      error: 0,
      error_note: 'Success',
      sign_time: freshClickSignTime(),
      sign_string: 'irrelevant-in-mock',
    };

    it('merchant_prepare_id bo\'lmasa error -6 qaytaradi', async () => {
      const result = await service.handleClickComplete({ ...dto, merchant_prepare_id: undefined } as any);
      expect(result.error).toBe(-6);
    });

    it('imzo noto\'g\'ri bo\'lsa error -1 qaytaradi', async () => {
      clickProvider.verifyCompleteSignature.mockReturnValue(false);
      const result = await service.handleClickComplete(dto as any);
      expect(result.error).toBe(-1);
    });

    it('tranzaksiya topilmasa yoki escrow mos kelmasa error -6 qaytaradi', async () => {
      clickProvider.verifyCompleteSignature.mockReturnValue(true);
      prisma.clickTransaction.findUnique.mockResolvedValue(null);
      const result = await service.handleClickComplete(dto as any);
      expect(result.error).toBe(-6);
    });

    it('allaqachon CONFIRMED bo\'lsa qayta ishlanmasdan muvaffaqiyat qaytaradi (idempotent)', async () => {
      clickProvider.verifyCompleteSignature.mockReturnValue(true);
      prisma.clickTransaction.findUnique.mockResolvedValue({
        id: 42,
        escrowId: ESCROW_ID,
        status: 'CONFIRMED',
      });

      const result = await service.handleClickComplete(dto as any);

      expect(result.error).toBe(0);
      expect(result.error_note).toBe('Already confirmed');
      expect(prisma.clickTransaction.update).not.toHaveBeenCalled();
    });

    it('Click bekor qilingan bo\'lsa (error < 0) CANCELLED qiladi va escrow\'ni HELD qilmaydi', async () => {
      clickProvider.verifyCompleteSignature.mockReturnValue(true);
      prisma.clickTransaction.findUnique.mockResolvedValue({ id: 42, escrowId: ESCROW_ID, status: 'PREPARED' });
      prisma.clickTransaction.update.mockResolvedValue({});

      const result = await service.handleClickComplete({ ...dto, error: -9 } as any);

      expect(prisma.clickTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: 'CANCELLED' } }),
      );
      expect(result.error_note).toBe('Cancellation acknowledged');
      expect(prisma.escrow.update).not.toHaveBeenCalled();
    });

    it('muvaffaqiyatli bo\'lsa CONFIRMED qiladi va escrow\'ni HELD holatiga o\'tkazadi', async () => {
      clickProvider.verifyCompleteSignature.mockReturnValue(true);
      prisma.clickTransaction.findUnique.mockResolvedValue({ id: 42, escrowId: ESCROW_ID, status: 'PREPARED' });
      prisma.clickTransaction.update.mockResolvedValue({});
      prisma.escrow.update.mockResolvedValue(baseEscrow({ status: EscrowStatus.HELD }));
      prisma.campaignApplication.findFirst.mockResolvedValue(applicationWithBusiness());

      const result = await service.handleClickComplete(dto as any);

      expect(prisma.clickTransaction.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'CONFIRMED' }) }),
      );
      expect(prisma.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: ESCROW_ID }, data: { status: EscrowStatus.HELD } }),
      );
      expect(result.error).toBe(0);
      expect((result as any).merchant_confirm_id).toBe(42);
    });

    it('replay himoyasi: sign_time kelajakda bo\'lsa (soat farqi/qalbakilashtirish) ham error -1 qaytaradi', async () => {
      clickProvider.verifyCompleteSignature.mockReturnValue(true);
      prisma.clickTransaction.findUnique.mockResolvedValue({ id: 42, escrowId: ESCROW_ID, status: 'PREPARED' });
      const futureDto = { ...dto, sign_time: freshClickSignTime(30 * 60 * 1000) };

      const result = await service.handleClickComplete(futureDto as any);

      expect(result.error).toBe(-1);
      expect(prisma.clickTransaction.update).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------
  describe('approveAndRelease', () => {
    it('HELD holatida bo\'lmasa BadRequestException tashlaydi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.AWAITING_DEPOSIT }),
        application: { campaign: { business: { userId: BUSINESS_USER_ID } } },
      });

      await expect(service.approveAndRelease(BUSINESS_USER_ID, ESCROW_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('kreator hali kontent yubormagan bo\'lsa BadRequestException tashlaydi (PRD workflow 8-9)', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.HELD }),
        application: { campaign: { business: { userId: BUSINESS_USER_ID } } },
      });
      prisma.campaignApplication.findUniqueOrThrow.mockResolvedValue(
        applicationWithBusiness({ contentSubmittedAt: null }),
      );

      await expect(service.approveAndRelease(BUSINESS_USER_ID, ESCROW_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(prisma.escrow.update).not.toHaveBeenCalled();
    });

    it('kreator to\'lov rekvizitlarini kiritmagan bo\'lsa BadRequestException tashlaydi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.HELD }),
        application: { campaign: { business: { userId: BUSINESS_USER_ID } } },
      });
      prisma.campaignApplication.findUniqueOrThrow.mockResolvedValue(
        applicationWithBusiness({ creator: { userId: CREATOR_USER_ID, name: 'X', payoutProvider: null, payoutAccount: null } }),
      );

      await expect(service.approveAndRelease(BUSINESS_USER_ID, ESCROW_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('BARTER escrow uchun payoutAccount/payoutProvider talab qilinmaydi va provider.payout chaqirilmaydi (2026-07-12 tuzatish)', async () => {
      // payoutAmount=0 va depositAmount!=amount - bu createForApplication() BARTER uchun
      // hosil qiladigan signatura. Kreatorning payoutAccount/payoutProvider maydonlari
      // bo'sh bo'lsa ham (mahsulot/xizmat naqd emas, to'g'ridan-to'g'ri berilgan) release
      // muvaffaqiyatli o'tishi kerak.
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.HELD, amount: 300_000, platformFee: 30_000, payoutAmount: 0, depositAmount: 30_000 }),
        application: { campaign: { business: { userId: BUSINESS_USER_ID } } },
      });
      prisma.campaignApplication.findUniqueOrThrow.mockResolvedValue(
        applicationWithBusiness({ creator: { userId: CREATOR_USER_ID, name: 'X', payoutProvider: null, payoutAccount: null } }),
      );
      prisma.escrow.update.mockResolvedValue(baseEscrow({ status: EscrowStatus.RELEASED, payoutAmount: 0 }));

      const result = await service.approveAndRelease(BUSINESS_USER_ID, ESCROW_ID);

      expect(result.status).toBe(EscrowStatus.RELEASED);
      expect(paymeProvider.payout).not.toHaveBeenCalled();
      expect(clickProvider.payout).not.toHaveBeenCalled();
      expect(uzumProvider.payout).not.toHaveBeenCalled();
      expect(prisma.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: EscrowStatus.RELEASED, payoutReference: 'BARTER_EXCHANGE_DIRECT' }) }),
      );
    });

    it('Click orqali chiqim PENDING qaytarsa, escrow RELEASE_PENDING\'da qoladi (RELEASED bo\'lmaydi)', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.HELD }),
        application: { campaign: { business: { userId: BUSINESS_USER_ID } } },
      });
      prisma.campaignApplication.findUniqueOrThrow.mockResolvedValue(
        applicationWithBusiness({
          creator: {
            userId: CREATOR_USER_ID,
            name: 'X',
            payoutProvider: PaymentProvider.CLICK,
            payoutAccount: '8600...',
          },
        }),
      );
      prisma.escrow.update.mockResolvedValue({});
      clickProvider.payout.mockResolvedValue({ providerReference: 'click_manual_123', status: 'PENDING' });
      prisma.escrow.findUniqueOrThrow.mockResolvedValue(baseEscrow({ status: EscrowStatus.RELEASE_PENDING }));

      const result = await service.approveAndRelease(BUSINESS_USER_ID, ESCROW_ID);

      expect(result.status).toBe(EscrowStatus.RELEASE_PENDING);
      expect(prisma.escrow.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: EscrowStatus.RELEASED }) }),
      );
      expect(telegramBot.notifyUser).toHaveBeenCalledWith(CREATOR_USER_ID, expect.stringContaining('tez orada'));
    });

    it('provider COMPLETED qaytarsa, escrow darhol RELEASED bo\'ladi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.HELD }),
        application: { campaign: { business: { userId: BUSINESS_USER_ID } } },
      });
      prisma.campaignApplication.findUniqueOrThrow.mockResolvedValue(applicationWithBusiness());
      paymeProvider.payout.mockResolvedValue({ providerReference: 'payme-ref-1', status: 'COMPLETED' });
      prisma.escrow.update.mockResolvedValue(baseEscrow({ status: EscrowStatus.RELEASED }));

      const result = await service.approveAndRelease(BUSINESS_USER_ID, ESCROW_ID);

      expect(result.status).toBe(EscrowStatus.RELEASED);
      expect(prisma.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: EscrowStatus.RELEASED, payoutReference: 'payme-ref-1' } }),
      );
      expect(telegramBot.notifyUser).toHaveBeenCalledWith(CREATOR_USER_ID, expect.stringContaining('to\'landi'));
    });
  });

  // ---------------------------------------------------------------------
  describe('confirmManualPayout', () => {
    it('escrow topilmasa NotFoundException tashlaydi', async () => {
      prisma.escrow.findUnique.mockResolvedValue(null);
      await expect(service.confirmManualPayout('moderator-1', ESCROW_ID)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('RELEASE_PENDING holatida bo\'lmasa BadRequestException tashlaydi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.HELD }),
        application: { creator: { userId: CREATOR_USER_ID } },
      });
      await expect(service.confirmManualPayout('moderator-1', ESCROW_ID)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('to\'g\'ri holatda RELEASED\'ga o\'tkazadi va kreatorga bildirishnoma yuboradi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.RELEASE_PENDING }),
        application: { creator: { userId: CREATOR_USER_ID } },
      });
      prisma.escrow.update.mockResolvedValue(baseEscrow({ status: EscrowStatus.RELEASED }));

      const result = await service.confirmManualPayout('moderator-1', ESCROW_ID, 'click_biz_txn_555');

      expect(result.status).toBe(EscrowStatus.RELEASED);
      expect(prisma.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: EscrowStatus.RELEASED, payoutReference: 'click_biz_txn_555' },
        }),
      );
      expect(telegramBot.notifyUser).toHaveBeenCalledWith(CREATOR_USER_ID, expect.any(String));
    });
  });

  // ---------------------------------------------------------------------
  describe('refund', () => {
    it('RELEASED holatidagi escrow\'ni qaytarib bo\'lmaydi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.RELEASED }),
        application: { campaign: { business: { userId: BUSINESS_USER_ID } } },
      });
      await expect(service.refund(BUSINESS_USER_ID, ESCROW_ID)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('HELD holatidagi escrow\'ni REFUNDED\'ga o\'tkazadi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.HELD }),
        application: { campaign: { business: { userId: BUSINESS_USER_ID } } },
      });
      prisma.escrow.update.mockResolvedValue(baseEscrow({ status: EscrowStatus.REFUNDED }));

      const result = await service.refund(BUSINESS_USER_ID, ESCROW_ID, 'Ish bajarilmadi');
      expect(result.status).toBe(EscrowStatus.REFUNDED);
    });
  });

  // ---------------------------------------------------------------------
  describe('raiseDispute', () => {
    it('escrowga aloqasi yo\'q foydalanuvchi uchun ForbiddenException tashlaydi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.HELD }),
        application: applicationWithBusiness(),
      });
      await expect(
        service.raiseDispute('begona-user', ESCROW_ID, { reason: 'sabab' } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('AWAITING_DEPOSIT holatida nizo ochib bo\'lmaydi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.AWAITING_DEPOSIT }),
        application: applicationWithBusiness(),
      });
      await expect(
        service.raiseDispute(BUSINESS_USER_ID, ESCROW_ID, { reason: 'sabab' } as any),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('HELD holatida ishtirokchi nizo ocha oladi va escrow DISPUTED bo\'ladi', async () => {
      prisma.escrow.findUnique.mockResolvedValue({
        ...baseEscrow({ status: EscrowStatus.HELD }),
        application: applicationWithBusiness(),
      });
      prisma.escrow.update.mockResolvedValue({});
      prisma.dispute.create.mockResolvedValue({ id: 'dispute-1', status: DisputeStatus.OPEN });

      const result = await service.raiseDispute(BUSINESS_USER_ID, ESCROW_ID, {
        reason: 'Kontent kelishuvga mos emas',
      } as any);

      expect(prisma.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: EscrowStatus.DISPUTED } }),
      );
      expect(result.status).toBe(DisputeStatus.OPEN);
      expect(telegramBot.notifyUser).toHaveBeenCalledWith(CREATOR_USER_ID, expect.any(String));
    });
  });

  // ---------------------------------------------------------------------
  describe('resolveDispute', () => {
    it('RESOLVED_CREATOR bo\'lsa escrow RELEASED bo\'ladi', async () => {
      prisma.dispute.findUnique.mockResolvedValue({ escrowId: ESCROW_ID });
      prisma.escrow.findUniqueOrThrow.mockResolvedValue(baseEscrow({ status: EscrowStatus.DISPUTED }));
      prisma.campaignApplication.findUnique.mockResolvedValue(applicationWithBusiness());
      prisma.dispute.update.mockResolvedValue({ status: DisputeStatus.RESOLVED_CREATOR });

      await service.resolveDispute('moderator-1', ESCROW_ID, {
        resolution: DisputeStatus.RESOLVED_CREATOR,
      } as any);

      expect(prisma.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: EscrowStatus.RELEASED } }),
      );
    });

    it('RESOLVED_BUSINESS bo\'lsa escrow REFUNDED bo\'ladi', async () => {
      prisma.dispute.findUnique.mockResolvedValue({ escrowId: ESCROW_ID });
      prisma.escrow.findUniqueOrThrow.mockResolvedValue(baseEscrow({ status: EscrowStatus.DISPUTED }));
      prisma.campaignApplication.findUnique.mockResolvedValue(applicationWithBusiness());
      prisma.dispute.update.mockResolvedValue({ status: DisputeStatus.RESOLVED_BUSINESS });

      await service.resolveDispute('moderator-1', ESCROW_ID, {
        resolution: DisputeStatus.RESOLVED_BUSINESS,
      } as any);

      expect(prisma.escrow.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: EscrowStatus.REFUNDED } }),
      );
    });

    it('nizo topilmasa NotFoundException tashlaydi', async () => {
      prisma.dispute.findUnique.mockResolvedValue(null);
      await expect(
        service.resolveDispute('moderator-1', ESCROW_ID, { resolution: DisputeStatus.RESOLVED_CREATOR } as any),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
