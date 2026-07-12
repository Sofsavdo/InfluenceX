import { BadRequestException, ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRatingDto } from './dto/create-rating.dto';

/**
 * PRD v1 Reputatsiya tizimi: Creator Score / Business Score (0-100).
 * MVP'da soddalashtirilgan formula: reyting o'rtachasi (1-5) asosida creatorScore/businessScore
 * 0-100 shkalaga proporsional o'tkaziladi. Faza 2'da to'liq formula (engagement, completion rate,
 * success rate, activity kabi omillar bilan) qo'shiladi.
 *
 * XAVFSIZLIK TUZATISHI (2026-07-12, to'liq audit paytida topildi): avval `create()` hech qanday
 * egalik/hamkorlik tekshiruvisiz ishlardi - istalgan autentifikatsiyalangan foydalanuvchi istalgan
 * boshqa userga (hech qachon u bilan hamkorlik qilmagan bo'lsa ham) baho qo'ya olardi ("review
 * bombing" xavfi). Endi campaignId orqali haqiqiy tugallangan hamkorlik (kampaniya ichida
 * authorId<->targetId orasida ACCEPTED zayavka borligi) tekshiriladi, va bitta muallif bitta
 * kampaniya uchun faqat bitta marta baho qo'ya oladi (schema.prisma @@unique).
 */
@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreateRatingDto) {
    if (authorId === dto.targetUserId) {
      throw new BadRequestException("O'zingizga baho qo'ya olmaysiz");
    }

    // Kampaniya ichida authorId va targetUserId haqiqatan ham hamkor (biznes<->kreator,
    // ACCEPTED zayavka orqali bog'langan) ekanini tekshiramiz - aks holda hech qanday
    // aloqasi bo'lmagan ikki foydalanuvchi bir-biriga baho qo'ya olmasligi kerak.
    const application = await this.prisma.campaignApplication.findFirst({
      where: {
        campaignId: dto.campaignId,
        status: 'ACCEPTED' as any,
        campaign: { business: { userId: { in: [authorId, dto.targetUserId] } } },
        creator: { userId: { in: [authorId, dto.targetUserId] } },
      },
      include: { campaign: { include: { business: true } }, creator: true },
    });

    if (!application) {
      throw new ForbiddenException(
        'Bu kampaniya bo\'yicha siz va baholanayotgan foydalanuvchi orasida tasdiqlangan hamkorlik topilmadi',
      );
    }

    const businessUserId = application.campaign.business.userId;
    const creatorUserId = application.creator.userId;
    const isValidPair =
      (authorId === businessUserId && dto.targetUserId === creatorUserId) ||
      (authorId === creatorUserId && dto.targetUserId === businessUserId);
    if (!isValidPair) {
      throw new ForbiddenException('Bu kampaniya bo\'yicha faqat bevosita hamkoringizni baholay olasiz');
    }

    try {
      const rating = await this.prisma.rating.create({
        data: {
          authorId,
          targetId: dto.targetUserId,
          campaignId: dto.campaignId,
          score: dto.score,
          comment: dto.comment,
        },
      });
      await this.recalculateScore(dto.targetUserId);
      return rating;
    } catch (err: any) {
      // Prisma unique constraint (authorId, targetId, campaignId) - bitta hamkorlik uchun
      // faqat bitta baho.
      if (err?.code === 'P2002') {
        throw new ConflictException('Siz bu hamkorlikni allaqachon baholagansiz');
      }
      throw err;
    }
  }

  async findForUser(userId: string) {
    return this.prisma.rating.findMany({ where: { targetId: userId }, orderBy: { createdAt: 'desc' } });
  }

  // Berilgan kampaniya bo'yicha joriy foydalanuvchi allaqachon baho qo'yganmi - mini-app UI
  // "Siz allaqachon baholagansiz" holatini ko'rsatishi uchun (ratings.controller.ts).
  async hasRated(authorId: string, campaignId: string) {
    const existing = await this.prisma.rating.findFirst({
      where: { authorId, campaignId },
      select: { id: true },
    });
    return { rated: !!existing };
  }

  private async recalculateScore(targetUserId: string) {
    const agg = await this.prisma.rating.aggregate({
      where: { targetId: targetUserId },
      _avg: { score: true },
    });
    const avg = agg._avg.score ?? 0;
    const scaled = Math.round((avg / 5) * 100); // 0-100 shkala

    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId: targetUserId } });
    if (creator) {
      await this.prisma.creatorProfile.update({
        where: { userId: targetUserId },
        data: { rating: avg, creatorScore: scaled },
      });
      return;
    }

    const business = await this.prisma.businessProfile.findUnique({ where: { userId: targetUserId } });
    if (business) {
      await this.prisma.businessProfile.update({
        where: { userId: targetUserId },
        data: { businessScore: scaled },
      });
    }
  }
}
