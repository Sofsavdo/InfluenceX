/**
 * Telegram WebApp SDK bilan ishlash uchun yupqa wrapper.
 * index.html'ga ulangan https://telegram.org/js/telegram-web-app.js skripti
 * window.Telegram.WebApp obyektini beradi. @telegram-apps/sdk kutubxonasi
 * qo'shimcha komponentlar (haptics, back button va h.k.) uchun ishlatiladi.
 */
export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      photo_url?: string;
    };
  };
  themeParams: Record<string, string>;
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    setText: (text: string) => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export function getTelegramWebApp(): TelegramWebApp | null {
  return typeof window !== 'undefined' && window.Telegram ? window.Telegram.WebApp : null;
}

export function getInitData(): string {
  return getTelegramWebApp()?.initData ?? '';
}

export function getTelegramUser() {
  return getTelegramWebApp()?.initDataUnsafe?.user;
}

export function bootstrapTelegramWebApp() {
  const webApp = getTelegramWebApp();
  if (!webApp) {
    // Brauzerda (Telegram tashqarisida) dev qilishda WebApp mavjud bo'lmaydi — ogohlantirish yetarli
    console.warn('Telegram.WebApp topilmadi — Mini App Telegram ichida ochilmagan (dev rejimi bo\'lishi mumkin)');
    return;
  }
  webApp.ready();
  webApp.expand();
}
