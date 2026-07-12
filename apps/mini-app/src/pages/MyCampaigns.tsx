import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { CampaignDto } from '@influencex/shared';
import { CampaignStatus } from '@influencex/shared';

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
    <div className="p-4 pb-20">
      <div className="flex justify-between items-center">
        <Link to="/profile" className="text-tg-link text-sm">
          ← {t('nav.profile')}
        </Link>
        {/* PRD kelajak reja "Shop Integrations" - yengil versiya (2026-07-12) */}
        <Link to="/products" className="text-tg-link text-sm">
          {t('products.title')} →
        </Link>
      </div>
      <h1 className="text-xl font-bold mt-1 mb-4">{t('myCampaigns.title')}</h1>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
      {loading && <p className="text-tg-hint">{t('common.loading')}</p>}
      {!loading && campaigns.length === 0 && (
        <p className="text-tg-hint">
          {t('myCampaigns.empty')}{' '}
          <Link to="/campaigns/new" className="text-tg-link">
            {t('createCampaign.title')}
          </Link>
        </p>
      )}

      <div className="space-y-3">
        {campaigns.map((c) => {
          const nextStatus = NEXT_STATUS[c.status];
          const isFeaturedActive = c.isFeatured && c.featuredUntil && new Date(c.featuredUntil) > new Date();
          return (
            <div key={c.id} className="rounded-xl border border-tg-secondaryBg p-4">
              <div className="flex justify-between items-start gap-2">
                <Link to={`/campaigns/${c.id}`} className="font-semibold">
                  {c.title}
                </Link>
                <span className="text-xs rounded-full bg-tg-secondaryBg px-2 py-1 shrink-0">{c.status}</span>
              </div>
              <p className="text-xs text-tg-hint mt-1">
                {t('myCampaigns.applicants')}: {c._count?.applications ?? 0}
              </p>
              {isFeaturedActive && (
                <p className="text-xs text-yellow-600 mt-1">
                  ⭐ {t('myCampaigns.featuredUntil')} {new Date(c.featuredUntil as string).toLocaleDateString()}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mt-3">
                {nextStatus && (
                  <button
                    onClick={() => advance(c.id, nextStatus)}
                    disabled={actingId === c.id}
                    className="rounded-lg bg-tg-button text-tg-buttonText px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                  >
                    {t(`myCampaigns.advanceTo.${nextStatus.toLowerCase()}`)}
                  </button>
                )}
                {c.status !== CampaignStatus.COMPLETED && c.status !== CampaignStatus.CANCELLED && (
                  <button
                    onClick={() => cancel(c.id)}
                    disabled={actingId === c.id}
                    className="rounded-lg border border-tg-secondaryBg px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    {t('myCampaigns.cancel')}
                  </button>
                )}
                {c.status === CampaignStatus.PUBLISHED && !isFeaturedActive && (
                  <button
                    onClick={() => feature(c.id)}
                    disabled={actingId === c.id}
                    className="rounded-lg border border-yellow-400 text-yellow-700 px-3 py-1.5 text-xs disabled:opacity-50"
                  >
                    ⭐ {t('myCampaigns.feature')}
                  </button>
                )}
                <Link
                  to={`/campaigns/${c.id}/applicants`}
                  className="rounded-lg border border-tg-secondaryBg px-3 py-1.5 text-xs"
                >
                  {t('applicants.viewApplicants')}
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
