import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

interface CreatorAnalyticsData {
  applications: { total: number; accepted: number; rejected: number; pending: number; acceptanceRate: number };
  campaignsCompleted: number;
  profile: { followers: number; engagementRate: number; rating: number; creatorScore: number };
  cpa: { totalClicks: number; totalConversions: number; confirmedConversions: number; conversionRate: number };
}

// PRD Creator Dashboard "Analytics" - haqiqiy DB yozuvlaridan hisoblangan zayavkalar
// funneli, tugatilgan kampaniyalar soni va CPA bosish/konversiya darajasi.
export default function CreatorAnalytics() {
  const { t } = useTranslation();
  const [data, setData] = useState<CreatorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<CreatorAnalyticsData>('/analytics/creator')
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 pb-20">
      <Link to="/profile" className="text-tg-link text-sm">
        ← {t('nav.profile')}
      </Link>
      <h1 className="text-xl font-bold mt-1 mb-4">{t('analytics.title')}</h1>

      {loading && <p className="text-tg-hint">{t('common.loading')}</p>}

      {data && (
        <>
          <h2 className="text-sm font-semibold text-tg-hint mb-2">{t('analytics.applicationsFunnel')}</h2>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { label: t('applicants.status.pending'), value: data.applications.pending },
              { label: t('applicants.status.accepted'), value: data.applications.accepted },
              { label: t('applicants.status.rejected'), value: data.applications.rejected },
              { label: t('analytics.total'), value: data.applications.total },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-tg-secondaryBg p-2 text-center">
                <div className="text-lg font-bold">{s.value}</div>
                <div className="text-[10px] text-tg-hint">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-xs text-tg-hint mb-4">
            {t('analytics.acceptanceRate')}: <strong>{data.applications.acceptanceRate}%</strong>
          </p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-tg-secondaryBg p-4">
              <p className="text-xs text-tg-hint mb-1">{t('analytics.campaignsCompleted')}</p>
              <p className="text-lg font-bold">{data.campaignsCompleted}</p>
            </div>
            <div className="rounded-xl border border-tg-secondaryBg p-4">
              <p className="text-xs text-tg-hint mb-1">{t('profile.rating')}</p>
              <p className="text-lg font-bold">{data.profile.rating.toFixed(1)}</p>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-tg-hint mb-2">{t('analytics.cpaPerformance')}</h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="rounded-xl border border-tg-secondaryBg p-2 text-center">
              <div className="text-lg font-bold">{data.cpa.totalClicks}</div>
              <div className="text-[10px] text-tg-hint">{t('analytics.clicks')}</div>
            </div>
            <div className="rounded-xl border border-tg-secondaryBg p-2 text-center">
              <div className="text-lg font-bold">{data.cpa.confirmedConversions}</div>
              <div className="text-[10px] text-tg-hint">{t('analytics.conversions')}</div>
            </div>
            <div className="rounded-xl border border-tg-secondaryBg p-2 text-center">
              <div className="text-lg font-bold">{data.cpa.conversionRate}%</div>
              <div className="text-[10px] text-tg-hint">{t('analytics.conversionRate')}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
