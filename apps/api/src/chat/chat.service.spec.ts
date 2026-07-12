import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';

/**
 * chat.service.ts - PRD v2 §4.6: chat nizolarda dalil sifatida ishlatiladi, shuning
 * uchun faqat kampaniyaning ikkala tomoni (biznes egasi va qabul qilingan kreator)
 * thread'ni o'qishi/yozishi mumkinligini (assertParticipant) tekshirish muhim -
 * bu xuddi shu tekshiruv chat.gateway.ts'ning joinThread/sendMessage yo'lida ham
 * ishlatiladi (2026-07-11 xavfsizlik tuzatishidan keyin).
 */
describe('ChatService', () => {
  let prisma: any;
  let service: ChatService;

  const THREAD_ID = 'thread-1';
  const BUSINESS_USER_ID = 'business-user-1';
  const CREATOR_USER_ID = 'creator-user-1';

  function threadFixture(overrides: Partial<any> = {}) {
    return {
      id: THREAD_ID,
      messages: [],
      application: {
        campaign: { business: { userId: BUSINESS_USER_ID } },
        creator: { userId: CREATOR_USER_ID },
      },
      ...overrides,
    };
  }

  beforeEach(() => {
    prisma = {
      chatThread: { findUnique: jest.fn() },
      chatMessage: { create: jest.fn() },
    };
    service = new ChatService(prisma);
  });

  describe('getThread', () => {
    it('chat topilmasa NotFoundException tashlaydi', async () => {
      prisma.chatThread.findUnique.mockResolvedValue(null);
      await expect(service.getThread(BUSINESS_USER_ID, THREAD_ID)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ishtirokchi bo\'lmagan foydalanuvchi uchun ForbiddenException tashlaydi', async () => {
      prisma.chatThread.findUnique.mockResolvedValue(threadFixture());
      await expect(service.getThread('begona-user', THREAD_ID)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('biznes egasi thread\'ni ko\'ra oladi', async () => {
      prisma.chatThread.findUnique.mockResolvedValue(threadFixture());
      const result = await service.getThread(BUSINESS_USER_ID, THREAD_ID);
      expect(result.id).toBe(THREAD_ID);
    });

    it('kreator thread\'ni ko\'ra oladi', async () => {
      prisma.chatThread.findUnique.mockResolvedValue(threadFixture());
      const result = await service.getThread(CREATOR_USER_ID, THREAD_ID);
      expect(result.id).toBe(THREAD_ID);
    });
  });

  describe('sendMessage', () => {
    it('begona foydalanuvchi xabar yoza olmaydi (ForbiddenException)', async () => {
      prisma.chatThread.findUnique.mockResolvedValue(threadFixture());
      await expect(
        service.sendMessage('begona-user', { threadId: THREAD_ID, body: 'salom' } as any),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.chatMessage.create).not.toHaveBeenCalled();
    });

    it('ishtirokchi xabar yozganda senderId server tomonidan (auth\'dan) belgilanadi', async () => {
      prisma.chatThread.findUnique.mockResolvedValue(threadFixture());
      prisma.chatMessage.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'msg-1', ...data }));

      const result = await service.sendMessage(CREATOR_USER_ID, {
        threadId: THREAD_ID,
        body: 'Ishni boshladim',
      } as any);

      expect(result.senderId).toBe(CREATOR_USER_ID);
      expect(prisma.chatMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ senderId: CREATOR_USER_ID, body: 'Ishni boshladim' }) }),
      );
    });
  });
});
