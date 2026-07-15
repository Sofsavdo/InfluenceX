/**
 * 2026-07-15 (standalone veb-sayt so'rovi): Telegram tashqarisida (oddiy mobil brauzer)
 * ochilganda ilova telefon+SMS OTP orqali kiradi va JWT session tokenini oladi
 * (POST /auth/verify-otp). Bu yerda shu tokenni saqlash/o'qish/tozalash uchun yupqa
 * wrapper - localStorage ishlatiladi (Telegram WebView'da bu qatlam umuman ishlatilmaydi,
 * chunki initData har doim ustuvor - getAuthMode() pastda buni hal qiladi).
 */
const STORAGE_KEY = 'influencex_web_session';

export function getWebToken(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setWebToken(token: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // localStorage mavjud bo'lmagan muhit (masalan private rejim) - sessiya
    // sahifa yangilanguncha xotirada saqlanib qoladi, ammo bu chekka holat.
  }
}

export function clearWebToken(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // e'tiborsiz qoldiriladi
  }
}
