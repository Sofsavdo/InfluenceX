import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { getChatSocket } from '../lib/socket';
import { uploadFile } from '../lib/upload';

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

  if (loading) return <p className="p-4 text-tg-hint">{t('common.loading')}</p>;

  return (
    <div className="flex flex-col h-full pb-20">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`rounded-lg p-2 text-sm max-w-[80%] ${
              m.senderId === myUserId ? 'bg-tg-button text-tg-buttonText ml-auto' : 'bg-tg-secondaryBg'
            }`}
          >
            {m.body && <p>{m.body}</p>}
            {m.attachmentUrl && isImageUrl(m.attachmentUrl) && (
              <img src={m.attachmentUrl} alt="" className="mt-1 rounded max-w-full" />
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
      {attachError && <p className="text-red-600 text-xs px-3">{attachError}</p>}
      <div className="flex gap-2 p-3 border-t border-tg-secondaryBg">
        <input ref={fileInputRef} type="file" className="hidden" onChange={onFileSelected} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingFile}
          className="rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm disabled:opacity-50"
          title={t('chat.attach') as string}
        >
          {uploadingFile ? '…' : '📎'}
        </button>
        <input
          className="flex-1 rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder={t('common.send') as string}
        />
        <button onClick={send} className="rounded-lg bg-tg-button text-tg-buttonText px-4 py-2 text-sm font-semibold">
          {t('common.send')}
        </button>
      </div>
    </div>
  );
}
