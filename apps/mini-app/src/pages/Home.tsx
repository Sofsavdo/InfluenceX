import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { apiClient } from '../api/client';
import { CampaignCard } from '../components/CampaignCard';
import { Button } from '../components/ui/Button';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import type { CampaignDto } from '@influencex/shared';

interface PaginatedCampaigns {
  items: CampaignDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// PRD v2 §4.3: kreator uchun ochiq (PUBLISHED) kampaniyalar ro'yxati.
// Feed sahifalangan (2026-07-11 unumdorlik tuzatishi) - "Yana ko'rsatish" tugmasi
// bilan bosqichma-bosqich yuklanadi, bir vaqtning o'zida yuzlab kampaniyani
// olib kelib UI'ni sekinlashtirmaydi.
// 2026-07-14: dizayn tizimi (ui/*) qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
export default function Home() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<CampaignDto[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  function loadPage(nextPage: number, append: boolean) {
    const setter = append ? setLoadingMore : setLoading;
    setter(true);
    apiClient
      .get<PaginatedCampaigns>(`/campaigns?page=${nextPage}&pageSize=20`)
      .then((result) => {
        setCampaigns((prev) => (append ? [...prev, ...result.items] : result.items));
        setPage(result.page);
        setTotalPages(result.totalPages);
      })
      .finally(() => setter(false));
  }

  useEffect(() => {
    loadPage(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight mb-5">{t('home.title')}</h1>

      {loading && (
        <>
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </>
      )}

      {!loading && campaigns.length === 0 && (
        <EmptyState icon={<Sparkles size={24} />} title={t('home.empty')} />
      )}

      {campaigns.map((c) => (
        <CampaignCard key={c.id} campaign={c} />
      ))}

      {!loading && page < totalPages && (
        <Button variant="secondary" full loading={loadingMore} onClick={() => loadPage(page + 1, true)} className="mt-1">
          {t('home.loadMore')}
        </Button>
      )}
    </div>
  );
}
