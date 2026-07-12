import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { uploadFile } from '../lib/upload';

interface PortfolioItem {
  id: string;
  mediaUrl: string;
  caption?: string | null;
  createdAt: string;
}

function isVideo(url: string) {
  return /\.(mp4|mov|webm)$/i.test(url);
}

// PRD "Creator Profiles" -> portfolio maydoni / "Creator Dashboard" -> "Portfolio" sahifasi.
// Kreator ilgari qilgan ishlaridan namunalar qo'shadi - biznes zayavkachini ko'rib chiqishda
// (yoki AI Matching orqali tavsiya etilganda) shu namunalarga qarab baholaydi.
export default function Portfolio() {
  const { t } = useTranslation();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    setLoading(true);
    apiClient
      .get<PortfolioItem[]>('/portfolio/mine')
      .then(setItems)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function onFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const mediaUrl = await uploadFile(file, 'portfolio');
      await apiClient.post('/portfolio', { mediaUrl, caption: caption || undefined });
      setCaption('');
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm(t('portfolio.deleteConfirm') as string)) return;
    setDeletingId(id);
    setError(null);
    try {
      await apiClient.delete(`/portfolio/${id}`);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-4 pb-20">
      <Link to="/profile" className="text-tg-link text-sm">
        ← {t('nav.profile')}
      </Link>
      <h1 className="text-xl font-bold mt-1 mb-1">{t('portfolio.title')}</h1>
      <p className="text-xs text-tg-hint mb-4">{t('portfolio.hint')}</p>

      <div className="rounded-xl border border-dashed border-tg-secondaryBg p-4 mb-4">
        <input
          className="w-full rounded-lg border border-tg-secondaryBg px-3 py-2 text-sm mb-2"
          placeholder={t('portfolio.captionPlaceholder') as string}
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          className="hidden"
          onChange={onFileSelected}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-lg bg-tg-button text-tg-buttonText py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {uploading ? t('common.loading') : `+ ${t('portfolio.addItem')}`}
        </button>
        {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
      </div>

      {loading && <p className="text-tg-hint">{t('common.loading')}</p>}
      {!loading && items.length === 0 && <p className="text-tg-hint">{t('portfolio.empty')}</p>}

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-tg-secondaryBg overflow-hidden">
            {isVideo(item.mediaUrl) ? (
              <video src={item.mediaUrl} className="w-full aspect-square object-cover" controls />
            ) : (
              <img src={item.mediaUrl} alt={item.caption ?? ''} className="w-full aspect-square object-cover" />
            )}
            <div className="p-2">
              {item.caption && <p className="text-xs truncate">{item.caption}</p>}
              <button
                onClick={() => remove(item.id)}
                disabled={deletingId === item.id}
                className="text-red-600 text-xs mt-1 disabled:opacity-50"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
