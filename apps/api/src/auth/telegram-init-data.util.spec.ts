import { createHmac } from 'crypto';
import { verifyTelegramInitData } from './telegram-init-data.util';

// telegram-init-data.util.ts - Telegram Mini App autentifikatsiyasining yuragi
// (barcha TelegramAuthGuard/chat.gateway.ts shu funksiyaga tayanadi). Bu yerda
// Telegram'ning rasmiy hujjatlashtirilgan algoritmini (HMAC-SHA256, ikki bosqichli)
// to'g'ri implement qilinganini haqiqiy imzo hisoblab tekshiramiz - stub emas.
describe('verifyTelegramInitData', () => {
  const BOT_TOKEN = '123456:TEST-BOT-TOKEN-FOR-UNIT-TESTS';

  function buildInitData(
    fields: Record<string, string>,
    botToken = BOT_TOKEN,
  ): string {
    const entries = Object.entries(fields).sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    const params = new URLSearchParams({ ...fields, hash });
    return params.toString();
  }

  it("to'g'ri imzolangan initData'ni tasdiqlaydi va user'ni ajratib oladi", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const initData = buildInitData({
      query_id: 'AAH_test',
      user: JSON.stringify({ id: 555, first_name: 'Alisher', username: 'alisher_uz', language_code: 'uz' }),
      auth_date: String(nowSeconds),
    });

    const result = verifyTelegramInitData(initData, BOT_TOKEN);

    expect(result.user?.id).toBe(555);
    expect(result.user?.username).toBe('alisher_uz');
    expect(result.authDate).toBe(nowSeconds);
  });

  it("hash xato bo'lsa (masalan boshqa bot token bilan imzolangan) xato tashlaydi", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const initData = buildInitData(
      { user: JSON.stringify({ id: 555 }), auth_date: String(nowSeconds) },
      'BOSHQA-BOT-TOKEN',
    );

    expect(() => verifyTelegramInitData(initData, BOT_TOKEN)).toThrow(/hash mos kelmadi/);
  });

  it("hash maydoni umuman bo'lmasa xato tashlaydi", () => {
    expect(() => verifyTelegramInitData('query_id=abc&user=%7B%7D', BOT_TOKEN)).toThrow(
      /hash topilmadi/,
    );
  });

  it("qo'lda o'zgartirilgan (tampered) maydon bilan tasdiqlanmaydi", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const initData = buildInitData({
      user: JSON.stringify({ id: 555, first_name: 'Alisher' }),
      auth_date: String(nowSeconds),
    });
    // Hujumchi user.id'ni o'zgartirishga urinadi, lekin hash eskicha qoladi
    const tampered = initData.replace(encodeURIComponent('"id":555'), encodeURIComponent('"id":999'));

    expect(() => verifyTelegramInitData(tampered, BOT_TOKEN)).toThrow(/hash mos kelmadi/);
  });

  it('muddati o\'tgan auth_date uchun xato tashlaydi (maxAgeSeconds)', () => {
    const oldTimestamp = Math.floor(Date.now() / 1000) - 999_999; // juda eski
    const initData = buildInitData({
      user: JSON.stringify({ id: 555 }),
      auth_date: String(oldTimestamp),
    });

    expect(() => verifyTelegramInitData(initData, BOT_TOKEN, 86400)).toThrow(/muddati o'tgan/);
  });

  it("user maydoni bo'lmasa ham (ixtiyoriy) hash to'g'ri bo'lsa tasdiqlanadi, lekin user undefined bo'ladi", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const initData = buildInitData({ auth_date: String(nowSeconds), query_id: 'no-user-case' });

    const result = verifyTelegramInitData(initData, BOT_TOKEN);
    expect(result.user).toBeUndefined();
  });
});
