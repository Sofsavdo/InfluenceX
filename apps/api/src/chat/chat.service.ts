import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * PRD v2 §4.6 — Chat Mini App ichida WebSocket orqali, Telegram DM emas
 * (nizolarda dalil sifatida saqlanishi va moderator tomonidan ko'rib chiqilishi uchun).
 */
@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async getThread(userId: string, threadId: string) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        application: { include: { campaign: { include: { business: true } }, creator: true } },
      },
    });
    if (!thread) throw new NotFoundException('Chat topilmadi');
    this.assertParticipant(userId, thread);
    return thread;
  }

  async sendMessage(userId: string, dto: SendMessageDto) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: dto.threadId },
      include: { application: { include: { campaign: { include: { business: true } }, creator: true } } },
    });
    if (!thread) throw new NotFoundException('Chat topilmadi');
    this.assertParticipant(userId, thread);

    return this.prisma.chatMessage.create({
      data: {
        threadId: dto.threadId,
        senderId: userId,
        body: dto.body,
        attachmentUrl: dto.attachmentUrl,
      },
    });
  }

  private assertParticipant(userId: string, thread: any) {
    const isBusiness = thread.application.campaign.business.userId === userId;
    const isCreator = thread.application.creator.userId === userId;
    if (!isBusiness && !isCreator) {
      throw new ForbiddenException('Bu chat sizga tegishli emas');
    }
  }
}
