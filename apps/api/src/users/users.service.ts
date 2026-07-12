import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCreatorProfileDto } from './dto/update-creator-profile.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { SubmitVerificationRequestDto } from './dto/submit-verification-request.dto';
import { UpdateSubscriptionPlanDto } from './dto/update-subscription-plan.dto';
import { CreatorTier, VerificationStatus } from '@influencex/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { creatorProfile: true, businessProfile: true },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    return user;
  }

  async upsertCreatorProfile(userId: string, dto: UpdateCreatorProfileDto) {
    const tier = this.resolveTier(dto.followers ?? 0);
    return this.prisma.creatorProfile.upsert({
      where: { userId },
      create: {
        userId,
        name: dto.name,
        avatarUrl: dto.avatarUrl,
        country: dto.country,
        city: dto.city,
        languages: dto.languages ?? [],
        categories: dto.categories ?? [],
        socialLinks: dto.socialLinks ?? {},
        followers: dto.followers ?? 0,
        avgViews: dto.avgViews ?? 0,
        engagementRate: dto.engagementRate ?? 0,
        tier,
        payoutProvider: dto.payoutProvider,
        payoutAccount: dto.payoutAccount,
      },
      update: {
        name: dto.name,
        avatarUrl: dto.avatarUrl,
        country: dto.country,
        city: dto.city,
        languages: dto.languages,
        categories: dto.categories,
        socialLinks: dto.socialLinks,
        followers: dto.followers,
        avgViews: dto.avgViews,
        engagementRate: dto.engagementRate,
        tier,
        payoutProvider: dto.payoutProvider,
        payoutAccount: dto.payoutAccount,
      },
    });
  }

  async upsertBusinessProfile(userId: string, dto: UpdateBusinessProfileDto) {
    return this.prisma.businessProfile.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: { ...dto },
    });
  }

  // PRD "Verification" — Creator/Business o'z profilini moderator ko'rib chiqishi uchun
  // yuboradi (masalan, pasport/guvohnoma hujjati S3'ga oldindan yuklangan bo'ladi -
  // apps/api/src/uploads). Admin Panel -> "Verifikatsiya" sahifasida moderator tasdiqlaydi
  // (admin.service.ts#reviewVerification).
  async submitVerificationRequest(userId: string, dto: SubmitVerificationRequestDto) {
    const [creator, business] = await Promise.all([
      this.prisma.creatorProfile.findUnique({ where: { userId } }),
      this.prisma.businessProfile.findUnique({ where: { userId } }),
    ]);
    if (!creator && !business) {
      throw new ForbiddenException('Avval profilingizni (kreator yoki biznes) to\'ldiring');
    }

    const currentStatus = creator?.verificationStatus ?? business?.verificationStatus;
    if (currentStatus === VerificationStatus.VERIFIED) {
      throw new BadRequestException('Profilingiz allaqachon verifikatsiyadan o\'tgan');
    }
    if (currentStatus === VerificationStatus.PENDING) {
      throw new BadRequestException('Verifikatsiya so\'rovingiz allaqachon ko\'rib chiqilmoqda');
    }

    const request = await this.prisma.verificationRequest.create({
      data: { userId, documentUrl: dto.documentUrl, note: dto.note, status: VerificationStatus.PENDING },
    });

    if (creator) {
      await this.prisma.creatorProfile.update({
        where: { userId },
        data: { verificationStatus: VerificationStatus.PENDING },
      });
    } else if (business) {
      await this.prisma.businessProfile.update({
        where: { userId },
        data: { verificationStatus: VerificationStatus.PENDING },
      });
    }

    return request;
  }

  // PRD "Subscription Plans" (2026-07-11). MUHIM: bu hozircha o'z-o'zidan xizmat
  // (self-service) tanlov - haqiqiy oylik to'lov undirish (Click orqali takroriy
  // billing) hali qo'shilmagan, bu keyingi bosqichda alohida qo'shiladi (Payme/Uzum
  // stub'lari uchun qabul qilingan xuddi shu halol-ochiq yondashuv). Cheklov
  // (SUBSCRIPTION_PLAN_LIMITS) esa campaigns.service.ts#updateStatus'da HAQIQIY
  // ishlaydi - bu soxta emas, kampaniya faollashtirishni haqiqatan cheklaydi.
  async updateSubscriptionPlan(userId: string, dto: UpdateSubscriptionPlanDto) {
    const business = await this.prisma.businessProfile.findUnique({ where: { userId } });
    if (!business) throw new ForbiddenException('Avval biznes profilini to\'ldiring');
    return this.prisma.businessProfile.update({
      where: { userId },
      data: { subscriptionPlan: dto.plan },
    });
  }

  // PRD "Featured Placement": "Creators can promote profiles" - 2026-07-11 qo'shildi.
  async promoteProfile(userId: string, days: number) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException('Avval kreator profilini to\'ldiring');
    const featuredUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return this.prisma.creatorProfile.update({
      where: { userId },
      data: { isFeatured: true, featuredUntil },
    });
  }

  // PRD v1: Micro 200-10k, Medium 10k-100k, Large 100k+
  private resolveTier(followers: number): CreatorTier {
    if (followers >= 100_000) return CreatorTier.LARGE;
    if (followers >= 10_000) return CreatorTier.MEDIUM;
    return CreatorTier.MICRO;
  }
}
