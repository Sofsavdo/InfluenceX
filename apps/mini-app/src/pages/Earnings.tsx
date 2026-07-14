import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wallet, Clock, Receipt } from 'lucide-react';
import { apiClient } from '../api/client';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { CardSkeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { Card } from '../components/ui/Card';

interface TransactionRow {
  type: 'escrow' | 'conversion';
  campaignTitle: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
}

interface EarningsSummary {
  totalEarned: number;
  pending: number;
  currency: string;
  transactions: TransactionRow[];
}

// PRD Creator Dashboard "Earnings" sahifasi - kreator jami ishlab topgan (RELEASED escrow
// + to'langan CPA konversiyalar) va kutilayotgan (HELD/RELEASE_PENDING + CONFIRMED
// konversiyalar) mablag'larni ko'radi.
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
export default function Earnings() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<EarningsSummary>('/earnings/creator')
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 pb-24">
      <PageHeader back title={t('earnings.title')} />

      {loading && (
        <>
          <CardSkeleton />
          <CardSkeleton />
        </>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <StatCard
              label={t('earnings.totalEarned')}
              icon={<Wallet size={16} />}
              tone="accent"
              value={
                <>
                  {summary.totalEarned.toLocaleString()}{' '}
                  <span className="text-xs font-semibold">{summary.currency}</span>
                </>
              }
            />
            <StatCard
              label={t('earnings.pending')}
              icon={<Clock size={16} />}
              value={
                <>
                  {summary.pending.toLocaleString()}{' '}
                  <span className="text-xs font-semibold text-ink-400">{summary.currency}</span>
                </>
              }
            />
          </div>

          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">{t('earnings.history')}</h2>
          {summary.transactions.length === 0 && (
            <EmptyState icon={<Receipt size={22} />} title={t('earnings.empty')} />
          )}
          <div className="space-y-2.5">
            {summary.transactions.map((tx, i) => (
              <Card key={i} className="flex justify-between items-center">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">{tx.campaignTitle}</p>
                  <p className="text-xs text-ink-400 mt-0.5">
                    {new Date(tx.date).toLocaleDateString()} ·{' '}
                    {tx.type === 'escrow' ? t('earnings.typeEscrow') : t('earnings.typeConversion')}
                  </p>
                </div>
                <span className="font-semibold text-success-text shrink-0">
                  +{tx.amount.toLocaleString()} {tx.currency}
                </span>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
