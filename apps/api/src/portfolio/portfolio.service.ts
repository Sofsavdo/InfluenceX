import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddPortfolioItemDto } from './dto/add-portfolio-item.dto';

/**
 * PRD "Creator Profiles" -> Portfolio maydoni / "Creator Dashboard" -> Portfolio sahifasi.
 * Kreator o'z ishlagan kontentlaridan namunalar (rasm/video) qo'shadi - biznes bu orqali
 * kreatorning sifatini zayavka berishdan oldin baholaydi (AI Matching/Pricing bilan bir qatorda).
 */
@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnCreatorProfile(userId: string) {
    const creator = await this.prisma.creatorProfile.findUnique({ where: { userId } });
    if (!creator) throw new ForbiddenException('Avval kreator profilini to\'ldiring');
    return creator;
  }

  async add(userId: string, dto: AddPortfolioItemDto) {
    const creator = await this.getOwnCreatorProfile(userId);
    return this.prisma.portfolioItem.create({
      data: { creatorId: creator.id, mediaUrl: dto.mediaUrl, caption: dto.caption },
    });
  }

  async listMine(userId: string) {
    const creator = await this.getOwnCreatorProfile(userId);
    return this.prisma.portfolioItem.findMany({
      where: { creatorId: creator.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Biznes yoki boshqa foydalanuvchi kreator profilini ko'rayotganda (zayavkachilarni
  // ko'rib chiqishda) portfolioni ko'radi - ochiq, chunki bu kreatorning reklama vitrinasi.
  listForCreator(creatorId: string) {
    return this.prisma.portfolioItem.findMany({
      where: { creatorId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(userId: string, itemId: string) {
    const creator = await this.getOwnCreatorProfile(userId);
    const item = await this.prisma.portfolioItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException('Portfolio elementi topilmadi');
    if (item.creatorId !== creator.id) {
      throw new ForbiddenException('Bu portfolio elementi sizga tegishli emas');
    }
    await this.prisma.portfolioItem.delete({ where: { id: itemId } });
    return { success: true };
  }
}
