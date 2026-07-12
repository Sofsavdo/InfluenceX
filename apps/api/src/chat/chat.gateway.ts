import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, Language } from '@influencex/shared';
import { verifyTelegramInitData } from '../auth/telegram-init-data.util';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * Mini App real-vaqt chat uchun WebSocket gateway.
 *
 * Xavfsizlik (2026-07-11 gacha oddiylashtirilgan edi): client ulanishda faqat
 * `auth: { userId }` yuborardi va server buni tekshirmasdan ishonardi — bu
 * har qanday kishi boshqa foydalanuvchi nomidan xabar yozishi yoki chatga
 * (nizoda dalil sifatida ishlatiladigan) begona thread'ga kirib xabarlarni
 * o'qishi mumkin edi. Endi ulanish paytida `auth.initData` (Telegram initData)
 * server tomonida HMAC bilan qayta tasdiqlanadi (xuddi TelegramAuthGuard kabi)
 * va foydalanuvchi ID socket'ning o'ziga (`socket.data.userId`) bog'lanadi —
 * client boshqa userId his qila olmaydi.
 */
// CORS manzili main.ts bilan bir xil CORS_ORIGIN o'zgaruvchisidan olinadi (production'da
// '*' o'rniga aniq domenlar ro'yxati bo'lishi kerak - xavfsizlik, 2026-07-11 tahlili).
@WebSocketGateway({
  namespace: '/chat',
  cors: { origin: process.env.CORS_ORIGIN && process.env.CORS_ORIGIN !== '*' ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim()) : true },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket: Socket, next) => {
      try {
        const initData = socket.handshake.auth?.initData as string | undefined;
        if (!initData) {
          throw new Error('auth.initData yuborilmagan');
        }

        const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
        if (!botToken) {
          throw new Error('Server konfiguratsiyasida TELEGRAM_BOT_TOKEN yo\'q');
        }

        const parsed = verifyTelegramInitData(initData, botToken);
        if (!parsed.user) {
          throw new Error('initData ichida user topilmadi');
        }

        const telegramId = BigInt(parsed.user.id);
        let user = await this.prisma.user.findUnique({ where: { telegramId } });
        if (!user) {
          user = await this.prisma.user.create({
            data: {
              telegramId,
              telegramUsername: parsed.user.username,
              role: UserRole.CREATOR,
              language: this.mapLanguage(parsed.user.language_code),
            },
          });
        }

        socket.data.userId = user.id;
        next();
      } catch (err) {
        this.logger.warn(`Chat socket auth rad etildi: ${(err as Error).message}`);
        next(new Error('unauthorized'));
      }
    });
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Chat socket ulandi: ${client.id} (userId=${client.data.userId})`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Chat socket uzildi: ${client.id}`);
  }

  @SubscribeMessage('joinThread')
  async onJoinThread(@ConnectedSocket() client: Socket, @MessageBody() threadId: string) {
    try {
      // getThread() ichida assertParticipant() bor - begona odam thread'ga qo'shila olmaydi
      await this.chatService.getThread(client.data.userId, threadId);
      client.join(threadId);
    } catch (err) {
      this.logger.warn(
        `joinThread rad etildi (userId=${client.data.userId}, threadId=${threadId}): ${(err as Error).message}`,
      );
      client.emit('error', { message: 'Bu chat sizga tegishli emas' });
    }
  }

  @SubscribeMessage('sendMessage')
  async onSendMessage(@ConnectedSocket() client: Socket, @MessageBody() payload: SendMessageDto) {
    // userId endi payload'dan emas, tasdiqlangan socket.data'dan olinadi (spoofing imkonsiz)
    const message = await this.chatService.sendMessage(client.data.userId, payload);
    this.server.to(payload.threadId).emit('newMessage', message);
    return message;
  }

  private mapLanguage(code?: string): Language {
    if (code === 'ru') return Language.RU;
    if (code === 'en') return Language.EN;
    return Language.UZ;
  }
}
