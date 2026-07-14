import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Images } from 'lucide-react';
import { apiClient } from '../api/client';
import { uploadFile } from '../lib/upload';
import { PageHeader } from '../components/ui/PageHeader';
import { Input } from '../components/ui/Field';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { useTelegramBackButton } from '../lib/telegramUI';
import { ConfirmDialog } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';

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
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
export default function Portfolio() {
  const { t } = useTranslation();
  const toast = useToast();
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useTelegramBackButton();

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
      toast.success("Namuna qo'shildi");
      load();
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string) {
    setDeletingId(id);
    setError(null);
    try {
      await apiClient.delete(`/portfolio/${id}`);
      toast.success("Namuna o'chirildi");
      load();
    } catch (err) {
      setError((err as Error).message);
      toast.error((err as Error).message);
    } finally {
      setDeletingId(null);
      setConfirmTarget(null);
    }
  }

  return (
    <div className="p-4 pb-24">
      <PageHeader back title={t('portfolio.title')} subtitle={t('portfolio.hint')} />

      <div className="rounded-2xl border border-dashed border-ink-200 p-4 mb-5">
        <div className="mb-2">
          <Input
            placeholder={t('portfolio.captionPlaceholder') as string}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
          />
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          className="hidden"
          onChange={onFileSelected}
        />
        <Button full icon={<Plus size={16} />} loading={uploading} onClick={() => fileInputRef.current?.click()}>
          {t('portfolio.addItem')}
        </Button>
        {error && <p className="text-danger-text text-xs mt-2">{error}</p>}
      </div>

      {loading && (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="aspect-square rounded-2xl" />
          <Skeleton className="aspect-square rounded-2xl" />
        </div>
      )}

      {!loading && items.length === 0 && <EmptyState icon={<Images size={24} />} title={t('portfolio.empty')} />}

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-ink-100 overflow-hidden bg-surface shadow-card">
            {isVideo(item.mediaUrl) ? (
              <video src={item.mediaUrl} className="w-full aspect-square object-cover" controls />
            ) : (
              <img src={item.mediaUrl} alt={item.caption ?? ''} className="w-full aspect-square object-cover" />
            )}
            <div className="p-2.5">
              {item.caption && <p className="text-xs text-ink-600 truncate">{item.caption}</p>}
              <button
                onClick={() => setConfirmTarget(item.id)}
                disabled={deletingId === item.id}
                className="tap-scale text-danger-text text-xs mt-1.5 disabled:opacity-50 inline-flex items-center gap-1"
              >
                <Trash2 size={12} />
                {t('common.delete')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={() => confirmTarget && remove(confirmTarget)}
        title={t('common.delete') as string}
        description={t('portfolio.deleteConfirm') as string}
        confirmLabel={t('common.delete') as string}
        cancelLabel={t('common.cancel') as string}
        tone="danger"
        loading={deletingId === confirmTarget}
      />
    </div>
  );
}
