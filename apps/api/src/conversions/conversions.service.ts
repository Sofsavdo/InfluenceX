import { BadRequestException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplicationStatus,
  CollaborationModel,
  ConversionSource,
  ConversionStatus,
  PLATFORM_COMMISSION_RATES,
} from '@influencex/shared';
import { ReportConversionDto } from './dto/report-conversion.dto';
import { WebhookConversionDto } from './dto/webhook-conversion.dto';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

// Webhook imzosi qabul qilinadigan vaqt oynasi (Click uchun ishlatilgan xuddi shu
// naqsh - escrow.service.ts#isClickSignTimeFresh). Qo'lga tushirilgan so'rovni soatlab/
// kunlab qayta yuborishning oldini oladi.
const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 15 * 60 * 1000;

/**
 * PRD "CPA (Cost Per Action)" va "Hybrid" hamkorlik modellari - 2026-07-11 qo'shildi.
 *
 * Escrow'dagi kabi huquqiy naqsh takrorlanadi: bu yerda ham InfluenceX uchinchi shaxs
 * mablag'ini custody QILMAYDI. Konversiya - bu biznes tomonidan qayd etilgan haqiqiy
 * savdo/lid hodisasi (masalan Google Analytics/CRM'da ko'rilgan buyurtma) uchun
 * InfluenceX'ning o'z hamkori (kreator)ga to'lashi kerak bo'lgan mablag'. Click'da
 * avtomatik chiqim API'si yo'qligi sababli (escrow.service.ts bilan bir xil cheklov),
 * PENDING -> CONFIRMED (biznes tasdiqlagach) -> markPaid() (moderator qo'lda to'laydi).
 */
