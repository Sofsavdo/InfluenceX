/**
 * Telegram WebApp SDK bilan ishlash uchun yupqa wrapper.
 * index.html'ga ulangan https://telegram.org/js/telegram-web-app.js skripti
 * window.Telegram.WebApp obyektini beradi.
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
  colorScheme: 'light' | 'dark';
  viewportHeight: number;
  viewportStableHeight: number;
  safeAreaInset?: { top: number; bottom: number; left: number; right: number };
  ready: () => void;
  expand: () => void;
  close: () => void;
  onEvent: (event: string, cb: () => void) => void;
  offEvent: (event: string, cb: () => void) => void;
  MainButton: {
    text: string;
    color?: string;
    textColor?: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
    setText: (text: string) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
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

// 2026-07-14 (to'liq UX/UI qayta qurish): Telegram real vaqtda light/dark mavzuni
// almashtirishi mumkin (foydalanuvchi tizim sozlamasini o'zgartirsa). `colorScheme`
// (yoki fallback sifatida brauzer `prefers-color-scheme`) asosida <html> elementiga
// "dark" klassini qo'yamiz - shu orqali index.css'dagi :root/.dark CSS o'zgaruvchilari
// butun ilova bo'ylab avtomatik almashadi (hech qanday sahifa alohida o'zgartirilmaydi).
function applyColorScheme(scheme: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', scheme === 'dark');
}

function syncColorScheme() {
  const webApp = getTelegramWebApp();
  if (webApp?.colorScheme) {
    applyColorScheme(webApp.colorScheme);
    return;
  }
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  applyColorScheme(prefersDark ? 'dark' : 'light');
}

export function bootstrapTelegramWebApp() {
  const webApp = getTelegramWebApp();
  syncColorScheme();
  if (!webApp) {
    // Brauzerda (Telegram tashqarisida) dev qilishda WebApp mavjud bo'lmaydi — ogohlantirish yetarli
    console.warn('Telegram.WebApp topilmadi — Mini App Telegram ichida ochilmagan (dev rejimi bo\'lishi mumkin)');
    return;
  }
  webApp.ready();
  webApp.expand();
  webApp.onEvent('themeChanged', syncColorScheme);
}
