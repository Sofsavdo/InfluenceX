import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CollaborationModel,
  EscrowStatus,
  PLATFORM_COMMISSION_RATES,
  PaymentProvider,
  DisputeStatus,
} from '@influencex/shared';
import { PaymeProvider } from './payment-providers/payme.provider';
import { ClickProvider } from './payment-providers/click.provider';
import { UzumProvider } from './payment-providers/uzum.provider';
import { PaymentProviderAdapter } from './payment-providers/payment-provider.interface';
import { RaiseDisputeDto } from './dto/raise-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { ClickWebhookDto } from './dto/click-webhook.dto';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

/**
 * PRD v2 §4.5 (2026-07-11 yangilanishi) — "Xizmat sotib olish + Hamkorga to'lov" ledgeri.
 *
 * AWAITING_DEPOSIT -> HELD -> RELEASE_PENDING -> RELEASED
 *                        \-> DISPUTED -> RESOLVED_* (RELEASED yoki REFUNDED)
 *                        \-> REFUNDED
 *
 * MUHIM (huquqiy tabiat): Bu ikkita mustaqil bitimni kuzatadi, uchinchi shaxs
 * mablag'ini custody qilmaydi:
 *   1) confirmDeposit(): Biznes InfluenceX'ning kampaniya boshqaruvi XIZMATI uchun
 *      to'laydi -> "amount" InfluenceX SAVDO DAROMADI sifatida qabul qilinadi (HELD).
 *   2) approveAndRelease(): InfluenceX o'z HAMKORI (kreator)ga hamkorlik haqini
 *      to'laydi -> "payoutAmount" InfluenceX XARAJATI sifatida chiqariladi (RELEASED).
 * Payme/Click/Uzum bu yerda faqat litsenziyalangan to'lov relsi; InfluenceX ularning
 * oddiy tadbirkor-mijozi sifatida ishlaydi (Markaziy bank "to'lov tashkiloti"
 * litsenziyasiga muhtoj emas). Har bir holat o'zgarishi EscrowTransaction jadvaliga
 * audit sifatida yoziladi.
 *
 * PRD "Barter" (2026-07-12 tuzatildi): BARTER kampaniyalarda mahsulot/xizmat
 * to'g'ridan-to'g'ri biznesdan kreatorga o'tadi (naqd pul InfluenceX orqali o'tmaydi) -
 * faqat komissiya (platformFee) naqd to'lanadi. Shuning uchun `amount` (e'lon qilingan
 * bitim qiymati) va `depositAmount` (biznes haqiqatda naqd to'laydigan summa) ENDI
 * FARQLANADI: FIXED/CPA/HYBRID uchun depositAmount=amount, BARTER uchun
 * depositAmount=platformFee va payoutAmount=0.
 */
@Injectable()
export class EscrowService {
  private readonly logger = new Logger(EscrowService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymeProvider: PaymeProvider,
    private readonly clickProvider: ClickProvider,
    private readonly uzumProvider: UzumProvider,
    private readonly telegramBot: TelegramBotService,
  ) {}

  private resolveProvider(provider: PaymentProvider): PaymentProviderAdapter {
    switch (provider) {
      case PaymentProvider.PAYME:
        return this.paymeProvider;
      case PaymentProvider.CLICK:
        return this.clickProvider;
      case PaymentProvider.UZUM:
        return this.uzumProvider;
      default:
        throw new BadRequestException('Noma\'lum to\'lov provayderi');
    }
  }

