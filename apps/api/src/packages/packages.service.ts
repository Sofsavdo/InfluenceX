import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

/**
 * 2026-07-15 (Collabstr raqobatchi tahlili): kreatorning narxlangan xizmatlar menyusi.
 * Kampaniya-birinchi oqim (business kampaniya ochadi -> kreator ariza beradi) bilan bir
 * qatorda ishlaydigan ikkinchi, tezroq yo'l - biznes profilida tayyor narxni ko'radi.
 * MVP doirasida bu FAQAT vitrina (narxni ko'rsatish + aloqa) - "Add to Cart" darajasidagi
 * avtomatik buyurtma/checkout keyingi bosqichda qo'shiladi (mavjud Campaign/Escrow
 * infratuzilmasini qayta ishlatib - products.service.ts'dagi naqsh kabi).
 */
@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedCreatorProfile(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException('Avval kreator profilini to\'ldiring');
    return creator;
  }

  async create(userId: string, dto: CreatePackageDto) {
    const creator = await this.getOwnedCreatorProfile(userId);
    return this.prisma.creatorPackage.create({
      data: {
        creatorId: creator.id,
        platform: dto.platform as any,
        contentType: dto.contentType as any,
        title: dto.title,
        description: dto.description,
        price: dto.price,
        currency: dto.currency ?? 'UZS',
        deliveryDays: dto.deliveryDays,
      },
    });
  }

  async listMine(userId: string) {
    const creator = await this.getOwnedCreatorProfile(userId);
    return this.prisma.creatorPackage.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Ommaviy - biznes har qanday kreatorning FAOL paketlarini ko'rishi mumkin
  // (profil sahifasida "narxlar menyusi" sifatida).
  async listForCreator(creatorId: string) {
    return this.prisma.creatorPackage.findMany({
      where: { creatorId, active: true },
      orderBy: { price: 'asc' },
    });
  }

  async update(userId: string, id: string, dto: UpdatePackageDto) {
    const pkg = await this.prisma.creatorPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Paket topilmadi');
    const creator = await this.getOwnedCreatorProfile(userId);
    if (pkg.creatorId !== creator.id) throw new ForbiddenException('Bu paket sizga tegishli emas');

    return this.prisma.creatorPackage.update({
      where: { id },
      data: {
        ...(dto.platform !== undefined ? { platform: dto.platform as any } : {}),
        ...(dto.contentType !== undefined ? { contentType: dto.contentType as any } : {}),
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.price !== undefined ? { price: dto.price } : {}),
        ...(dto.currency !== undefined ? { currency: dto.currency } : {}),
        ...(dto.deliveryDays !== undefined ? { deliveryDays: dto.deliveryDays } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    const pkg = await this.prisma.creatorPackage.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Paket topilmadi');
    const creator = await this.getOwnedCreatorProfile(userId);
    if (pkg.creatorId !== creator.id) throw new ForbiddenException('Bu paket sizga tegishli emas');
    await this.prisma.creatorPackage.delete({ where: { id } });
    return { deleted: true };
  }
}
