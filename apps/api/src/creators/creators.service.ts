import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreatorSearchQuery {
  category?: string;
  platform?: string;
  country?: string;
  minFollowers?: number;
  maxFollowers?: number;
  page?: number;
  limit?: number;
}

/**
 * 2026-07-15 (Collabstr raqobatchi tahlili - "Search Creators"): avval bunday
 * ommaviy qidiruv/ko'zdan kechirish endpoint'i UMUMAN yo'q edi - AI Creator Matching
 * (matching.service.ts) faqat bitta kampaniya kontekstida ishlaydi (biznes avval
 * kampaniya ochishi shart). Bu yerda biznes hali kampaniya ochmasdan turib ham
 * kreatorlar bazasini ko'zdan kechira oladi (Collabstr'dagi kabi - qidiruv birinchi).
 */
@Injectable()
export class CreatorsService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: CreatorSearchQuery) {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(Math.max(1, query.limit ?? 20), 50);

    const where: any = {
      // 2026-07-15: nomi to'ldirilmagan (bo'sh) profillar ko'zdan kechirish/qidiruv
      // natijalarida ko'rsatilmaydi - bular hali onboarding'ni to'liq yakunlamagan yoki
      // eski (tuzatishdan oldingi) test yozuvlari, Collabstr'da ham to'ldirilmagan
      // profil vitrina sifatida ko'rinmaydi.
      name: { not: '' },
    };
    if (query.category) where.categories = { has: query.category };
    if (query.country) where.country = query.country;
    if (query.minFollowers || query.maxFollowers) {
      where.followers = {
        ...(query.minFollowers ? { gte: query.minFollowers } : {}),
        ...(query.maxFollowers ? { lte: query.maxFollowers } : {}),
      };
    }

    const creators = await this.prisma.creatorProfile.findMany({
      where,
      orderBy: [{ isFeatured: 'desc' }, { creatorScore: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        packages: { where: { active: true }, orderBy: { price: 'asc' }, take: 1 },
      },
    });

    // Platform bo'yicha filtr (socialLinks JSON ichida) - DB darajasida emas, JS'da
    // (creator soni oshganda DB darajasiga ko'chirish kerak - matching.service.ts'dagi
    // izohda ham xuddi shu chegara qayd etilgan).
    const filtered = query.platform
      ? creators.filter((c: any) => Object.keys((c.socialLinks as Record<string, unknown>) ?? {}).includes(query.platform!))
      : creators;

    return filtered.map((c: any) => this.toDiscoveryDto(c));
  }

  async getPublicProfile(id: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { id } });
    if (!creator) throw new NotFoundException('Kreator topilmadi');
    return creator;
  }

  private toDiscoveryDto(c: any) {
    const cheapest = c.packages?.[0];
    return {
      id: c.id,
      userId: c.userId,
      name: c.name,
      avatarUrl: c.avatarUrl,
      country: c.country,
      city: c.city,
      categories: c.categories,
      followers: c.followers,
      engagementRate: c.engagementRate,
      tier: c.tier,
      rating: c.rating,
      verificationStatus: c.verificationStatus,
      startingPrice: cheapest ? { amount: Number(cheapest.price), currency: cheapest.currency } : undefined,
    };
  }
}