  async createForApplication(applicationId: string) {
    const application = await this.prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: { campaign: true },
    });
    if (!application) throw new NotFoundException('Zayavka topilmadi');

    const amount = Number(application.proposedPrice ?? application.campaign.budget);
    const model = application.campaign.collaborationModel as CollaborationModel;
    const commissionRate = PLATFORM_COMMISSION_RATES[model];
    const platformFee = round2(amount * commissionRate);

    // PRD "Barter": "Business offers products or services instead of cash" - 2026-07-12
    // tuzatildi. Avval BARTER ham FIXED bilan bir xil ishlardi - biznesdan TO'LIQ mahsulot
    // qiymatini Click orqali naqd talab qilardi va kreatorga "naqd" payoutAmount chiqarardi,
    // bu barter tushunchasiga to'g'ridan-to'g'ri zid edi (barter'da mahsulot/xizmat
    // to'g'ridan-to'g'ri biznesdan kreatorga o'tadi, InfluenceX orqali emas).
    // Endi: BARTER uchun kreatorga naqd to'lov YO'Q (payoutAmount=0), biznes faqat
    // komissiyani (platformFee) naqd to'laydi (depositAmount).
    const isBarter = model === CollaborationModel.BARTER;
    const payoutAmount = isBarter ? 0 : round2(amount - platformFee);
    const depositAmount = isBarter ? platformFee : amount;

    const escrow = await this.prisma.escrow.create({
      data: {
        applicationId,
        amount,
        currency: application.campaign.currency,
        commissionRate,
        platformFee,
        payoutAmount,
        depositAmount,
        status: EscrowStatus.AWAITING_DEPOSIT,
      },
    });

    await this.logTransition(escrow.id, null, EscrowStatus.AWAITING_DEPOSIT, 'Escrow yaratildi (zayavka qabul qilindi)');
    return escrow;
  }

  // Biznes to'lovni boshlash uchun chaqiradi — Payme/Click/Uzum checkout havolasi qaytariladi
  async initiateDeposit(userId: string, escrowId: string, provider: PaymentProvider) {
    const escrow = await this.getOwnedByBusiness(userId, escrowId);
    if (escrow.status !== EscrowStatus.AWAITING_DEPOSIT) {
      throw new BadRequestException(`Escrow "${escrow.status}" holatida, depozit boshlab bo'lmaydi`);
    }

    // BARTER uchun biznes faqat komissiyani (depositAmount = platformFee) naqd to'laydi -
    // mahsulot/xizmatning o'zi to'g'ridan-to'g'ri kreatorga beriladi, InfluenceX orqali emas.
    const adapter = this.resolveProvider(provider);
    const invoice = await adapter.createDepositInvoice({
      escrowId: escrow.id,
      amount: Number(escrow.depositAmount),
      description: `InfluenceX kampaniya to'lovi #${escrow.applicationId}`,
    });

    await this.prisma.escrow.update({
      where: { id: escrow.id },
      data: { provider, depositReference: invoice.providerReference },
    });

    return invoice;
  }

  // Provider webhook'i to'lov muvaffaqiyatli bo'lganini tasdiqlaganda chaqiriladi (Payme/Uzum - hali stub)
  async confirmDeposit(providerReference: string) {
    const escrow = await this.prisma.escrow.findFirst({ where: { depositReference: providerReference } });
    if (!escrow) throw new NotFoundException('Escrow (depositReference bo\'yicha) topilmadi');
    if (escrow.status !== EscrowStatus.AWAITING_DEPOSIT) {
      this.logger.warn(`Escrow ${escrow.id} allaqachon "${escrow.status}" holatida, webhook e'tiborsiz qoldirildi`);
      return escrow;
    }
    return this.markEscrowHeld(escrow.id);
  }

  /**
   * Escrow'ni AWAITING_DEPOSIT -> HELD holatiga o'tkazadi va kreatorga bildirishnoma yuboradi.
   * Bir nechta chaqiruvchi tomonidan ishlatiladi: confirmDeposit() (generic stub oqim) va
   * handleClickComplete() (haqiqiy Click Shop-API oqimi).
   */
  private async markEscrowHeld(escrowId: string) {
    const updated = await this.prisma.escrow.update({
      where: { id: escrowId },
      data: { status: EscrowStatus.HELD },
    });
    await this.logTransition(
      escrowId,
      EscrowStatus.AWAITING_DEPOSIT,
      EscrowStatus.HELD,
      'Biznes to\'lovi qabul qilindi (InfluenceX xizmat daromadi sifatida) - kreatorga to\'lov ish tasdiqlangach chiqariladi',
    );

    const application = await this.prisma.campaignApplication.findFirst({
      where: { escrow: { id: escrowId } },
      include: { creator: true, campaign: true },
    });
    if (application) {
      await this.telegramBot.notifyUser(
        application.creator.userId,
        `💰 "<b>${application.campaign.title}</b>" kampaniyasi uchun to'lov qabul qilindi. Ishni yakunlagach, hamkorlik haqingiz to'lanadi.`,
      );
    }
    return updated;
  }

  // ---------------------------------------------------------------------------
  // Click Shop-API (Prepare/Complete) - HAQIQIY integratsiya.
  // Rasmiy hujjat: https://docs.click.uz/en/click-api-request/
  // Xato kodlari (Click ekotizimidagi keng tarqalgan konventsiya - ishlab chiqarishga
  // chiqarishdan oldin docs.click.uz'dagi to'liq jadval bilan solishtirib chiqish tavsiya etiladi):
  //   0 = muvaffaqiyatli, -1 = imzo xato, -2 = summa mos kelmadi, -4 = allaqachon to'langan,
  //   -5 = buyurtma topilmadi, -6 = tranzaksiya topilmadi, -9 = bekor qilindi.
  // ---------------------------------------------------------------------------

  async handleClickPrepare(dto: ClickWebhookDto) {
    if (
      !this.clickProvider.verifyPrepareSignature({
        clickTransId: dto.click_trans_id,
        serviceId: dto.service_id,
        merchantTransId: dto.merchant_trans_id,
        amount: dto.amount,
        action: dto.action,
        signTime: dto.sign_time,
      } as any)
    ) {
      return this.clickError(dto, -1, 'SIGN CHECK FAILED');
    }
    // Replay hujumidan himoya: tutib olingan (valid imzoli) so'rov cheksiz qayta yuborilishining
    // oldini olish - sign_string o'zi vaqtga bog'liq emas, shuning uchun sign_time'ning
    // "yangi"ligini alohida tekshiramiz (2026-07-11 xavfsizlik kuchaytirilishi).
    if (!isClickSignTimeFresh(dto.sign_time)) {
      return this.clickError(dto, -1, 'SIGN CHECK FAILED (so\'rov muddati o\'tgan - sign_time juda eski)');
    }

    const escrow = await this.prisma.escrow.findUnique({ where: { id: dto.merchant_trans_id } });
    if (!escrow) {
      return this.clickError(dto, -5, 'Order (escrow) not found');
    }
    if (escrow.status !== EscrowStatus.AWAITING_DEPOSIT) {
      return this.clickError(dto, -4, `Escrow already in "${escrow.status}" status`);
    }
    // PRD "Barter" (2026-07-12): naqd to'lanadigan haqiqiy summa `depositAmount` - BARTER uchun
    // bu faqat komissiya (platformFee), to'liq `amount` emas. Avval bu yerda `escrow.amount` bilan
    // solishtirilardi, bu BARTER kampaniyalarda Click'dan komissiya miqdorida kelgan to'g'ri
    // to'lovni ham "summasi mos kelmadi" xatosi bilan rad qilardi.
    if (Math.abs(Number(dto.amount) - Number(escrow.depositAmount)) > 0.01) {
      return this.clickError(dto, -2, 'Incorrect amount');
    }

    // Idempotentlik: xuddi shu click_trans_id bilan qayta Prepare kelsa, mavjud yozuvni qaytaramiz
    const existing = await this.prisma.clickTransaction.findUnique({
      where: { clickTransId: BigInt(dto.click_trans_id) },
    });
    const clickTransaction =
      existing ??
      (await this.prisma.clickTransaction.create({
        data: {
          escrowId: escrow.id,
          clickTransId: BigInt(dto.click_trans_id),
          clickPaydocId: dto.click_paydoc_id ? BigInt(dto.click_paydoc_id) : undefined,
          amount: dto.amount,
          status: 'PREPARED',
        },
      }));

    return {
      click_trans_id: dto.click_trans_id,
      merchant_trans_id: dto.merchant_trans_id,
      merchant_prepare_id: clickTransaction.id,
      error: 0,
      error_note: 'Success',
    };
  }

  async handleClickComplete(dto: ClickWebhookDto) {
    if (!dto.merchant_prepare_id) {
      return this.clickError(dto, -6, 'merchant_prepare_id topilmadi');
    }

    if (
      !this.clickProvider.verifyCompleteSignature({
        clickTransId: dto.click_trans_id,
        serviceId: dto.service_id,
        merchantTransId: dto.merchant_trans_id,
        merchantPrepareId: dto.merchant_prepare_id,
        amount: dto.amount,
        action: dto.action,
        signTime: dto.sign_time,
      } as any)
    ) {
      return this.clickError(dto, -1, 'SIGN CHECK FAILED');
    }
    if (!isClickSignTimeFresh(dto.sign_time)) {
      return this.clickError(dto, -1, 'SIGN CHECK FAILED (so\'rov muddati o\'tgan - sign_time juda eski)');
    }

    const clickTransaction = await this.prisma.clickTransaction.findUnique({
      where: { id: Number(dto.merchant_prepare_id) },
    });
    if (!clickTransaction || clickTransaction.escrowId !== dto.merchant_trans_id) {
      return this.clickError(dto, -6, 'Transaction not found');
    }

    // Avval tasdiqlangan bo'lsa - qayta ishlanmaydi, faqat muvaffaqiyat qaytariladi (Click hujjati talabi)
    if (clickTransaction.status === 'CONFIRMED') {
      return {
        click_trans_id: dto.click_trans_id,
        merchant_trans_id: dto.merchant_trans_id,
        merchant_confirm_id: clickTransaction.id,
        error: 0,
        error_note: 'Already confirmed',
      };
    }

    if (Number(dto.error) < 0) {
      await this.prisma.clickTransaction.update({
        where: { id: clickTransaction.id },
        data: { status: 'CANCELLED' },
      });
      return {
        click_trans_id: dto.click_trans_id,
        merchant_trans_id: dto.merchant_trans_id,
        merchant_confirm_id: null,
        error: 0,
        error_note: 'Cancellation acknowledged',
      };
    }

    await this.prisma.clickTransaction.update({
      where: { id: clickTransaction.id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
    });
    await this.markEscrowHeld(clickTransaction.escrowId);

    return {
      click_trans_id: dto.click_trans_id,
      merchant_trans_id: dto.merchant_trans_id,
      merchant_confirm_id: clickTransaction.id,
      error: 0,
      error_note: 'Success',
    };
  }

  private clickError(dto: ClickWebhookDto, error: number, errorNote: string) {
    this.logger.warn(`Click webhook xatosi (${error}): ${errorNote} - merchant_trans_id=${dto.merchant_trans_id}`);
    return {
      click_trans_id: dto.click_trans_id,
      merchant_trans_id: dto.merchant_trans_id,
      error,
      error_note: errorNote,
    };
  }

  /**
   * Biznes ishni tasdiqlaydi -> InfluenceX o'z hamkori (kreator)ga hamkorlik haqini to'laydi.
   * PRD v2 §4.5 (2026-07-11): bu InfluenceX'ning o'z pudratchisiga xarajat to'lovi -
   * "biznes puli"ni kreatorga uzatish emas, chunki "amount" allaqachon 3-bosqichda
   * InfluenceX daromadi sifatida qabul qilingan (confirmDeposit).
   *
   * PRD "Barter" (2026-07-12): BARTER kampaniyalarda payoutAmount=0 (kreator mahsulot/
   * xizmatni to'g'ridan-to'g'ri biznesdan oladi) - shuning uchun bu holatda kreatorning
   * payoutAccount/payoutProvider rekvizitlari SHART EMAS va haqiqiy to'lov provayder
   * chaqiruvi (provider.payout) UMUMAN AMALGA OSHIRILMAYDI, escrow to'g'ridan-to'g'ri
   * RELEASED holatiga o'tkaziladi.
   */
  async approveAndRelease(userId: string, escrowId: string) {
    const escrow = await this.getOwnedByBusiness(userId, escrowId);
    if (escrow.status !== EscrowStatus.HELD) {
      throw new BadRequestException(`Escrow "${escrow.status}" holatida, chiqim boshlab bo'lmaydi`);
    }

    const application = await this.prisma.campaignApplication.findUniqueOrThrow({
      where: { id: escrow.applicationId },
      include: { creator: true },
    });

    // PRD v2 §4.3 workflow 8-9: "Creator submits content -> Business approves" - 2026-07-11
    // qo'shildi. Buning oldida bu tekshiruv umuman yo'q edi, ya'ni biznes hech qanday kontent
    // yuborilmagan bo'lsa ham to'lovni chiqara olardi (dispute'da dalilsiz qolish xavfi).
    if (!application.contentSubmittedAt) {
      throw new BadRequestException(
        "Kreator hali kontent yubormagan (POST /applications/:id/submit-content) - to'lovni undan oldin chiqarib bo'lmaydi",
      );
    }

    const isBarter = Number(escrow.payoutAmount) === 0 && Number(escrow.depositAmount) !== Number(escrow.amount);

    if (isBarter) {
      // Naqd chiqim yo'q - mahsulot/xizmat allaqachon to'g'ridan-to'g'ri biznesdan kreatorga
      // o'tgan (platformadan tashqarida). Escrow to'g'ridan-to'g'ri yakunlanadi.
      await this.prisma.escrow.update({ where: { id: escrow.id }, data: { status: EscrowStatus.RELEASE_PENDING } });
      await this.logTransition(
        escrow.id,
        EscrowStatus.HELD,
        EscrowStatus.RELEASE_PENDING,
        'Biznes ishni tasdiqladi (Barter - naqd chiqim yo\'q, mahsulot/xizmat to\'g\'ridan-to\'g\'ri berilgan)',
      );
      return this.finalizeRelease(escrow.id, 'BARTER_EXCHANGE_DIRECT', application.creator.userId, 0, escrow.currency, true);
    }

    if (!application.creator.payoutAccount || !application.creator.payoutProvider) {
      throw new BadRequestException(
        'Kreator to\'lov rekvizitlarini (payoutProvider/payoutAccount) hali kiritmagan - chiqim boshlab bo\'lmaydi',
      );
    }

    await this.prisma.escrow.update({ where: { id: escrow.id }, data: { status: EscrowStatus.RELEASE_PENDING } });
    await this.logTransition(escrow.id, EscrowStatus.HELD, EscrowStatus.RELEASE_PENDING, 'Biznes ishni tasdiqladi');

    // Kreator o'zi tanlagan to'lov provayderi orqali to'lanadi (depozit provayderidan farqli bo'lishi mumkin)
    const provider = this.resolveProvider(application.creator.payoutProvider as PaymentProvider);

    const payout = await provider.payout({
      escrowId: escrow.id,
      amount: Number(escrow.payoutAmount),
      cardOrAccount: application.creator.payoutAccount,
      description: `InfluenceX hamkorlik haqi - ${application.creator.name}`,
    });

    // Click uchun payout hamisha 'PENDING' qaytaradi (avtomatik kartaga chiqim API'si yo'q -
    // click.provider.ts izohiga qarang). Bunday holda escrow RELEASE_PENDING'da qoladi,
    // moderator/admin qo'lda to'lagach confirmManualPayout() orqali RELEASED'ga o'tkaziladi.
    if (payout.status !== 'COMPLETED') {
      await this.prisma.escrow.update({
        where: { id: escrow.id },
        data: { payoutReference: payout.providerReference },
      });
      await this.logTransition(
        escrow.id,
        EscrowStatus.RELEASE_PENDING,
        EscrowStatus.RELEASE_PENDING,
        `Avtomatik chiqim mavjud emas (${application.creator.payoutProvider}) - moderator qo'lda to'lashi kerak`,
      );
      await this.telegramBot.notifyUser(
        application.creator.userId,
        `⏳ Hamkorlik haqingiz (<b>${Number(escrow.payoutAmount).toLocaleString()} ${escrow.currency}</b>) tez orada to'lanadi.`,
      );
      return this.prisma.escrow.findUniqueOrThrow({ where: { id: escrow.id } });
    }

    return this.finalizeRelease(
      escrow.id,
      payout.providerReference,
      application.creator.userId,
      Number(escrow.payoutAmount),
      escrow.currency,
    );
  }

  /**
   * Moderator/Admin Click Business ilovasi (yoki bank o'tkazmasi) orqali kreatorga qo'lda
   * to'lov qilgach chaqiradi - RELEASE_PENDING -> RELEASED. Faqat manual to'lov talab
   * qiladigan provayderlar (hozircha Click) uchun kerak.
   */
  async confirmManualPayout(moderatorId: string, escrowId: string, payoutReference?: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { application: { include: { creator: true } } },
    });
    if (!escrow) throw new NotFoundException('Escrow topilmadi');
    if (escrow.status !== EscrowStatus.RELEASE_PENDING) {
      throw new BadRequestException(`Escrow "${escrow.status}" holatida, qo'lda tasdiqlab bo'lmaydi`);
    }

    return this.finalizeRelease(
      escrow.id,
      payoutReference ?? escrow.payoutReference ?? `manual_${moderatorId}_${Date.now()}`,
      escrow.application.creator.userId,
      Number(escrow.payoutAmount),
      escrow.currency,
    );
  }

  private async finalizeRelease(
    escrowId: string,
    payoutReference: string,
    creatorUserId: string,
    payoutAmount: number,
    currency: string,
    isBarter = false,
  ) {
    const released = await this.prisma.escrow.update({
      where: { id: escrowId },
      data: { status: EscrowStatus.RELEASED, payoutReference },
    });
    await this.logTransition(
      escrowId,
      EscrowStatus.RELEASE_PENDING,
      EscrowStatus.RELEASED,
      isBarter
        ? 'Barter hamkorlik yakunlandi (mahsulot/xizmat to\'g\'ridan-to\'g\'ri berilgan, naqd chiqim yo\'q)'
        : "Kreatorga hamkorlik haqi to'landi (InfluenceX xarajati)",
    );
    await this.telegramBot.notifyUser(
      creatorUserId,
      isBarter
        ? `✅ Barter hamkorlik muvaffaqiyatli yakunlandi. Rahmat, InfluenceX bilan ishlaganingiz uchun!`
        : `✅ Hamkorlik haqingiz to'landi: <b>${payoutAmount.toLocaleString()} ${currency}</b>. Rahmat, InfluenceX bilan ishlaganingiz uchun!`,
    );
    return released;
  }

  async refund(userId: string, escrowId: string, note?: string) {
    const escrow = await this.getOwnedByBusiness(userId, escrowId);
    if (![EscrowStatus.HELD, EscrowStatus.AWAITING_DEPOSIT].includes(escrow.status as EscrowStatus)) {
      throw new BadRequestException(`Escrow "${escrow.status}" holatida qaytarib bo'lmaydi`);
    }
    const updated = await this.prisma.escrow.update({ where: { id: escrow.id }, data: { status: EscrowStatus.REFUNDED } });
    await this.logTransition(escrow.id, escrow.status as EscrowStatus, EscrowStatus.REFUNDED, note ?? 'Biznesga qaytarildi');
    return updated;
  }

  async raiseDispute(userId: string, escrowId: string, dto: RaiseDisputeDto) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { application: { include: { campaign: { include: { business: true } }, creator: true } } },
    });
    if (!escrow) throw new NotFoundException('Escrow topilmadi');

    const isBusiness = escrow.application.campaign.business.userId === userId;
    const isCreator = escrow.application.creator.userId === userId;
    if (!isBusiness && !isCreator) throw new ForbiddenException('Bu escrow sizga tegishli emas');

    if (![EscrowStatus.HELD, EscrowStatus.RELEASE_PENDING].includes(escrow.status as EscrowStatus)) {
      throw new BadRequestException(`"${escrow.status}" holatidagi escrow uchun nizo ochib bo'lmaydi`);
    }

    await this.prisma.escrow.update({ where: { id: escrow.id }, data: { status: EscrowStatus.DISPUTED } });
    await this.logTransition(escrow.id, escrow.status as EscrowStatus, EscrowStatus.DISPUTED, `Nizo ochildi: ${dto.reason}`, userId);

    const otherPartyUserId = isBusiness ? escrow.application.creator.userId : escrow.application.campaign.business.userId;
    await this.telegramBot.notifyUser(
      otherPartyUserId,
      `⚠️ "<b>${escrow.application.campaign.title}</b>" kampaniyasi bo'yicha nizo ochildi. Moderator ko'rib chiqmoqda.`,
    );

    return this.prisma.dispute.create({
      data: {
        escrowId: escrow.id,
        raisedByUserId: userId,
        reason: dto.reason,
        evidenceUrls: dto.evidenceUrls ?? [],
        status: DisputeStatus.OPEN,
      },
    });
  }

  // Faqat Moderator/Admin (guard controller darajasida tekshiriladi)
  async resolveDispute(moderatorId: string, escrowId: string, dto: ResolveDisputeDto) {
    const dispute = await this.prisma.dispute.findUnique({ where: { escrowId } });
    if (!dispute) throw new NotFoundException('Nizo topilmadi');

    const escrow = await this.prisma.escrow.findUniqueOrThrow({ where: { id: escrowId } });
    const finalEscrowStatus =
      dto.resolution === DisputeStatus.RESOLVED_CREATOR ? EscrowStatus.RELEASED : EscrowStatus.REFUNDED;

    await this.prisma.escrow.update({ where: { id: escrowId }, data: { status: finalEscrowStatus } });
    await this.logTransition(
      escrowId,
      EscrowStatus.DISPUTED,
      finalEscrowStatus,
      `Moderator qarori: ${dto.resolution} — ${dto.resolutionNote ?? ''}`,
      moderatorId,
    );

    const resolvedApplication = await this.prisma.campaignApplication.findUnique({
      where: { id: escrow.applicationId },
      include: { creator: true, campaign: { include: { business: true } } },
    });
    if (resolvedApplication) {
      const outcomeText =
        dto.resolution === DisputeStatus.RESOLVED_CREATOR
          ? 'kreator foydasiga (to\'lov chiqarildi)'
          : 'biznes foydasiga (mablag\' qaytarildi)';
      const notifyText = `⚖️ "<b>${resolvedApplication.campaign.title}</b>" bo'yicha nizo hal qilindi: ${outcomeText}.`;
      await this.telegramBot.notifyUser(resolvedApplication.creator.userId, notifyText);
      await this.telegramBot.notifyUser(resolvedApplication.campaign.business.userId, notifyText);
    }

    return this.prisma.dispute.update({
      where: { escrowId },
      data: {
        status: dto.resolution,
        resolutionNote: dto.resolutionNote,
        moderatorId,
        resolvedAt: new Date(),
      },
    });
  }

  private async getOwnedByBusiness(userId: string, escrowId: string) {
    const escrow = await this.prisma.escrow.findUnique({
      where: { id: escrowId },
      include: { application: { include: { campaign: { include: { business: true } } } } },
    });
    if (!escrow) throw new NotFoundException('Escrow topilmadi');
    if (escrow.application.campaign.business.userId !== userId) {
      throw new ForbiddenException('Bu escrow sizning kampaniyangizga tegishli emas');
    }
    return escrow;
  }

  private async logTransition(
    escrowId: string,
    fromStatus: EscrowStatus | null,
    toStatus: EscrowStatus,
    note?: string,
    actorUserId?: string,
  ) {
    await this.prisma.escrowTransaction.create({
      data: { escrowId, fromStatus: fromStatus ?? undefined, toStatus, note, actorUserId },
    });
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Click sign_time formati odatda "YYYY-MM-DD HH:mm:ss" (server vaqti, UTC+5 Toshkent).
// Ruxsat etilgan chetlanish: +-15 daqiqa (tarmoq kechikishi + server soat farqiga joy
// qoldiradi, lekin qo'lga tushirilgan so'rovni soatlab/kunlab qayta yuborishning oldini oladi).
const CLICK_SIGN_TIME_TOLERANCE_MS = 15 * 60 * 1000;

function isClickSignTimeFresh(signTime: string | undefined): boolean {
  if (!signTime) return false;
  const normalized = signTime.includes('T') ? signTime : signTime.replace(' ', 'T');
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return false;
  return Math.abs(Date.now() - parsed) <= CLICK_SIGN_TIME_TOLERANCE_MS;
}
