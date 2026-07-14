import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { CardSkeleton } from '../components/ui/Skeleton';

interface BusinessAnalyticsData {
  campaignsByStatus: Record<string, number>;
  applications: { total: number; accepted: number; acceptanceRate: number };
  topCreators: { creatorId: string; name: string; acceptedCount: number }[];
  cpa: { totalClicks: number; totalConversions: number; confirmedConversions: number; conversionRate: number };
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-2.5 text-center shadow-card">
      <div className="text-lg font-extrabold text-ink-900">{value}</div>
      <div className="text-[10px] text-ink-400 mt-0.5">{label}</div>
    </div>
  );
}

// PRD Business Dashboard "Analytics" - kampaniyalar holati bo'yicha taqsimot, zayavkalar
// qabul qilinish darajasi, eng ishonchli hamkor kreatorlar va CPA konversiya darajasi.
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
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
    <div className="p-4 pb-24">
      <PageHeader back title={t('analytics.title')} />

      {loading && (
        <>
          <CardSkeleton />
          <CardSkeleton />
        </>
      )}

      {data && (
        <>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">
            {t('analytics.campaignsByStatus')}
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            {Object.entries(data.campaignsByStatus).map(([status, count]) => (
              <MiniStat key={status} label={status} value={count} />
            ))}
          </div>

          <p className="text-xs text-ink-400 mb-5">
            {t('analytics.acceptanceRate')}: <strong className="text-ink-800">{data.applications.acceptanceRate}%</strong> (
            {data.applications.accepted}/{data.applications.total})
          </p>

          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">
            {t('analytics.cpaPerformance')}
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-5">
            <MiniStat label={t('analytics.clicks')} value={data.cpa.totalClicks} />
            <MiniStat label={t('analytics.conversions')} value={data.cpa.confirmedConversions} />
            <MiniStat label={t('analytics.conversionRate')} value={`${data.cpa.conversionRate}%`} />
          </div>

          {data.topCreators.length > 0 && (
            <>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">
                {t('analytics.topCreators')}
              </h2>
              <div className="space-y-2">
                {data.topCreators.map((c) => (
                  <Card key={c.creatorId} className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-ink-900">{c.name}</span>
                    <span className="text-xs text-ink-400">
                      {c.acceptedCount} {t('analytics.acceptedCampaigns')}
                    </span>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
