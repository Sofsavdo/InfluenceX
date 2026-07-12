import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';

interface RatingFormProps {
  campaignId: string;
  targetUserId: string;
  onDone: () => void;
}

interface HasRatedResponse {
  rated: boolean;
}

// PRD "Reputation System" (Creator Score / Business Score) - 2026-07-12 qo'shildi.
// Avval bu funksiya uchun backend (ratings.service.ts/ratings.controller.ts) to'liq tayyor
// edi, lekin Mini App'da hech qanday UI yo'q edi - hamkorlik RELEASED bo'lgandan keyin
// tomonlar bir-birini baholay olmasdi, shuning uchun reputatsiya tizimi hech qachon haqiqiy
// ma'lumot bilan to'lmasdi (creatorScore/businessScore doim standart 0 qolardi).
// Escrow RELEASED bo'lgach ikkala tomonda ham (Applications.tsx - kreator biznesni baholaydi,
// CampaignApplicants.tsx - biznes kreatorni baholaydi) shu komponent ko'rsatiladi.
export function RatingForm({ campaignId, targetUserId, onDone }: RatingFormProps) {
  const { t } = useTranslation();
  const [alreadyRated, setAlreadyRated] = useState<boolean | null>(null);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<HasRatedResponse>(`/ratings/mine/has-rated?campaignId=${encodeURIComponent(campaignId)}`)
      .then((res) => setAlreadyRated(res.rated))
      .catch(() => setAlreadyRated(false));
  }, [campaignId]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post('/ratings', { targetUserId, campaignId, score, comment: comment || undefined });
      setSubmitted(true);
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (alreadyRated === null) return null;
  if (alreadyRated || submitted) {
    return <p className="text-xs text-tg-hint mt-2">✓ {t('ratings.alreadyRated')}</p>;
  }

  return (
    <div className="rounded-xl border border-tg-secondaryBg bg-tg-secondaryBg/30 p-3 mt-2">
      <p className="text-sm font-semibold mb-1">{t('ratings.rateTitle')}</p>
      <p className="text-xs text-tg-hint mb-2">{t('ratings.rateHint')}</p>

      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setScore(n)}
            className={`text-2xl leading-none ${n <= score ? 'opacity-100' : 'opacity-30'}`}
            aria-label={`${n}`}
          >
            ⭐
          </button>
        ))}
      </div>

      <textarea
        className="w-full rounded-lg border border-tg-secondaryBg p-2 text-sm mb-2"
        rows={2}
        placeholder={t('ratings.commentPlaceholder') as string}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {error && <p className="text-red-600 text-xs mb-2">{error}</p>}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full rounded-lg bg-tg-button text-tg-buttonText py-2 text-sm font-semibold disabled:opacity-50"
      >
        {submitting ? t('common.loading') : t('ratings.submit')}
      </button>
    </div>
  );
}
