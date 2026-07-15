import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * 2026-07-15: Telegram tashqarisidagi (veb-sayt) foydalanuvchilar uchun telefon+SMS
 * autentifikatsiyasi. SMS jo'natish provayderga bog'liq (O'zbekiston bozorida eng
 * keng tarqalgani - Eskiz.uz) - shuning uchun bu servis provayder tafsilotlarini
 * yashiradi (Click/Payme integratsiyasidagi kabi naqsh).
 *
 * MUHIM: haqiqiy SMS yuborish uchun Railway'da ESKIZ_EMAIL + ESKIZ_PASSWORD
 * muhit o'zgaruvchilari kerak (https://notify.eskiz.uz/ da ro'yxatdan o'tib olinadi).
 * Bu qiymatlar sozlanmagan bo'lsa, servis xatoga chiqmaydi - buning o'rniga kodni
 * server logiga yozadi (dev/staging rejimi) - shu bilan token bo'lmasa ham butun
 * oqim (OTP yaratish/tekshirish) sinovdan o'tkazilishi mumkin.
 */
@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private tokenCache: { token: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  async send(phone: string, message: string): Promise<void> {
    const email = this.config.get<string>('ESKIZ_EMAIL');
    const password = this.config.get<string>('ESKIZ_PASSWORD');

    if (!email || !password) {
      // Provayder ulanmagan - kodni logga chiqarib, oqimni bloklamaymiz.
      this.logger.warn(
        `ESKIZ_EMAIL/ESKIZ_PASSWORD sozlanmagan - SMS haqiqatda yuborilmadi. [${phone}] ${message}`,
      );
      return;
    }

    try {
      const token = await this.getToken(email, password);
      const res = await fetch('https://notify.eskiz.uz/api/message/sms/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mobile_phone: phone.replace(/^\+/, ''),
          message,
          from: '4546',
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Eskiz SMS xatosi: ${res.status} ${body}`);
      }
    } catch (err) {
      // SMS yetkazib berish muvaqqat nosozligi butun so'rovni yiqitmasin - lekin
      // aniq log qoldiramiz, chunki foydalanuvchi kodni olmay qoladi.
      this.logger.error(`SMS yuborishda xatolik [${phone}]: ${(err as Error).message}`);
      throw err;
    }
  }

  private async getToken(email: string, password: string): Promise<string> {
    if (this.tokenCache && this.tokenCache.expiresAt > Date.now()) {
      return this.tokenCache.token;
    }
    const res = await fetch('https://notify.eskiz.uz/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) throw new Error(`Eskiz login xatosi: ${res.status}`);
    const data = (await res.json()) as { data: { token: string } };
    // Eskiz tokeni ~1 kun amal qiladi - xavfsizlik uchun 12 soatda yangilaymiz.
    this.tokenCache = { token: data.data.token, expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
    return this.tokenCache.token;
  }
}
