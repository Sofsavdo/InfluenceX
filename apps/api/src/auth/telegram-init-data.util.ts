import { createHash, createHmac } from 'crypto';

/**
 * Telegram Mini App initData tekshiruvi.
 * PRD v2 §6: Auth — Telegram `initData` HMAC-SHA256 tekshiruvi (MVP).
 *
 * Telegram hujjatlashtirilgan algoritm:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * 1. initData query-string ko'rinishida keladi (masalan "query_id=...&user=...&hash=...").
 * 2. "hash" maydonidan tashqari barcha juftliklar alifbo tartibida saralanadi va
 *    "key=value" formatida "\n" bilan birlashtiriladi -> data-check-string.
 * 3. secret_key = HMAC_SHA256(bot_token, key="WebAppData")
 * 4. hesaplangan_hash = HMAC_SHA256(data-check-string, secret_key) (hex)
 * 5. hesaplangan_hash === hash bo'lsa, ma'lumot Telegram tomonidan tasdiqlangan hisoblanadi.
 */
export interface ParsedInitData {
  raw: Record<string, string>;
  user?: {
    id: number;
    first_name?: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    photo_url?: string;
  };
  authDate?: number;
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds = 86400,
): ParsedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) {
    throw new Error('initData ichida hash topilmadi');
  }

  const dataCheckEntries: string[] = [];
  params.forEach((value, key) => {
    if (key === 'hash') return;
    dataCheckEntries.push(`${key}=${value}`);
  });
  dataCheckEntries.sort();
  const dataCheckString = dataCheckEntries.join('\n');

  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (computedHash !== hash) {
    throw new Error('initData imzosi noto\'g\'ri (hash mos kelmadi)');
  }

  const authDateStr = params.get('auth_date');
  const authDate = authDateStr ? parseInt(authDateStr, 10) : undefined;
  if (authDate && Date.now() / 1000 - authDate > maxAgeSeconds) {
    throw new Error('initData muddati o\'tgan');
  }

  const raw: Record<string, string> = {};
  params.forEach((value, key) => {
    raw[key] = value;
  });

  let user: ParsedInitData['user'];
  const userRaw = params.get('user');
  if (userRaw) {
    try {
      user = JSON.parse(userRaw);
    } catch {
      // e'tiborsiz qoldiriladi — user ixtiyoriy
    }
  }

  return { raw, user, authDate };
}

// Dev/test muhitida bot token bo'lmasa ham ishlash uchun yordamchi (faqat NODE_ENV=development)
export function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 12);
}
