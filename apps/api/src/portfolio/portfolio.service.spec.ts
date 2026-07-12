import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';

/**
 * portfolio.service.ts - PRD "Creator Profiles" portfolio maydoni. Muhim tekshiruv:
 * faqat portfolio elementi egasi (kreator) uni o'chira oladi; ro'yxatlash esa
 * (listForCreator) ataylab ochiq - bu kreatorning ommaviy reklama vitrinasi.
 */
describe('PortfolioService', () => {
  let prisma: any;
  let service: PortfolioService;

  const USER_ID = 'creator-user-1';
  const CREATOR_ID = 'creator-profile-1';
  const ITEM_ID = 'item-1';

  beforeEach(() => {
    prisma = {
      creatorProfile: { findUnique: jest.fn() },
      portfolioItem: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    };
    service = new PortfolioService(prisma);
  });

  describe('add', () => {
    it('kreator profili bo\'lmasa ForbiddenException tashlaydi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue(null);
      await expect(service.add(USER_ID, { mediaUrl: 'https://cdn.example.com/1.jpg' })).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('to\'g\'ri holatda portfolio elementini yaratadi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: CREATOR_ID });
      prisma.portfolioItem.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: ITEM_ID, ...data }),
      );

      const result = await service.add(USER_ID, { mediaUrl: 'https://cdn.example.com/1.jpg', caption: 'Reel' });
      expect(result.creatorId).toBe(CREATOR_ID);
      expect(prisma.portfolioItem.create).toHaveBeenCalledWith({
        data: { creatorId: CREATOR_ID, mediaUrl: 'https://cdn.example.com/1.jpg', caption: 'Reel' },
      });
    });
  });

  describe('remove', () => {
    it('element topilmasa NotFoundException tashlaydi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: CREATOR_ID });
      prisma.portfolioItem.findUnique.mockResolvedValue(null);
      await expect(service.remove(USER_ID, ITEM_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('boshqa kreatorning elementi uchun ForbiddenException tashlaydi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: CREATOR_ID });
      prisma.portfolioItem.findUnique.mockResolvedValue({ id: ITEM_ID, creatorId: 'boshqa-kreator' });
      await expect(service.remove(USER_ID, ITEM_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('egasi bo\'lsa elementni o\'chiradi', async () => {
      prisma.creatorProfile.findUnique.mockResolvedValue({ id: CREATOR_ID });
      prisma.portfolioItem.findUnique.mockResolvedValue({ id: ITEM_ID, creatorId: CREATOR_ID });
      prisma.portfolioItem.delete.mockResolvedValue({ id: ITEM_ID });

      const result = await service.remove(USER_ID, ITEM_ID);
      expect(result).toEqual({ success: true });
      expect(prisma.portfolioItem.delete).toHaveBeenCalledWith({ where: { id: ITEM_ID } });
    });
  });

  describe('listForCreator', () => {
    it('berilgan kreator uchun elementlarni qaytaradi (autentifikatsiyasiz - ommaviy)', async () => {
      prisma.portfolioItem.findMany.mockResolvedValue([{ id: ITEM_ID }]);
      const result = await service.listForCreator(CREATOR_ID);
      expect(result).toEqual([{ id: ITEM_ID }]);
      expect(prisma.portfolioItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { creatorId: CREATOR_ID } }),
      );
    });
  });
});
