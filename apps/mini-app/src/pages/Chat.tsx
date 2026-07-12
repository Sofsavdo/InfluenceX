import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';

interface ChatMessage {
  id: string;
  senderId: string;
  body?: string;
  createdAt: string;
}

// PRD v2 §4.6: Mini App ichidagi chat. Bu MVP versiyasi REST orqali (poll asosida);
// ishlab chiqarishda apps/api/src/chat/chat.gateway.ts orqali WebSocket'ga ulanadi
// (socket.io-client bilan — hozircha o'rnatilmagan, keyingi bosqichda qo'shiladi).
export default function Chat() {
  const { t } = useTranslation();
  const [threadId] = useState<string | null>(null); // TODO: applications ro'yxatidan tanlash UI
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadId) return;
    apiClient.get<{ messages: ChatMessage[] }>(`/chat/thread/${threadId}`).then((t) => setMessages(t.messages));
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    if (!threadId || !text.trim()) return;
    const message = await apiClient.post<ChatMessage>('/chat/message', { threadId, body: text });
    setMessages((prev) => [...prev, message]);
    setText('');
  }

  if (!threadId) {
    return (
      <div className="p-4 pb-20">
        <h1 className="text-xl font-bold mb-4">{t('nav.chat')}</h1>
        <p className="text-tg-hint">
          Suhbat kampaniya zayavkasi qabul qilingandan so'ng ochiladi. "{t('nav.applications')}" bo'limidan tegishli
          kampaniyani tanlang.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-20">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className="rounded-lg bg-tg-secondaryBg p-2 text-sm max-w-[80%]">
            {m.body}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex gap-2 p-3 border-t border-tg-secondaryBg">
        <input
          className="flex-1 rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('common.send') as string}
        />
        <button onClick={send} className="rounded-lg bg-tg-button text-tg-buttonText px-4 py-2 text-sm font-semibold">
          {t('common.send')}
        </button>
      </div>
    </div>
  );
}
