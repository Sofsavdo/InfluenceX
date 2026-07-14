import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Paperclip, Send, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { getChatSocket } from '../lib/socket';
import { uploadFile } from '../lib/upload';
import { PageHeader } from '../components/ui/PageHeader';
import { Skeleton } from '../components/ui/Skeleton';

interface ChatMessage {
  id: string;
  senderId: string;
  body?: string;
  attachmentUrl?: string | null;
  createdAt: string;
}

interface ThreadResponse {
  id: string;
  messages: ChatMessage[];
}

function isImageUrl(url: string): boolean {
  return /\.(jpe?g|png|webp|gif)$/i.test(url);
}

// PRD v2 §4.6: real-vaqt chat - dastlabki tarix REST orqali yuklanadi,
// keyingi xabarlar apps/api/src/chat/chat.gateway.ts WebSocket orqali keladi.
// Ilova/fayl (attachmentUrl) S3'ga to'g'ridan-to'g'ri yuklanadi (lib/upload.ts) -
// nizo yuzaga kelganda moderator shu dalillarni ko'rib chiqadi (PRD v2 §Escrow).
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
export default function ChatThread() {
  const { threadId } = useParams<{ threadId: string }>();
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!threadId) return;

    Promise.all([
      apiClient.get<ThreadResponse>(`/chat/thread/${threadId}`),
      apiClient.get<{ id: string }>('/users/me'),
    ])
      .then(([thread, me]) => {
        setMessages(thread.messages);
        setMyUserId(me.id);
      })
      .finally(() => setLoading(false));

    const socket = getChatSocket();
    socket.emit('joinThread', threadId);

    const onNewMessage = (message: ChatMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
    };
    socket.on('newMessage', onNewMessage);

    return () => {
      socket.off('newMessage', onNewMessage);
    };
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send() {
    if (!threadId || !text.trim()) return;
    // userId endi yuborilmaydi - server socket handshake'dagi tasdiqlangan
    // initData'dan foydalanuvchini o'zi aniqlaydi (chat.gateway.ts).
    getChatSocket().emit('sendMessage', { threadId, body: text });
    setText('');
  }

  async function onFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !threadId) return;

    setAttachError(null);
    setUploadingFile(true);
    try {
      const attachmentUrl = await uploadFile(file, 'chat-attachment');
      getChatSocket().emit('sendMessage', { threadId, attachmentUrl });
    } catch (err) {
      setAttachError((err as Error).message);
    } finally {
      setUploadingFile(false);
    }
  }

  if (loading) {
    return (
      <div className="p-4 pb-24">
        <Skeleton className="h-6 w-1/3 mb-5" />
        <Skeleton className="h-10 w-2/3 mb-2" />
        <Skeleton className="h-10 w-1/2 ml-auto mb-2" />
        <Skeleton className="h-10 w-3/5" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full pb-20">
      <div className="px-4 pt-4">
        <PageHeader back title={t('nav.chat')} />
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-2xl px-3.5 py-2.5 text-sm max-w-[80%] leading-relaxed break-words ${
              m.senderId === myUserId
                ? 'bg-accent-500 text-white ml-auto rounded-br-md'
                : 'bg-ink-100 text-ink-900 rounded-bl-md'
            }`}
          >
            {m.body && <p>{m.body}</p>}
            {m.attachmentUrl && isImageUrl(m.attachmentUrl) && (
              <img src={m.attachmentUrl} alt="" className="mt-1 rounded-xl max-w-full" />
            )}
            {m.attachmentUrl && !isImageUrl(m.attachmentUrl) && (
              <a
                href={m.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block underline text-sm"
              >
                {t('chat.attachment')}
              </a>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {attachError && <p className="text-danger-text text-xs px-4">{attachError}</p>}
      <div className="flex gap-2 p-3 border-t border-ink-100">
        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFile}
          className="tap-scale h-[42px] w-[42px] shrink-0 rounded-xl border border-ink-200 flex items-center justify-center text-ink-500 disabled:opacity-50"
          title={t('chat.attach') as string}
        >
          {uploadingFile ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
        </button>
        <input
          className="flex-1 rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 outline-none transition-shadow focus:border-accent-400 focus:ring-4 focus:ring-accent-100"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t('common.send') as string}
        />
        <button
          onClick={send}
          className="tap-scale h-[42px] w-[42px] shrink-0 rounded-xl bg-accent-500 text-white flex items-center justify-center hover:bg-accent-600"
          aria-label={t('common.send') as string}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
