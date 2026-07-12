import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Telegram Bot API bilan yupqa wrapper (Node 20+ global fetch, qo'shimcha SDK shart emas).
 * Ikkita vazifa bajaradi:
 *   1) Mini App'ga kirish nuqtasi: /start buyrug'iga "web_app" tugmasi bilan javob beradi.
 *   2) Bildirishnomalar: kampaniya/escrow hodisalari haqida foydalanuvchiga xabar yuboradi
 *      (PRD v1 asl kontseptsiyasidagi "real-time notifications" ehtiyojini qoplaydi).
 *
 * MUHIM: Faqat telegramId'si bor foydalanuvchilarga (Creator/Business) xabar yuboradi.
 * Moderator/Admin email+parol orqali kiradi (telegramId yo'q) - ularga bu kanal orqali
 * bildirishnoma yuborilmaydi (Admin Panel ichida yuboriladi, Faza 2).
 */
@Injectable()
export class TelegramBotService {
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get botToken(): string {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) throw new Error('TELEGRAM_BOT_TOKEN sozlanmagan (.env)');
    return token;
  }

  private get apiBase(): string {
    return `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(chatId: number | bigint, text: string, webAppButtonText?: string) {
    const miniAppUrl = this.config.get<string>('MINI_APP_URL');
    const body: Record<string, unknown> = {
      chat_id: chatId.toString(),
      text,
      parse_mode: 'HTML',
    };

    if (webAppButtonText && miniAppUrl) {
      body.reply_markup = {
        inline_keyboard: [[{ text: webAppButtonText, web_app: { url: miniAppUrl } }]],
      };
    }

    const res = await fetch(`${this.apiBase}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      this.logger.warn(`Telegram sendMessage xato: ${res.status} ${await res.text()}`);
    }
  }

  /** Ichki foydalanuvchi ID (UUID) bo'yicha - telegramId'ni topib xabar yuboradi. */
  async notifyUser(userId: string, text: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.telegramId) {
      this.logger.debug(`notifyUser: ${userId} da telegramId yo'q, o'tkazib yuborildi`);
      return;
    }
    try {
      await this.sendMessage(user.telegramId, text);
    } catch (err) {
      this.logger.warn(`notifyUser xato (${userId}): ${(err as Error).message}`);
    }
  }

  /** /start buyrug'iga javob - xush kelibsiz + Mini App ochish tugmasi. */
  async handleStartCommand(chatId: number) {
    const miniAppUrl = this.config.get<string>('MINI_APP_URL');
    const text =
      '<b>InfluenceX</b>ga xush kelibsiz! 👋\n\n' +
      "Kreator-biznes marketplace - kampaniyalarni ko'rish, zayavka berish yoki o'z kampaniyangizni " +
      "yaratish uchun quyidagi tugma orqali ilovani oching.";
    if (miniAppUrl) {
      await this.sendMessage(chatId, text, "Ilovani ochish");
    } else {
      await this.sendMessage(chatId, text);
    }
  }

  /**
   * CPA atributsiya - "Telegram deep-link" darajasi (2026-07-12, strategiya suhbatidan
   * keyin qo'shildi: "biznes ilovasi API bermasa ham, biz o'z botimiz orqali klikni
   * kuzata olamiz" yechimi). Bloger o'z referal havolasini (t.me/<bot>?start=ref_<kod>)
   * tarqatadi - foydalanuvchi shu havolani bossa, botimiz klikni CampaignApplication.clickCount
   * ga yozadi (xuddi HTTP /track/:applicationId kabi, lekin Telegram kontekstida) va
   * foydalanuvchini haqiqiy sotuv/ro'yxatdan o'tish sahifasiga (campaign.landingUrl) yo'naltiradi.
   *
   * MUHIM CHEGARA: bu FAQAT klikni qayd etadi - "sotuv/konversiya sodir bo'ldi" degani EMAS.
   * Haqiqiy konversiya alohida - yo biznes o'zi qayd etadi (ConversionsService#report,
   * source=SELF_REPORTED), yo biznesning o'z tizimi webhook orqali xabar beradi
   * (ConversionsService#reportViaWebhook, source=WEBHOOK, eng ishonchli daraja).
   */
  async handleReferralStart(chatId: number, referralCode: string) {
    const application = await this.prisma.campaignApplication.findUnique({
      where: { referralCode },
      include: { campaign: true },
    });

    if (!application || !application.campaign.landingUrl) {
      await this.sendMessage(
        chatId,
        "⚠️ Bu referal havola topilmadi yoki muddati o'tgan. Iltimos, blogerdan yangi havola so'rang.",
      );
      return;
    }

    await this.prisma.campaignApplication.update({
      where: { id: application.id },
      data: { clickCount: { increment: 1 } },
    });

    const text =
      `🔗 <b>${application.campaign.title}</b>\n\n` +
      "Quyidagi havola orqali davom eting - sizning tashrifingiz bloger orqali qayd etildi.";
    await this.sendMessage(chatId, text);
    await fetch(`${this.apiBase}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.toString(),
        text: application.campaign.landingUrl,
      }),
    }).catch(() => undefined);
  }
}
