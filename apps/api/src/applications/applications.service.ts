import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationStatus, CampaignStatus, EscrowStatus } from '@influencex/shared';
import { SubmitContentDto } from './dto/submit-content.dto';
import { EscrowService } from '../escrow/escrow.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';

/**
 * PRD v2 §4.3 kampaniya oqimi:
 * 1. Kreator zayavka beradi (PENDING)
 * 2. Biznes ko'rib chiqadi va ACCEPTED/REJECTED qiladi
 * 3. ACCEPTED bo'lganda -> Escrow avtomatik AWAITING_DEPOSIT holatida yaratiladi + chat thread ochiladi
 */
@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
    private readonly telegramBot: TelegramBotService,
  ) {}

  async apply(userId: string, dto: CreateApplicationDto) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException('Avval kreator profilini to\'ldiring');

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: dto.campaignId },
      include: { business: true },
    });
    if (!campaign || campaign.status !== CampaignStatus.PUBLISHED) {
      throw new NotFoundException('Kampaniya topilmadi yoki hozircha ochiq emas');
    }

    const existing = await this.prisma.campaignApplication.findUnique({
      where: { campaignId_creatorId: { campaignId: dto.campaignId, creatorId: creator.id } },
    });
    if (existing) throw new ConflictException('Siz bu kampaniyaga allaqachon zayavka bergansiz');

    const application = await this.prisma.campaignApplication.create({
      data: {
        campaignId: dto.campaignId,
        creatorId: creator.id,
        message: dto.message,
        proposedPrice: dto.proposedPrice,
        status: ApplicationStatus.PENDING,
      },
    });

    await this.telegramBot.notifyUser(
      campaign.business.userId,
      `📩 Yangi zayavka: <b>${creator.name}</b> "<b>${campaign.title}</b>" kampaniyasiga zayavka berdi.`,
    );

    return application;
  }

  async findForCampaign(userId: string, campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { business: true },
    });
    if (!campaign) throw new NotFoundException('Kampaniya topilmadi');
    if (campaign.business.userId !== userId) {
      throw new ForbiddenException('Bu kampaniya sizga tegishli emas');
    }
    return this.prisma.campaignApplication.findMany({
      where: { campaignId },
      include: { creator: true, escrow: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findMineAsCreator(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) return [];
    return this.prisma.campaignApplication.findMany({
      where: { creatorId: creator.id },
      // "business.userId" 2026-07-12'da qo'shildi - Reputation System UI (RatingForm.tsx)
      // kreator escrow RELEASED bo'lgach biznesni baholashi uchun uning userId'sini bilishi
      // kerak. Boshqa maydonlar oshkor qilinmaydi (faqat userId + companyName).
      include: {
        campaign: { include: { business: { select: { userId: true, companyName: true } } } },
        escrow: true,
        chatThread: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(userId: string, applicationId: string, status: ApplicationStatus) {
    const application = await this.prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: { campaign: { include: { business: true } }, creator: true },
    });
    if (!application) throw new NotFoundException('Zayavka topilmadi');
    if (application.campaign.business.userId !== userId) {
      throw new ForbiddenException('Bu zayavka sizga tegishli kampaniyaga tegishli emas');
    }

    const updated = await this.prisma.campaignApplication.update({
      where: { id: applicationId },
      data: { status },
    });

    if (status === ApplicationStatus.ACCEPTED) {
      // PRD v2 §4.3-4.5: qabul qilinganda escrow (AWAITING_DEPOSIT) va chat thread avtomatik ochiladi
      await this.escrowService.createForApplication(applicationId);
      await this.prisma.chatThread.upsert({
        where: { applicationId },
        create: { applicationId },
        update: {},
      });
      await this.telegramBot.notifyUser(
        application.creator.userId,
        `✅ Tabriklaymiz! "<b>${application.campaign.title}</b>" kampaniyasiga zayavkangiz qabul qilindi.`,
      );
    } else if (status === ApplicationStatus.REJECTED) {
      await this.telegramBot.notifyUser(
        application.creator.userId,
        `❌ "<b>${application.campaign.title}</b>" kampaniyasiga zayavkangiz rad etildi.`,
      );
    }

    return updated;
  }

  // PRD v2 §4.3 workflow 8-9: "Creator submits content -> Business approves" - bu bosqich
  // avval umuman yo'q edi (biznes kontent yuborilganmi-yo'qmi tekshirmasdan ham to'lovni
  // chiqara olardi). Endi escrow.service.ts#approveAndRelease shu maydonni talab qiladi.
  async submitContent(userId: string, applicationId: string, dto: SubmitContentDto) {
    const application = await this.prisma.campaignApplication.findUnique({
      where: { id: applicationId },
      include: { creator: true, campaign: { include: { business: true } }, escrow: true },
    });
    if (!application) throw new NotFoundException('Zayavka topilmadi');
    if (application.creator.userId !== userId) {
      throw new ForbiddenException('Bu zayavka sizga tegishli emas');
    }
    if (application.status !== ApplicationStatus.ACCEPTED) {
      throw new ConflictException('Faqat qabul qilingan zayavka uchun kontent yuborish mumkin');
    }
    if (!application.escrow || application.escrow.status !== EscrowStatus.HELD) {
      throw new ConflictException(
        "Biznes to'lovni hali tasdiqlamagan (escrow HELD emas) - kontent yuborishdan oldin kutib turing",
      );
    }

    const updated = await this.prisma.campaignApplication.update({
      where: { id: applicationId },
      data: { contentSubmittedAt: new Date(), contentUrls: dto.contentUrls, contentNote: dto.note },
    });

    await this.telegramBot.notifyUser(
      application.campaign.business.userId,
      `🎬 "<b>${application.creator.name}</b>" "<b>${application.campaign.title}</b>" kampaniyasi uchun kontent yubordi. Ko'rib chiqib, to'lovni chiqarishingiz mumkin.`,
    );

    return updated;
  }
}
