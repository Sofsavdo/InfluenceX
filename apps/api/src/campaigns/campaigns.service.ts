import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignStatusDto } from './dto/update-campaign-status.dto';
import { CampaignStatus, SUBSCRIPTION_PLAN_LIMITS, SubscriptionPlan } from '@influencex/shared';

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 20;
const ACTIVE_STATUSES: CampaignStatus[] = [CampaignStatus.PUBLISHED, CampaignStatus.IN_PROGRESS];

// XAVFSIZLIK (2026-07-12): Campaign.webhookSecret (conversions webhook imzosi uchun) hech
// qachon PUBLIC endpoint javobida chiqmasligi kerak - aks holda kampaniya ID'sini bilgan
// istalgan kishi soxta "konversiya" webhook so'rovlarini imzolab yubora oladi. findPublic()/
// findOne() Prisma'da top-darajali `select` ishlatmagani uchun (barcha skalyar maydonlarni
// qaytaradi), bu funksiya har ikkalasida ham natijadan olib tashlaydi. Biznesning o'zi buni
// findMineAsBusiness() (TelegramAuthGuard, businessId bo'yicha egalik tekshiruvi bilan) orqali ko'radi.
function stripWebhookSecret<T extends { webhookSecret?: string | null }>(campaign: T): Omit<T, 'webhookSecret'> {
  const { webhookSecret: _webhookSecret, ...rest } = campaign;
  return rest;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCampaignDto) {
    const business = await this.prisma.businessProfile.findUnique({ where: { userId } });
    if (!business) {
      throw new ForbiddenException('Avval biznes profilini to\'ldiring');
    }

    return this.prisma.campaign.create({
      data: {
        businessId: business.id,
        title: dto.title,
        description: dto.description,
        productOrService: dto.productOrService,
        objective: dto.objective,
        contentType: dto.contentType,
        collaborationModel: dto.collaborationModel,
        budget: dto.budget,
        currency: dto.currency ?? 'UZS',
        creatorsCount: dto.creatorsCount,
        deadline: new Date(dto.deadline),
        requirements: (dto.requirements ?? {}) as any,
        status: CampaignStatus.DRAFT,
        cpaRate: dto.cpaRate,
        landingUrl: dto.landingUrl,
      },
    });
  }

  // PRD v2 §4.3: kampaniya oqimi - DRAFT -> PUBLISHED -> IN_PROGRESS -> COMPLETED/CANCELLED
  // PRD "Subscription Plans" (2026-07-11): DRAFT/COMPLETED/CANCELLED'dan PUBLISHED yoki
  // IN_PROGRESS'ga o'tishda biznesning tarif rejasi bo'yicha "faol kampaniya" limiti
  // tekshiriladi (Starter=3, Growth=20, Pro=cheksiz). Bu haqiqiy monetizatsiya bosqichi -
  // limit oshsa biznes tarifni oshirishga undaladi.
  async updateStatus(userId: string, campaignId: string, dto: UpdateCampaignStatusDto) {
    const business = await this.prisma.businessProfile.findUnique({ where: { userId } });
    if (!business) throw new ForbiddenException('Biznes profili topilmadi');

    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.businessId !== business.id) {
      throw new NotFoundException('Kampaniya topilmadi yoki sizga tegishli emas');
    }

    const becomingActive = ACTIVE_STATUSES.includes(dto.status) && !ACTIVE_STATUSES.includes(campaign.status as any);
    if (becomingActive) {
      const limit = SUBSCRIPTION_PLAN_LIMITS[business.subscriptionPlan as SubscriptionPlan];
      if (limit !== null) {
        const activeCount = await this.prisma.campaign.count({
          where: { businessId: business.id, status: { in: ACTIVE_STATUSES }, id: { not: campaignId } },
        });
        if (activeCount >= limit) {
          throw new BadRequestException(
            `Tarif rejangiz ("${business.subscriptionPlan}") bo'yicha faol kampaniyalar limiti (${limit}) to'ldi. ` +
              `Yangi kampaniyani faollashtirish uchun tarifni oshiring (PATCH /users/me/subscription-plan) yoki boshqa faol kampaniyani yakunlang.`,
          );
        }
      }
    }

    return this.prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: dto.status },
    });
  }

  // Ommaviy feed — faqat PUBLISHED holatidagi kampaniyalar, kreatorlar uchun (Mini App "Kampaniyalar" ekrani).
  // Sahifalash (pagination) majburiy: feed cheksiz o'sishi mumkin, hammasini bir so'rovda
  // qaytarish katalog kattalashganda API'ni sekinlashtiradi (2026-07-11 unumdorlik tuzatishi).
  // PRD "Featured Placement" (2026-07-11): muddati o'tgan "featured" belgilari avtomatik
  // tozalanadi (o'z-o'zini davolash), so'ng isFeatured=true kampaniyalar feedning tepasida chiqadi.
  async findPublic(filters: {
    contentType?: string;
    collaborationModel?: string;
    page?: number;
    pageSize?: number;
  }): Promise<PaginatedResult<any>> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(Math.max(1, filters.pageSize ?? DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);

    await this.prisma.campaign.updateMany({
      where: { isFeatured: true, featuredUntil: { lt: new Date() } },
      data: { isFeatured: false },
    });

    const where = {
      status: CampaignStatus.PUBLISHED,
      ...(filters.contentType ? { contentType: filters.contentType as any } : {}),
      ...(filters.collaborationModel ? { collaborationModel: filters.collaborationModel as any } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.campaign.findMany({
        where,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        include: { business: { select: { companyName: true, logoUrl: true, businessScore: true } } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return {
      items: items.map(stripWebhookSecret),
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  // Xavfsizlik (2026-07-11 tuzatish): bu endpoint himoyasiz/ochiq (kreator zayavka berishdan
  // oldin kampaniyani ko'rish uchun ham kerak), shuning uchun zayavkachilarning shaxsiy
  // ma'lumotlarini (ism, taklif narxi) o'z ichiga OLMAYDI - buni faqat kampaniya egasi
  // biznes GET /applications/campaign/:id (himoyalangan) orqali ko'radi.
  async findOne(campaignId: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        business: { select: { companyName: true, logoUrl: true, businessScore: true, verificationStatus: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!campaign) throw new NotFoundException('Kampaniya topilmadi');
    return stripWebhookSecret(campaign);
  }

  // PRD Business Dashboard "Active Campaigns" - biznesning o'z kampaniyalari ro'yxati
  // (DRAFT holatidagilar ham shu yerda ko'rinadi - ular ommaviy feedda ko'rinmaydi).
  async findMineAsBusiness(userId: string) {
    const business = await this.prisma.businessProfile.findUnique({ where: { userId } });
    if (!business) return [];
    return this.prisma.campaign.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { applications: true } } },
    });
  }

  // PRD "Featured Placement": "Businesses can promote campaigns" - 2026-07-11 qo'shildi.
  // MUHIM: hozircha o'z-o'zidan xizmat (self-service) sifatida amalga oshirilgan - haqiqiy
  // to'lov undirish (Click orqali) kelajakda escrow.service.ts'dagi kabi alohida invoys
  // oqimi sifatida qo'shilishi mumkin. Bu Payme/Uzum stub'lari uchun qabul qilingan
  // yondashuvga mos: funksionallik ishlaydi, lekin to'lov integratsiyasi hali qo'shilmagan
  // ekanligi ochiq va halol tarzda hujjatlashtirilgan.
  async feature(userId: string, campaignId: string, days: number) {
    const business = await this.prisma.businessProfile.findUnique({ where: { userId } });
    if (!business) throw new ForbiddenException('Biznes profili topilmadi');
    const campaign = await this.prisma.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign || campaign.businessId !== business.id) {
      throw new NotFoundException('Kampaniya topilmadi yoki sizga tegishli emas');
    }

    const featuredUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.prisma.campaign.update({
      where: { id: campaignId },
      data: { isFeatured: true, featuredUntil },
    });
  }
}
