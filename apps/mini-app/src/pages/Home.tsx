import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Sparkles, PlusCircle, Users, ChevronRight, ClipboardList } from 'lucide-react';
import { apiClient } from '../api/client';
import { CampaignCard } from '../components/CampaignCard';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatCard } from '../components/ui/StatCard';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/Badge';
import { haptic } from '../lib/telegramUI';
import type { CampaignDto } from '@influencex/shared';

interface PaginatedCampaigns {
  items: CampaignDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

type MeResponse = { role: 'CREATOR' | 'BUSINESS' | 'ADMIN' | 'MODERATOR' };
type CampaignWithCount = CampaignDto & { _count?: { applications: number } };

// PRD v2 §4.3: kreator uchun ochiq (PUBLISHED) kampaniyalar ro'yxati.
// Feed sahifalangan (2026-07-11 unumdorlik tuzatishi) - "Yana ko'rsatish" tugmasi
// bilan bosqichma-bosqich yuklanadi, bir vaqtning o'zida yuzlab kampaniyani
// olib kelib UI'ni sekinlashtirmaydi.
// 2026-07-14: dizayn tizimi (ui/*) qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
//
// 2026-07-15 (kech, rol bo'yicha qayta ko'rib chiqish): avval bu sahifa rolidan
// qat'i nazar HAMMA foydalanuvchiga bir xil - boshqa bizneslarning kampaniya
// feedini - ko'rsatardi. Biznes uchun bu noto'g'ri "bosh sahifa": Collabstr'da
// biznes login qilgach to'g'ridan-to'g'ri qidiruv/harakatga yo'naltiriladi, boshqa
// birovning e'lonlar devoriga emas. Endi rol aniqlangach biznes uchun tezkor
// harakatlar (Kampaniya yaratish / Kreatorlarni ko'rish) + o'z faol kampaniyalari
// preview'i ko'rsatiladigan alohida boshlang'ich ekran chiqadi.
export default function Home() {
  const { t } = useTranslation();
  const [role, setRole] = useState<MeResponse['role'] | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<MeResponse>('/users/me')
      .then((me) => setRole(me.role))
      .catch(() => setRole(null))
      .finally(() => setRoleLoading(false));
  }, []);

  if (roleLoading) {
    return (
      <div className="p-4 pb-24">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return role === 'BUSINESS' ? <BusinessHome /> : <CreatorFeedHome />;
}

function BusinessHome() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<CampaignWithCount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<CampaignWithCount[]>('/campaigns/mine')
      .then(setCampaigns)
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false));
  }, []);

  const activeCount = campaigns.filter((c) => c.status === 'PUBLISHED' || c.status === 'IN_PROGRESS').length;
  const recent = campaigns.slice(0, 3);

  return (
    <div className="p-4 pb-24">
      <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">{t('home.businessGreeting')}</h1>
      <p className="text-sm text-ink-400 mt-0.5 mb-5">{t('home.businessSubtitle')}</p>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <Link to="/campaigns/new" onClick={() => haptic('light')}>
          <Card interactive className="h-full flex flex-col items-start gap-2">
            <span className="h-9 w-9 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center">
              <PlusCircle size={18} />
            </span>
            <span className="text-sm font-semibold text-ink-900">{t('home.createCampaign')}</span>
          </Card>
        </Link>
        <Link to="/creators" onClick={() => haptic('light')}>
          <Card interactive className="h-full flex flex-col items-start gap-2">
            <span className="h-9 w-9 rounded-full bg-accent-100 text-accent-600 flex items-center justify-center">
              <Users size={18} />
            </span>
            <span className="text-sm font-semibold text-ink-900">{t('home.browseCreatorsAction')}</span>
          </Card>
        </Link>
      </div>

      {!loading && campaigns.length > 0 && (
        <div className="mb-5">
          <StatCard label={t('home.activeCampaignsStat')} icon={<ClipboardList size={16} />} value={activeCount} tone="accent" />
        </div>
      )}

      {loading && (
        <>
          <CardSkeleton />
          <CardSkeleton />
        </>
      )}

      {!loading && campaigns.length === 0 && (
        <EmptyState
          icon={<Sparkles size={24} />}
          title={t('myCampaigns.empty')}
          action={
            <Link to="/campaigns/new" onClick={() => haptic('light')}>
              <Button icon={<PlusCircle size={16} />}>{t('home.createCampaign')}</Button>
            </Link>
          }
        />
      )}

      {recent.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
              {t('home.recentCampaignsTitle')}
            </h2>
            <Link to="/campaigns/mine" className="text-xs font-semibold text-accent-600" onClick={() => haptic('light')}>
              {t('home.seeAll')}
            </Link>
          </div>
          <div className="space-y-2.5">
            {recent.map((c) => (
              <Link key={c.id} to={`/campaigns/${c.id}/applicants`} onClick={() => haptic('light')}>
                <Card interactive>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink-900 text-[15px] truncate">{c.title}</p>
                      <p className="text-xs text-ink-400 mt-0.5">
                        {t('myCampaigns.applicants')}: {c._count?.applications ?? 0}
                      </p>
                    </div>
                    <StatusBadge status={c.status} />
                    <ChevronRight size={16} className="text-ink-300 shrink-0" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CreatorFeedHome() {
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
      <h1 className="text-2xl font-extrabold text-ink-900 tracking-tight">{t('home.title')}</h1>
      <p className="text-sm text-ink-400 mt-0.5 mb-5">{t('home.feedSubtitle')}</p>

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
