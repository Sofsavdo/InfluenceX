import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Star, ChevronRight, ClipboardList } from 'lucide-react';
import { apiClient } from '../api/client';
import type { CampaignDto } from '@influencex/shared';
import { CampaignStatus } from '@influencex/shared';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

type CampaignWithCount = CampaignDto & { _count?: { applications: number } };

const NEXT_STATUS: Partial<Record<CampaignStatus, CampaignStatus>> = {
  [CampaignStatus.DRAFT]: CampaignStatus.PUBLISHED,
  [CampaignStatus.PUBLISHED]: CampaignStatus.IN_PROGRESS,
  [CampaignStatus.IN_PROGRESS]: CampaignStatus.COMPLETED,
};

// PRD Business Dashboard "Active Campaigns" - biznesning barcha kampaniyalari
// (DRAFT holatidagilar ham) ro'yxati. 2026-07-11 qo'shildi - avval bu sahifa
// mavjud emas edi, biznes o'z kampaniyalarini faqat ommaviy feedda tasodifan
// topgandan keyingina boshqara olardi. Shu yerdan status o'zgartirish (nashr
// qilish/yakunlash/bekor qilish) va "Featured" qilib belgilash mumkin.
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
export default function MyCampaigns() {
  const { t } = useTranslation();
  const [campaigns, setCampaigns] = useState<CampaignWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiClient
      .get<CampaignWithCount[]>('/campaigns/mine')
      .then(setCampaigns)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function advance(campaignId: string, nextStatus: CampaignStatus) {
    setActingId(campaignId);
    setError(null);
    try {
      await apiClient.patch(`/campaigns/${campaignId}/status`, { status: nextStatus });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function cancel(campaignId: string) {
    if (!window.confirm(t('myCampaigns.cancelConfirm') as string)) return;
    await advance(campaignId, CampaignStatus.CANCELLED);
  }

  async function feature(campaignId: string) {
    setActingId(campaignId);
    setError(null);
    try {
      await apiClient.post(`/campaigns/${campaignId}/feature`, { days: 7 });
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className="p-4 pb-24">
      <PageHeader
        back
        title={t('myCampaigns.title')}
        action={
          // PRD kelajak reja "Shop Integrations" - yengil versiya (2026-07-12)
          <Link to="/products" className="tap-scale text-accent-600 text-sm font-medium inline-flex items-center gap-0.5">
            {t('products.title')}
            <ChevronRight size={14} />
          </Link>
        }
      />

      {error && <p className="text-danger-text text-sm mb-3">{error}</p>}

      {loading && (
        <>
          <CardSkeleton />
          <CardSkeleton />
        </>
      )}

      {!loading && campaigns.length === 0 && (
        <EmptyState
          icon={<ClipboardList size={24} />}
          title={t('myCampaigns.empty')}
          action={
            <Link to="/campaigns/new">
              <Button size="sm">{t('createCampaign.title')}</Button>
            </Link>
          }
        />
      )}

      <div className="space-y-3">
        {campaigns.map((c) => {
          const nextStatus = NEXT_STATUS[c.status];
          const isFeaturedActive = c.isFeatured && c.featuredUntil && new Date(c.featuredUntil) > new Date();
          return (
            <Card key={c.id}>
              <div className="flex justify-between items-start gap-2">
                <Link to={`/campaigns/${c.id}`} className="font-semibold text-ink-900 text-[15px]">
                  {c.title}
                </Link>
                <StatusBadge status={c.status} />
              </div>
              <p className="text-xs text-ink-400 mt-1">
                {t('myCampaigns.applicants')}: {c._count?.applications ?? 0}
              </p>
              {isFeaturedActive && (
                <p className="text-xs text-warning-text mt-1 flex items-center gap-1">
                  <Star size={12} className="fill-warning-dot text-warning-dot" />
                  {t('myCampaigns.featuredUntil')} {new Date(c.featuredUntil as string).toLocaleDateString()}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                {nextStatus && (
                  <Button size="sm" loading={actingId === c.id} onClick={() => advance(c.id, nextStatus)}>
                    {t(`myCampaigns.advanceTo.${nextStatus.toLowerCase()}`)}
                  </Button>
                )}
                {c.status !== CampaignStatus.COMPLETED && c.status !== CampaignStatus.CANCELLED && (
                  <Button size="sm" variant="secondary" disabled={actingId === c.id} onClick={() => cancel(c.id)}>
                    {t('myCampaigns.cancel')}
                  </Button>
                )}
                {c.status === CampaignStatus.PUBLISHED && !isFeaturedActive && (
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Star size={13} />}
                    disabled={actingId === c.id}
                    onClick={() => feature(c.id)}
                  >
                    {t('myCampaigns.feature')}
                  </Button>
                )}
                <Link to={`/campaigns/${c.id}/applicants`}>
                  <Button size="sm" variant="secondary">
                    {t('applicants.viewApplicants')}
                  </Button>
                </Link>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
