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

interface PaymentsSummary {
  totalSpent: number;
  pending: number;
  currency: string;
  transactions: TransactionRow[];
}

// PRD Business Dashboard "Payments" sahifasi - biznes barcha kampaniyalari bo'yicha
// jami sarflagan (RELEASED escrow + to'langan CPA konversiyalar) va kutilayotgan
// (AWAITING_DEPOSIT/HELD/RELEASE_PENDING + PENDING/CONFIRMED konversiyalar) mablag'larni ko'radi.
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
export default function Payments() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get<PaymentsSummary>('/earnings/business')
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 pb-24">
      <PageHeader back title={t('payments.title')} />

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
              label={t('payments.totalSpent')}
              icon={<Wallet size={16} />}
              tone="accent"
              value={
                <>
                  {summary.totalSpent.toLocaleString()}{' '}
                  <span className="text-xs font-semibold">{summary.currency}</span>
                </>
              }
            />
            <StatCard
              label={t('payments.pending')}
              icon={<Clock size={16} />}
              value={
                <>
                  {summary.pending.toLocaleString()}{' '}
                  <span className="text-xs font-semibold text-ink-400">{summary.currency}</span>
                </>
              }
            />
          </div>

          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400 mb-2">{t('payments.history')}</h2>
          {summary.transactions.length === 0 && (
            <EmptyState icon={<Receipt size={22} />} title={t('payments.empty')} />
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
                <span className="font-semibold text-ink-900 shrink-0">
                  -{tx.amount.toLocaleString()} {tx.currency}
                </span>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
