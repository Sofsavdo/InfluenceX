import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { CampaignCard } from '../components/CampaignCard';
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
    <div className="p-4 pb-20">
      <h1 className="text-xl font-bold mb-4">{t('home.title')}</h1>
      {loading && <p className="text-tg-hint">{t('common.loading')}</p>}
      {!loading && campaigns.length === 0 && <p className="text-tg-hint">{t('home.empty')}</p>}
      {campaigns.map((c) => (
        <CampaignCard key={c.id} campaign={c} />
      ))}
      {!loading && page < totalPages && (
        <button
          onClick={() => loadPage(page + 1, true)}
          disabled={loadingMore}
          className="w-full rounded-lg border border-tg-secondaryBg py-2.5 text-sm font-semibold mt-2 disabled:opacity-50"
        >
          {loadingMore ? t('common.loading') : t('home.loadMore')}
        </button>
      )}
    </div>
  );
}
