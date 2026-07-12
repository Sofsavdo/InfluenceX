import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { apiClient } from '../api/client';

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
    <div className="p-4 pb-20">
      <Link to="/profile" className="text-tg-link text-sm">
        ← {t('nav.profile')}
      </Link>
      <h1 className="text-xl font-bold mt-1 mb-4">{t('earnings.title')}</h1>

      {loading && <p className="text-tg-hint">{t('common.loading')}</p>}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-tg-secondaryBg p-4">
              <p className="text-xs text-tg-hint mb-1">{t('earnings.totalEarned')}</p>
              <p className="text-lg font-bold">
                {summary.totalEarned.toLocaleString()} <span className="text-xs font-normal">{summary.currency}</span>
              </p>
            </div>
            <div className="rounded-xl border border-tg-secondaryBg p-4">
              <p className="text-xs text-tg-hint mb-1">{t('earnings.pending')}</p>
              <p className="text-lg font-bold">
                {summary.pending.toLocaleString()} <span className="text-xs font-normal">{summary.currency}</span>
              </p>
            </div>
          </div>

          <h2 className="text-sm font-semibold text-tg-hint mb-2">{t('earnings.history')}</h2>
          {summary.transactions.length === 0 && <p className="text-tg-hint text-sm">{t('earnings.empty')}</p>}
          <div className="space-y-2">
            {summary.transactions.map((tx, i) => (
              <div key={i} className="rounded-xl border border-tg-secondaryBg p-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium">{tx.campaignTitle}</p>
                  <p className="text-xs text-tg-hint">
                    {new Date(tx.date).toLocaleDateString()} ·{' '}
                    {tx.type === 'escrow' ? t('earnings.typeEscrow') : t('earnings.typeConversion')}
                  </p>
                </div>
                <span className="font-semibold text-green-600">
                  +{tx.amount.toLocaleString()} {tx.currency}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
