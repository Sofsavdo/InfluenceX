import { getInitData, getTelegramWebApp } from '../lib/telegram';
import { getWebToken } from '../lib/webSession';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';

// 2026-07-15: ilova ikki muhitda ishlaydi - Telegram Mini App ICHIDA (X-Telegram-Init-Data
// header'i, TelegramAuthGuard) va Telegram TASHQARISIDA, oddiy mobil brauzer sifatida
// (telefon+OTP orqali olingan JWT, Authorization: Bearer <token>, HybridAuthGuard).
// Telegram initData mavjud bo'lsa u DOIM ustuvor (Mini App ichida ochilgan bo'lsa, JWT
// umuman kerak emas) - aks holda saqlangan veb-sessiya tokeniga qaytiladi.
function authHeaders(): Record<string, string> {
  const webApp = getTelegramWebApp();
  if (webApp?.initData) {
    return { 'X-Telegram-Init-Data': webApp.initData };
  }
  const token = getWebToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  // Hech biri yo'q - eski xatti-harakat saqlanadi (bo'sh initData header'i, backend
  // 401 qaytaradi). App.tsx bu holatni web-login sahifasiga yo'naltirish uchun ishlatadi.
  return { 'X-Telegram-Init-Data': getInitData() };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `So'rov xatosi: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
