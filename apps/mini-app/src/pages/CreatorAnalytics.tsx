import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Star } from 'lucide-react';
import { apiClient } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { CardSkeleton } from '../components/ui/Skeleton';

interface CreatorAnalyticsData {
  applications: { total: number; accepted: number; rejected: number; pending: number; acceptanceRate: number };
  campaignsCompleted: number;
  profile: { followers: number; engagementRate: number; rating: number; creatorScore: number };
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

// PRD Creator Dashboard "Analytics" - haqiqiy DB yozuvlaridan hisoblangan zayavkalar
// funneli, tugatilgan kampaniyalar soni va CPA bosish/konversiya darajasi.
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
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
            {t('analytics.applicationsFunnel')}
          </h2>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <MiniStat label={t('applicants.status.pending')} value={data.applications.pending} />
            <MiniStat label={t('applicants.status.accepted')} value={data.applications.accepted} />
            <MiniStat label={t('applicants.status.rejected')} value={data.applications.rejected} />
            <MiniStat label={t('analytics.total')} value={data.applications.total} />
          </div>
          <p className="text-xs text-ink-400 mb-5">
            {t('analytics.acceptanceRate')}:{' '}
            <strong className="text-ink-800">{data.applications.acceptanceRate}%</strong>
          </p>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <StatCard
              label={t('analytics.campaignsCompleted')}
              icon={<Award size={16} />}
              value={data.campaignsCompleted}
            />
            <StatCard label={t('profile.rating')} icon={<Star size={16} />} value={data.profile.rating.toFixed(1)} />
          </div>

          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">
            {t('analytics.cpaPerformance')}
          </h2>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <MiniStat label={t('analytics.clicks')} value={data.cpa.totalClicks} />
            <MiniStat label={t('analytics.conversions')} value={data.cpa.confirmedConversions} />
            <MiniStat label={t('analytics.conversionRate')} value={`${data.cpa.conversionRate}%`} />
          </div>
        </>
      )}
    </div>
  );
}
