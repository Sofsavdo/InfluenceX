import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus } from 'lucide-react';
import { apiClient } from '../api/client';
import type { ConversionDto } from '@influencex/shared';
import {
  ConversionStatus,
  ConversionType,
} from '@influencex/shared';
import { Select, Input } from './ui/Field';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface ConversionsPanelProps {
  applicationId: string;
  currency: string;
  // Biznes: konversiya qayd etadi + tasdiqlaydi/rad etadi. Kreator: faqat ro'yxatni ko'radi.
  isBusiness: boolean;
}

const CONVERSION_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  [ConversionStatus.CONFIRMED]: 'success',
  [ConversionStatus.PENDING]: 'warning',
  [ConversionStatus.REJECTED]: 'danger',
};

// PRD "CPA (Cost Per Action)": "10,000 UZS per successful sale" - kampaniya CPA yoki
// HYBRID modelida bo'lganda, biznes har bir haqiqiy konversiyani (sotuv/lid/ro'yxatdan
// o'tish/obuna) shu yerda qayd etadi, so'ng tasdiqlaydi. Click'da avtomatik chiqim
// API'si yo'q (escrow bilan bir xil cheklov) - moderator keyin qo'lda to'laydi.
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
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

  if (loading) {
    return (
      <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-400">
        <Loader2 size={13} className="animate-spin" />
        {t('common.loading')}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl border border-ink-100 bg-ink-50 p-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-ink-900">{t('conversions.title')}</span>
        {confirmedTotal > 0 && (
          <span className="text-xs text-ink-400">
            {t('conversions.confirmedTotal')}: {confirmedTotal.toLocaleString()} {currency}
          </span>
        )}
      </div>

      {error && <p className="text-danger-text text-xs mb-2">{error}</p>}

      {conversions.length === 0 && (
        <p className="text-xs text-ink-400">{t('conversions.empty')}</p>
      )}

      <div className="space-y-2">
        {conversions.map((c) => (
          <div key={c.id} className="rounded-lg border border-ink-100 bg-white px-3 py-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-ink-800">{t(`conversions.type.${c.type.toLowerCase()}`)}</span>
              <span className="font-semibold text-ink-900">{c.amount.toLocaleString()} {currency}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-ink-400">
                {t('conversions.payout')}: {c.payoutAmount.toLocaleString()} {currency}
                {c.paidAt ? ` · ${t('conversions.paid')}` : ''}
              </span>
              <Badge tone={CONVERSION_TONE[c.status] ?? 'neutral'}>
                {t(`conversions.status.${c.status.toLowerCase()}`)}
              </Badge>
            </div>
            {isBusiness && c.status === ConversionStatus.PENDING && (
              <div className="flex gap-2 mt-2">
                <Button
                  size="sm"
                  full
                  loading={actingId === c.id}
                  onClick={() => confirm(c.id)}
                >
                  {t('conversions.confirm')}
                </Button>
                <Button
                  size="sm"
                  full
                  variant="secondary"
                  disabled={actingId === c.id}
                  onClick={() => reject(c.id)}
                >
                  {t('conversions.reject')}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {isBusiness && (
        <div className="mt-3">
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="tap-scale text-xs font-medium text-accent-600 inline-flex items-center gap-1"
            >
              <Plus size={13} />
              {t('conversions.report')}
            </button>
          ) : (
            <div className="rounded-lg border border-dashed border-ink-200 p-2.5 space-y-2 bg-white">
              <Select value={type} onChange={(e) => setType(e.target.value as ConversionType)}>
                {Object.values(ConversionType).map((v) => (
                  <option key={v} value={v}>
                    {t(`conversions.type.${v.toLowerCase()}`)}
                  </option>
                ))}
              </Select>
              <Input
                type="number"
                min={0}
                placeholder={t('conversions.amountField') as string}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <Input
                placeholder={t('conversions.trackingRefField') as string}
                value={trackingRef}
                onChange={(e) => setTrackingRef(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  full
                  loading={actingId === '__report__'}
                  disabled={!amount}
                  onClick={report}
                >
                  {t('conversions.submit')}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => setShowForm(false)}>
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
