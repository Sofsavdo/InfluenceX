import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, Language } from '@influencex/shared';
import { verifyTelegramInitData } from './telegram-init-data.util';

/**
 * 2026-07-15 (standalone veb-sayt so'rovi): ba'zi endpoint'lar HAR IKKI turdagi
 * foydalanuvchiga xizmat qilishi kerak - Telegram Mini App ichidagi (X-Telegram-Init-Data)
 * VA oddiy mobil brauzerda telefon+OTP orqali kirgan (Authorization: Bearer <jwt>) foydalanuvchi.
 * TelegramAuthGuard/JwtAuthGuard'ni ATAYLAB o'zgartirmadik (ularga tayanuvchi ~15 ta mavjud
 * controller bor, birdaniga almashtirish xavfli) - bu FAQAT yangi (creator-packages,
 * creators-discovery) va ataylab tanlangan endpoint'larda qo'llaniladi.
 */
@Injectable()
export class HybridAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const initData = request.headers['x-telegram-init-data'];
    const authHeader = request.headers['authorization'];

    if (initData && typeof initData === 'string') {
      return this.viaTelegram(request, initData);
    }
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return this.viaJwt(request, authHeader.slice('Bearer '.length));
    }
    throw new UnauthorizedException('X-Telegram-Init-Data yoki Authorization: Bearer <token> header topilmadi');
  }

  private async viaTelegram(request: any, initData: string): Promise<boolean> {
    const botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!botToken) throw new UnauthorizedException('Server konfiguratsiyasida TELEGRAM_BOT_TOKEN yo\'q');

    let parsed;
    try {
      parsed = verifyTelegramInitData(initData, botToken);
    } catch (err) {
      throw new UnauthorizedException(`Telegram initData tasdiqlanmadi: ${(err as Error).message}`);
    }
    if (!parsed.user) throw new UnauthorizedException('initData ichida user topilmadi');

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

  private async viaJwt(request: any, token: string): Promise<boolean> {
    let payload: { sub: string };
    try {
      payload = await this.jwt.verifyAsync(token);
    } catch {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati o\'tgan');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');
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
