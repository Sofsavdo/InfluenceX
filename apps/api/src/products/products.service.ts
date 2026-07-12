import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CampaignStatus, CollaborationModel, ContentType } from '@influencex/shared';

const DEFAULT_PRODUCT_CAMPAIGN_CREATORS = 20;
// Mahsulot katalogi kampaniyasi "evergreen" - alohida biznes tomonidan yopilmaguncha ochiq
// turadi. Deadline maydoni Campaign modelida majburiy bo'lgani uchun uzoq muddat qo'yiladi.
const PRODUCT_CAMPAIGN_LIFETIME_DAYS = 365;

/**
 * PRD kelajak reja "Shop Integrations" - YENGIL versiya (2026-07-12, mahsulot katalogi
 * strategiya suhbatidan keyin qo'shildi).
 *
 * MUHIM CHEGARA: bu TO'LIQ onlayn do'kon/domain ulash EMAS. InfluenceX bu yerda checkout,
 * inventar, yetkazib berish yoki to'lov uchun tovar QABUL QILMAYDI - bu butunlay boshqa
 * mahsulot toifasi (Shopify darajasidagi murakkablik) bo'lardi va InfluenceX'ning asosiy
 * yo'nalishi (creator-biznes marketplace)dan chalg'itadi.
 *
 * Buning o'rniga: biznes mahsulot/xizmat ro'yxatini yuklaydi (nom, narx, TASHQI havola -
 * Uzum Market e'loni, Instagram/Telegram do'koni yoki o'z sayti). "Blogerlarga ko'rinsin"
 * belgisi yoqilganda, mavjud CPA kampaniya infratuzilmasi (Campaign/CampaignApplication/
 * Conversion/Escrow) to'liq qayta ishlatilib, avtomatik PUBLISHED CPA kampaniya yaratiladi -
 * bloger creator feedida (campaigns.service.ts#findPublic) oddiy kampaniya sifatida ko'radi
 * va zayavka beradi, xuddi qo'lda yozilgan brifga o'xshab.
 */
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignsService: CampaignsService,
  ) {}

  private async getBusiness(userId: string) {
    const business = await this.prisma.businessProfile.findUnique({ where: { userId } });
    if (!business) throw new ForbiddenException("Avval biznes profilini to'ldiring");
    return business;
  }

  async create(userId: string, dto: CreateProductDto) {
    const business = await this.getBusiness(userId);
    return this.prisma.product.create({
      data: {
        businessId: business.id,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        price: dto.price,
        currency: dto.currency ?? 'UZS',
        externalUrl: dto.externalUrl,
        cpaRate: dto.cpaRate,
        contentType: (dto.contentType ?? ContentType.REEL) as any,
      },
    });
  }

  async listMine(userId: string) {
    const business = await this.prisma.businessProfile.findUnique({ where: { userId } });
    if (!business) return [];
    return this.prisma.product.findMany({
      where: { businessId: business.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getOwned(userId: string, productId: string) {
    const business = await this.getBusiness(userId);
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.businessId !== business.id) {
      throw new NotFoundException('Mahsulot topilmadi yoki sizga tegishli emas');
    }
    return product;
  }

  async update(userId: string, productId: string, dto: UpdateProductDto) {
    await this.getOwned(userId, productId);
    return this.prisma.product.update({
      where: { id: productId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.externalUrl !== undefined ? { externalUrl: dto.externalUrl } : {}),
        ...(dto.cpaRate !== undefined ? { cpaRate: dto.cpaRate } : {}),
        ...(dto.contentType !== undefined ? { contentType: dto.contentType as any } : {}),
      },
    });
  }

  // "Blogerlarga ko'rinsin" (2026-07-12): birinchi marta yoqilganda yangi CPA kampaniya
  // avtomatik yaratiladi va nashr etiladi (subscription-plan faol-kampaniya limiti
  // campaignsService.updateStatus() orqali qayta ishlatiladi - bu yerda alohida yozilmagan).
  // Keyingi marotaba faqat mavjud kampaniyaning PUBLISHED<->DRAFT holati almashtiriladi -
  // allaqachon ACCEPTED bo'lgan zayavka/escrow'lar tegilmaydi, ular o'z holatida davom etadi.
  async setVisibility(userId: string, productId: string, visible: boolean) {
    const product = await this.getOwned(userId, productId);

    if (!product.linkedCampaignId) {
      if (!visible) {
        return this.prisma.product.update({ where: { id: productId }, data: { visibleToCreators: false } });
      }

      const deadline = new Date(Date.now() + PRODUCT_CAMPAIGN_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
      const campaign = await this.campaignsService.create(userId, {
        title: product.name,
        description: product.description || `${product.name} - mahsulotlar katalogidan CPA kampaniyasi`,
        productOrService: product.name,
        objective: "Mahsulot sotuvini CPA (referal havola) orqali oshirish",
        contentType: product.contentType as any,
        collaborationModel: CollaborationModel.CPA as any,
        // Budget - CPA kampaniyalarda qattiq cheklov emas, faqat axborot uchun (haqiqiy
        // xarajat har bir tasdiqlangan konversiyada cpaRate bo'yicha hisoblanadi).
        budget: Number(product.cpaRate) * 100,
        creatorsCount: DEFAULT_PRODUCT_CAMPAIGN_CREATORS,
        deadline: deadline.toISOString(),
        cpaRate: Number(product.cpaRate),
        landingUrl: product.externalUrl,
      } as any);

      await this.prisma.campaign.update({
        where: { id: campaign.id },
        data: { isProductListing: true },
      });
      await this.campaignsService.updateStatus(userId, campaign.id, {
        status: CampaignStatus.PUBLISHED as any,
      } as any);

      return this.prisma.product.update({
        where: { id: productId },
        data: { visibleToCreators: true, linkedCampaignId: campaign.id },
      });
    }

    await this.campaignsService.updateStatus(userId, product.linkedCampaignId, {
      status: (visible ? CampaignStatus.PUBLISHED : CampaignStatus.DRAFT) as any,
    } as any);

    return this.prisma.product.update({
      where: { id: productId },
      data: { visibleToCreators: visible },
    });
  }

  // Mahsulotni o'chirish - agar unga bog'liq kampaniyaga allaqachon zayavka berilgan bo'lsa
  // (moliyaviy/hamkorlik tarixi mavjud), o'chirishga ruxsat berilmaydi - buning o'rniga
  // "Blogerlarga ko'rinsin"ni o'chirish tavsiya etiladi (tarix saqlanib qoladi).
  async remove(userId: string, productId: string) {
    const product = await this.getOwned(userId, productId);

    if (product.linkedCampaignId) {
      const applicationsCount = await this.prisma.campaignApplication.count({
        where: { campaignId: product.linkedCampaignId },
      });
      if (applicationsCount > 0) {
        throw new BadRequestException(
          'Bu mahsulotga allaqachon blogerlar zayavka bergan - o\'chirib bo\'lmaydi. ' +
            'Buning o\'rniga "Blogerlarga ko\'rinsin" belgisini o\'chiring.',
        );
      }
    }

    const linkedCampaignId = product.linkedCampaignId;
    const deleted = await this.prisma.product.delete({ where: { id: productId } });
    if (linkedCampaignId) {
      await this.prisma.campaign.delete({ where: { id: linkedCampaignId } });
    }
    return deleted;
  }
}
