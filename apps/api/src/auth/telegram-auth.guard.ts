import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, Language } from '@influencex/shared';
import { verifyTelegramInitData } from './telegram-init-data.util';

/**
 * Har bir himoyalangan so'rovda "X-Telegram-Init-Data" header'ini talab qiladi
 * (Mini App Telegram.WebApp.initData qiymatini shu header orqali yuboradi).
 *
 * MVP uchun soddalashtirilgan model: alohida login/JWT bosqichi shart emas —
 * har bir so'rovda initData qayta tasdiqlanadi va foydalanuvchi topilmasa
 * avtomatik yaratiladi (findOrCreate). Bu native mobil ilova (Faza 3) uchun
 * keyinroq JWT-asoslangan sessiyaga almashtiriladi (AuthService.loginWithTelegram
 * allaqachon shu uchun tayyor).
 */
@Injectable()
export class TelegramAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const initData = request.headers['x-telegram-init-data'];

    if (!initData || typeof initData !== 'string') {
      throw new UnauthorizedException('X-Telegram-Init-Data header topilmadi');
    }

    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) {
      throw new UnauthorizedException('Server konfiguratsiyasida TELEGRAM_BOT_TOKEN yo\'q');
    }

    let parsed;
    try {
      parsed = verifyTelegramInitData(initData, botToken);
    } catch (err) {
      throw new UnauthorizedException(
        `Telegram initData tasdiqlanmadi: ${(err as Error).message}`,
      );
    }

    if (!parsed.user) {
      throw new UnauthorizedException('initData ichida user topilmadi');
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

    request.telegramUser = parsed.user;
    request.user = user;
    request.userId = user.id;
    return true;
  }

  private mapLanguage(code?: string): Language {
    if (code === 'ru') return Language.RU;
    if (code === 'en') return Language.EN;
    return Language.UZ;
  }
}
