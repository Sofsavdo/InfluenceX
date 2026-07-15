import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { UserRole, Language } from '@influencex/shared';
import { ParsedInitData } from './telegram-init-data.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsService,
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

  // -------------------------------------------------------------------------
  // 2026-07-15: Telefon + SMS OTP - Telegram tashqarisida (oddiy mobil brauzer)
  // ilovadan foydalanish uchun. Ikki bosqich: requestOtp (kod yuboradi) ->
  // verifyOtp (kodni tekshiradi, User'ni topadi/yaratadi, JWT beradi). Yangi
  // foydalanuvchi CREATOR sifatida yaratiladi (Telegram oqimi bilan bir xil
  // standart) - keyin mavjud Onboarding oqimi orqali rolni tanlaydi/profilni to'ldiradi.
  // -------------------------------------------------------------------------

  async requestOtp(phone: string) {
    // Qisqa vaqt ichida takroriy so'rovlarni cheklash (throttling controller
    // darajasida ham bor, bu - qo'shimcha himoya qatlami): oxirgi 60 soniyada
    // shu raqamga kod yuborilgan bo'lsa, qayta yubormaymiz.
    const recent = await this.prisma.otpCode.findFirst({
      where: { phone, createdAt: { gt: new Date(Date.now() - 60_000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) {
      throw new BadRequestException("Kod allaqachon yuborilgan. 1 daqiqadan so'ng qayta urinib ko'ring");
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 10);

    await this.prisma.otpCode.create({
      data: {
        phone,
        codeHash,
        expiresAt: new Date(Date.now() + 5 * 60_000),
      },
    });

    await this.sms.send(phone, `InfluenceX tasdiqlash kodi: ${code}. Kodni hech kimga bermang.`);

    return { sent: true, expiresInSeconds: 300 };
  }

  async verifyOtp(phone: string, code: string) {
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new UnauthorizedException("Kod muddati o'tgan yoki topilmadi. Qaytadan so'rang");
    }
    if (otp.attempts >= 5) {
      throw new UnauthorizedException("Urinishlar soni tugadi. Qaytadan kod so'rang");
    }

    const valid = await bcrypt.compare(code, otp.codeHash);
    if (!valid) {
      await this.prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
      throw new UnauthorizedException("Kod noto'g'ri");
    }

    await this.prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });

    let user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { phone, role: UserRole.CREATOR, language: Language.UZ },
      });
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id, role: user.role });
    return { user, accessToken };
  }
}