@Injectable()
export class ConversionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramBot: TelegramBotService,
  ) {}

  private async getApplicationForBusiness(userId: string, applicationId: string) {
    const application = await this.prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: { creator: true, campaign: { include: { business: true } } },
    });
    if (!application) throw new NotFoundException('Zayavka topilmadi');
    if (application.campaign.business.userId !== userId) {
      throw new ForbiddenException('Bu zayavka sizning kampaniyangizga tegishli emas');
    }
    return application;
  }

  async report(userId: string, applicationId: string, dto: ReportConversionDto) {
    const application = await this.getApplicationForBusiness(userId, applicationId);

    if (application.status !== ApplicationStatus.ACCEPTED) {
      throw new BadRequestException('Faqat qabul qilingan zayavka uchun konversiya qayd etish mumkin');
    }
    const model = application.campaign.collaborationModel as CollaborationModel;
    if (model !== CollaborationModel.CPA && model !== CollaborationModel.HYBRID) {
      throw new BadRequestException(
        `Bu kampaniya "${model}" modelida - konversiya faqat CPA yoki HYBRID kampaniyalar uchun qayd etiladi`,
      );
    }

    const platformFee = round2(dto.amount * PLATFORM_COMMISSION_RATES.CPA);
    const payoutAmount = round2(dto.amount - platformFee);

    const conversion = await this.prisma.conversion.create({
      data: {
        applicationId,
        type: dto.type,
        amount: dto.amount,
        platformFee,
        payoutAmount,
        trackingRef: dto.trackingRef,
        note: dto.note,
        status: ConversionStatus.PENDING,
        // 2026-07-12: bu yo'l - biznes o'zi qo'lda kiritadi - eng zaif ishonch darajasi
        // (ConversionSource izohiga qarang). Aniq belgilab qo'yilgan, defaultga suyanmaydi.
        source: ConversionSource.SELF_REPORTED as any,
      },
    });

    await this.telegramBot.notifyUser(
      application.creator.userId,
      `📈 "<b>${application.campaign.title}</b>" kampaniyasida yangi konversiya qayd etildi (<b>${dto.amount.toLocaleString()} ${application.campaign.currency}</b>). Biznes tasdiqlagach, hamkorlik haqingiz chiqariladi.`,
    );

    return conversion;
  }

  /**
   * CPA atributsiya - "WEBHOOK" darajasi (2026-07-12, eng ishonchli avtomatik mexanizm -
   * strategiya suhbatida qaror qilingan "biznesning o'z tizimi hodisa sodir bo'lganda
   * signal beradi" yechimi). Biznesning o'z serveri sotuv/obuna yakunlanganda bu endpoint'ga
   * so'rov yuboradi. Click webhook'idagi kabi (click.provider.ts) - maydonlarni birlashtirib
   * SHA-256 bilan imzolanadi, raw-body HMAC emas.
   *
   * MUHIM: bu ham 100% "yolg'ondan himoyalangan" degani emas - biznes o'z backend'ida
   * qaysi hodisani yuborish/yubormaslikni tanlashi mumkin. Lekin (1) avtomatik/hodisaga
   * asoslangan bo'lgani uchun "keyinroq unutib qoldim" holatini yo'qotadi, (2) tasdiqlash
   * bosqichini o'tkazib yuborib CONFIRMED holatida to'g'ridan-to'g'ri yaratiladi - biznes
   * "PENDING"da ushlab turib vaqtni cho'zolmaydi, (3) audit uchun vaqt tamg'ali yozuv qoldiradi.
   */
  async reportViaWebhook(campaignId: string, dto: WebhookConversionDto) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) throw new NotFoundException('Kampaniya topilmadi');
    if (!campaign.webhookSecret) {
      throw new BadRequestException("Bu kampaniya uchun webhook yoqilmagan");
    }

    if (!this.isWebhookTimestampFresh(dto.timestamp)) {
      throw new UnauthorizedException("So'rov muddati o'tgan (timestamp juda eski)");
    }

    const expectedSignature = this.signWebhookPayload(campaignId, dto, campaign.webhookSecret);
    if (!this.timingSafeCompare(expectedSignature, dto.signature)) {
      throw new UnauthorizedException("Imzo mos kelmadi");
    }

    const application = await this.prisma.campaignApplication.findFirst({
      where: { campaignId, referralCode: dto.referralCode, status: ApplicationStatus.ACCEPTED },
      include: { creator: true, campaign: true },
    });
    if (!application) {
      throw new NotFoundException("referralCode bo'yicha qabul qilingan zayavka topilmadi");
    }

    const model = application.campaign.collaborationModel as CollaborationModel;
    if (model !== CollaborationModel.CPA && model !== CollaborationModel.HYBRID) {
      throw new BadRequestException(`Bu kampaniya "${model}" modelida - webhook faqat CPA/HYBRID uchun`);
    }

    const platformFee = round2(dto.amount * PLATFORM_COMMISSION_RATES.CPA);
    const payoutAmount = round2(dto.amount - platformFee);

    const conversion = await this.prisma.conversion.create({
      data: {
        applicationId: application.id,
        type: dto.type,
        amount: dto.amount,
        platformFee,
        payoutAmount,
        trackingRef: dto.externalRef,
        status: ConversionStatus.CONFIRMED,
        source: ConversionSource.WEBHOOK as any,
        confirmedAt: new Date(),
      },
    });

    await this.telegramBot.notifyUser(
      application.creator.userId,
      `⚡ "<b>${application.campaign.title}</b>" kampaniyasida avtomatik tasdiqlangan konversiya (<b>${dto.amount.toLocaleString()} ${application.campaign.currency}</b>). Hamkorlik haqingiz tez orada to'lanadi.`,
    );

    return conversion;
  }

  private signWebhookPayload(campaignId: string, dto: WebhookConversionDto, secret: string): string {
    const raw = `${campaignId}:${dto.referralCode}:${dto.type}:${dto.amount}:${dto.timestamp}:${secret}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  private timingSafeCompare(expected: string, actual: string): boolean {
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(actual, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  private isWebhookTimestampFresh(timestamp: string): boolean {
    const normalized = timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T');
    const parsed = Date.parse(normalized);
    if (Number.isNaN(parsed)) return false;
    return Math.abs(Date.now() - parsed) <= WEBHOOK_TIMESTAMP_TOLERANCE_MS;
  }

  private async getConversionForBusiness(userId: string, conversionId: string) {
    const conversion = await this.prisma.conversion.findUnique({
      where: { id: conversionId },
      include: { application: { include: { creator: true, campaign: { include: { business: true } } } } },
    });
    if (!conversion) throw new NotFoundException('Konversiya topilmadi');
    if (conversion.application.campaign.business.userId !== userId) {
      throw new ForbiddenException('Bu konversiya sizga tegishli emas');
    }
    return conversion;
  }

  async confirm(userId: string, conversionId: string) {
    const conversion = await this.getConversionForBusiness(userId, conversionId);
    if (conversion.status !== ConversionStatus.PENDING) {
      throw new BadRequestException(`Konversiya "${conversion.status}" holatida, tasdiqlab bo'lmaydi`);
    }

    const updated = await this.prisma.conversion.update({
      where: { id: conversionId },
      data: { status: ConversionStatus.CONFIRMED, confirmedAt: new Date() },
    });

    await this.telegramBot.notifyUser(
      conversion.application.creator.userId,
      `✅ Konversiyangiz tasdiqlandi. Hamkorlik haqingiz (<b>${Number(conversion.payoutAmount).toLocaleString()} ${conversion.application.campaign.currency}</b>) tez orada to'lanadi.`,
    );

    return updated;
  }

  async reject(userId: string, conversionId: string, note?: string) {
    const conversion = await this.getConversionForBusiness(userId, conversionId);
    if (conversion.status !== ConversionStatus.PENDING) {
      throw new BadRequestException(`Konversiya "${conversion.status}" holatida, rad etib bo'lmaydi`);
    }

    return this.prisma.conversion.update({
      where: { id: conversionId },
      data: { status: ConversionStatus.REJECTED, note: note ?? conversion.note },
    });
  }

  // Moderator/Admin Click Business ilovasi (yoki bank o'tkazmasi) orqali qo'lda to'lagach
  // chaqiradi - xuddi EscrowService.confirmManualPayout() bilan bir xil naqsh.
  async markPaid(conversionId: string, payoutReference?: string) {
    const conversion = await this.prisma.conversion.findUnique({
      where: { id: conversionId },
      include: { application: { include: { creator: true, campaign: true } } },
    });
    if (!conversion) throw new NotFoundException('Konversiya topilmadi');
    if (conversion.status !== ConversionStatus.CONFIRMED) {
      throw new BadRequestException(`Faqat "CONFIRMED" konversiyalarni to'langan deb belgilash mumkin`);
    }
    if (conversion.paidAt) {
      throw new BadRequestException('Bu konversiya allaqachon to\'langan deb belgilangan');
    }

    const updated = await this.prisma.conversion.update({
      where: { id: conversionId },
      data: { paidAt: new Date(), payoutReference: payoutReference ?? `manual_${Date.now()}` },
    });

    await this.telegramBot.notifyUser(
      conversion.application.creator.userId,
      `💸 Konversiya uchun hamkorlik haqingiz (<b>${Number(conversion.payoutAmount).toLocaleString()} ${conversion.application.campaign.currency}</b>) to'landi.`,
    );

    return updated;
  }

  // Biznes yoki kreator (zayavka egasi) - ikkalasi ham o'z zayavkasidagi konversiyalarni ko'ra oladi.
  async listForApplication(userId: string, applicationId: string) {
    const application = await this.prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: { creator: true, campaign: { include: { business: true } } },
    });
    if (!application) throw new NotFoundException('Zayavka topilmadi');
    const isBusiness = application.campaign.business.userId === userId;
    const isCreator = application.creator.userId === userId;
    if (!isBusiness && !isCreator) {
      throw new ForbiddenException('Bu zayavka sizga tegishli emas');
    }

    return this.prisma.conversion.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Admin panel uchun: hali to'lanmagan (CONFIRMED, paidAt=null) konversiyalar navbati.
  listUnpaidForAdmin() {
    return this.prisma.conversion.findMany({
      where: { status: ConversionStatus.CONFIRMED, paidAt: null },
      include: {
        application: { include: { creator: true, campaign: { include: { business: true } } } },
      },
      orderBy: { confirmedAt: 'asc' },
    });
  }

  // PRD workflow: kreator o'z havolasini (masalan bio'sida) tarqatadi, u
  // /track/:applicationId orqali campaign.landingUrl'ga yo'naltiriladi - shu yerda
  // clickCount oshiriladi (haqiqiy trafik o'lchovi, CPA konversiya darajasini hisoblash uchun).
  async trackClick(applicationId: string): Promise<string> {
    const application = await this.prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: { campaign: true },
    });
    if (!application) throw new NotFoundException('Zayavka topilmadi');
    if (!application.campaign.landingUrl) {
      throw new BadRequestException('Bu kampaniya uchun landing sahifa (landingUrl) belgilanmagan');
    }

    await this.prisma.campaignApplication.update({
      where: { id: applicationId },
      data: { clickCount: { increment: 1 } },
    });

    return application.campaign.landingUrl;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
