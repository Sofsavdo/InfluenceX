import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import type { ConversionDto } from '@influencex/shared';
import { ConversionStatus, ConversionType } from '@influencex/shared';

interface ConversionsPanelProps {
  applicationId: string;
  currency: string;
  // Biznes: konversiya qayd etadi + tasdiqlaydi/rad etadi. Kreator: faqat ro'yxatni ko'radi.
  isBusiness: boolean;
}

// PRD "CPA (Cost Per Action)": "10,000 UZS per successful sale" - kampaniya CPA yoki
// HYBRID modelida bo'lganda, biznes har bir haqiqiy konversiyani (sotuv/lid/ro'yxatdan
// o'tish/obuna) shu yerda qayd etadi, so'ng tasdiqlaydi. Click'da avtomatik chiqim
// API'si yo'q (escrow bilan bir xil cheklov) - moderator keyin qo'lda to'laydi.
export function ConversionsPanel({ applicationId, currency, isBusiness }: ConversionsPanelProps) {
  const { t } = useTranslation();
  const [conversions, setConversions] = useState<ConversionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<ConversionType>(ConversionType.SALE);
  const [amount, setAmount] = useState('');
  const [trackingRef, setTrackingRef] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    apiClient
      .get<ConversionDto[]>(`/applications/${applicationId}/conversions`)
      .then(setConversions)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }

  useEffect(load, [applicationId]);

  async function report() {
    if (!amount || Number(amount) <= 0) return;
    setActingId('__report__');
    setError(null);
    try {
      await apiClient.post(`/applications/${applicationId}/conversions`, {
        type,
        amount: Number(amount),
        trackingRef: trackingRef || undefined,
      });
      setAmount('');
      setTrackingRef('');
      setShowForm(false);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function confirm(id: string) {
    setActingId(id);
    setError(null);
    try {
      await apiClient.patch(`/conversions/${id}/confirm`);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActingId(null);
    }
  }

  async function reject(id: string) {
    setActingId(id);
    setError(null);
    try {
      await apiClient.patch(`/conversions/${id}/reject`, {});
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActingId(null);
    }
  }

  const confirmedTotal = conversions
    .filter((c) => c.status === ConversionStatus.CONFIRMED)
    .reduce((sum, c) => sum + c.payoutAmount, 0);

  if (loading) return <p className="text-xs text-tg-hint mt-2">{t('common.loading')}</p>;

  return (
    <div className="mt-3 rounded-lg bg-tg-secondaryBg/40 p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold">{t('conversions.title')}</span>
        {confirmedTotal > 0 && (
          <span className="text-xs text-tg-hint">
            {t('conversions.confirmedTotal')}: {confirmedTotal.toLocaleString()} {currency}
          </span>
        )}
      </div>

      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

      {conversions.length === 0 && (
        <p className="text-xs text-tg-hint">{t('conversions.empty')}</p>
      )}

      <div className="space-y-2">
        {conversions.map((c) => (
          <div key={c.id} className="rounded-lg border border-tg-secondaryBg px-3 py-2">
            <div className="flex justify-between items-center text-sm">
              <span>{t(`conversions.type.${c.type.toLowerCase()}`)}</span>
              <span className="font-medium">{c.amount.toLocaleString()} {currency}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-tg-hint">
                {t('conversions.payout')}: {c.payoutAmount.toLocaleString()} {currency}
                {c.paidAt ? ` · ${t('conversions.paid')}` : ''}
              </span>
              <span className="text-xs rounded-full bg-tg-secondaryBg px-2 py-0.5">
                {t(`conversions.status.${c.status.toLowerCase()}`)}
              </span>
            </div>
            {isBusiness && c.status === ConversionStatus.PENDING && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => confirm(c.id)}
                  disabled={actingId === c.id}
                  className="flex-1 rounded-lg bg-green-600 text-white py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {t('conversions.confirm')}
                </button>
                <button
                  onClick={() => reject(c.id)}
                  disabled={actingId === c.id}
                  className="flex-1 rounded-lg border border-tg-secondaryBg py-1.5 text-xs disabled:opacity-50"
                >
                  {t('conversions.reject')}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isBusiness && (
        <div className="mt-3">
          {!showForm ? (
            <button onClick={() => setShowForm(true)} className="text-xs text-tg-link">
              + {t('conversions.report')}
            </button>
          ) : (
            <div className="rounded-lg border border-dashed border-tg-secondaryBg p-2 space-y-2">
              <select
                className="w-full rounded-lg border border-tg-secondaryBg px-2 py-1.5 text-xs"
                value={type}
                onChange={(e) => setType(e.target.value as ConversionType)}
              >
                {Object.values(ConversionType).map((v) => (
                  <option key={v} value={v}>
                    {t(`conversions.type.${v.toLowerCase()}`)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={0}
                className="w-full rounded-lg border border-tg-secondaryBg px-2 py-1.5 text-xs"
                placeholder={t('conversions.amountField') as string}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <input
                className="w-full rounded-lg border border-tg-secondaryBg px-2 py-1.5 text-xs"
                placeholder={t('conversions.trackingRefField') as string}
                value={trackingRef}
                onChange={(e) => setTrackingRef(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  onClick={report}
                  disabled={actingId === '__report__' || !amount}
                  className="flex-1 rounded-lg bg-tg-button text-tg-buttonText py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {t('conversions.submit')}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-tg-secondaryBg px-3 py-1.5 text-xs"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
