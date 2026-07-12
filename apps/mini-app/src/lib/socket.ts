import { io, Socket } from 'socket.io-client';
import { getInitData } from './telegram';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1';
// WebSocket manzili REST bazasidan "/api/v1" qismisiz olinadi (chat.gateway.ts "/chat" namespace'da)
const WS_BASE_URL = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

let socket: Socket | null = null;

/**
 * apps/api/src/chat/chat.gateway.ts bilan bog'lanadi. Ulanish paytida Telegram
 * `initData` handshake `auth` maydonida yuboriladi — server uni HMAC bilan qayta
 * tasdiqlaydi va foydalanuvchi ID'ni socket'ga bog'laydi (spoofing imkonsiz,
 * 2026-07-11 xavfsizlik tuzatishi). Client endi xabar yuborishda userId
 * yubormaydi — server o'zi biladi.
 */
export function getChatSocket(): Socket {
  if (!socket) {
    socket = io(`${WS_BASE_URL}/chat`, {
      transports: ['websocket'],
      autoConnect: true,
      auth: { initData: getInitData() },
    });
  }
  return socket;
}

export function disconnectChatSocket() {
  socket?.disconnect();
  socket = null;
}
