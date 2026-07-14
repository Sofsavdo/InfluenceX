import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Star, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../api/client';
import { Textarea } from './ui/Field';
import { Button } from './ui/Button';

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
// 2026-07-14: dizayn tizimi qo'llanildi - mantiq/API chaqiruvlari o'zgarmagan.
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
    return (
      <p className="text-xs text-ink-400 mt-3 flex items-center gap-1.5">
        <CheckCircle2 size={13} className="text-success-dot" />
        {t('ratings.alreadyRated')}
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50 p-3 mt-3">
      <p className="text-sm font-semibold text-ink-900 mb-1">{t('ratings.rateTitle')}</p>
      <p className="text-xs text-ink-400 mb-2">{t('ratings.rateHint')}</p>

      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={() => setScore(n)} className="tap-scale" aria-label={`${n}`}>
            <Star
              size={26}
              className={n <= score ? 'text-warning-dot fill-warning-dot' : 'text-ink-200'}
            />
          </button>
        ))}
      </div>

      <div className="mb-2">
        <Textarea
          rows={2}
          placeholder={t('ratings.commentPlaceholder') as string}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      {error && <p className="text-danger-text text-xs mb-2">{error}</p>}

      <Button full size="sm" loading={submitting} onClick={submit}>
        {t('ratings.submit')}
      </Button>
    </div>
  );
}
