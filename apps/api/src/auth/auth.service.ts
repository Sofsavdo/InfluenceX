import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, Language } from '@influencex/shared';
import { ParsedInitData } from './telegram-init-data.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Telegram orqali tasdiqlangan foydalanuvchini topadi yoki yaratadi,
   * so'ng ichki API uchun qisqa muddatli JWT session tokenini qaytaradi.
   * Rol (CREATOR/BUSINESS) onboarding oqimida keyinroq belgilanadi (default CREATOR).
   */
  async loginWithTelegram(tgUser: NonNullable<ParsedInitData['user']>) {
    const telegramId = BigInt(tgUser.id);

    let user = await this.prisma.user.findUnique({ where: { telegramId } });

    if (!user) {
      const language = this.mapLanguage(tgUser.language_code);
      user = await this.prisma.user.create({
        data: {
          telegramId,
          telegramUsername: tgUser.username,
          role: UserRole.CREATOR, // onboarding wizard keyin BUSINESS'ga o'zgartirishi mumkin
          language,
        },
      });
    }

    const accessToken = await this.jwt.signAsync({
      sub: user.id,
      role: user.role,
      telegramId: user.telegramId ? user.telegramId.toString() : null,
    });

    return { user, accessToken };
  }

  /**
   * Admin Panel (apps/admin) uchun email+parol login. Faqat MODERATOR/ADMIN
   * rolidagi foydalanuvchilar uchun (Creator/Business Telegram orqali kiradi —
   * PRD v2 §2). Boshlang'ich admin hisobi prisma/seed.ts orqali yaratiladi.
   */
  async loginAdmin(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
    }
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
      throw new UnauthorizedException('Bu hisob Admin Panel uchun ruxsatga ega emas');
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Email yoki parol noto\'g\'ri');
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { user, accessToken };
  }

  private mapLanguage(code?: string): Language {
    if (code === 'ru') return Language.RU;
    if (code === 'en') return Language.EN;
    return Language.UZ; // standart — O'zbek bozori ustuvor
  }
}
