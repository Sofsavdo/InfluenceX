import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

interface BusinessAnalyticsData {
  campaignsByStatus: Record<string, number>;
  applications: { total: number; accepted: number; acceptanceRate: number };
  topCreators: { creatorId: string; name: string; acceptedCount: number }[];
  cpa: { totalClicks: number; totalConversions: number; confirmedConversions: number; conversionRate: number };
}

// PRD Business Dashboard "Analytics" - kampaniyalar holati bo'yicha taqsimot, zayavkalar
// qabul qilinish darajasi, eng ishonchli hamkor kreatorlar va CPA konversiya darajasi.
export default function BusinessAnalytics() {
  const { t } = useTranslation();
  const [data, setData] = useState<BusinessAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<BusinessAnalyticsData>('/analytics/business')
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
          <h2 className="text-sm font-semibold text-tg-hint mb-2">{t('analytics.campaignsByStatus')}</h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.entries(data.campaignsByStatus).map(([status, count]) => (
              <div key={status} className="rounded-xl border border-tg-secondaryBg p-2 text-center">
                <div className="text-lg font-bold">{count}</div>
                <div className="text-[10px] text-tg-hint">{status}</div>
              </div>
            ))}
          </div>

          <p className="text-xs text-tg-hint mb-4">
            {t('analytics.acceptanceRate')}: <strong>{data.applications.acceptanceRate}%</strong> (
            {data.applications.accepted}/{data.applications.total})
          </p>

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

          {data.topCreators.length > 0 && (
            <>
              <h2 className="text-sm font-semibold text-tg-hint mb-2">{t('analytics.topCreators')}</h2>
              <div className="space-y-2">
                {data.topCreators.map((c) => (
                  <div
                    key={c.creatorId}
                    className="rounded-xl border border-tg-secondaryBg p-3 flex justify-between items-center"
                  >
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="text-xs text-tg-hint">
                      {c.acceptedCount} {t('analytics.acceptedCampaigns')}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
