import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import type { CampaignDto } from '@influencex/shared';

type UserRole = 'CREATOR' | 'BUSINESS' | 'ADMIN' | 'MODERATOR';

interface MeResponse {
  role: UserRole;
  businessProfile?: {
    id: string;
  } | null;
}

// PRD v2 §4.3: kampaniya tafsilotlari.
// - Kreator uchun: "Zayavka berish" formasi.
// - Kampaniya egasi biznes uchun: forma o'rniga "Zayavkalarni ko'rish" havolasi.
//   Qabul/rad qilish CampaignApplicants.tsx sahifasida amalga oshiriladi.
export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();

  const [campaign, setCampaign] = useState<CampaignDto | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    if (id) {
      apiClient
        .get<CampaignDto>(`/campaigns/${id}`)
        .then(setCampaign)
        .catch(() => setCampaign(null));
    }

    apiClient
      .get<MeResponse>('/users/me')
      .then(setMe)
      .catch(() => setMe(null));
  }, [id]);

  async function submitApplication() {
    if (!id || submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await apiClient.post('/applications', {
        campaignId: id,
        message: message.trim() || undefined,
      });

      setApplied(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (!campaign) {
    return (
      <p className="p-4 text-tg-hint">
        {t('common.loading')}
      </p>
    );
  }

  const isOwner =
    me?.role === 'BUSINESS' &&
    me.businessProfile?.id === campaign.businessId;

  const canApply =
    me?.role === 'CREATOR' &&
    !isOwner &&
    !applied;

  return (
    <div className="p-4 pb-24">
      <h1 className="text-xl font-bold">
        {campaign.title}
      </h1>

      <p className="mt-2 text-sm text-tg-hint">
        {campaign.description}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-tg-hint">
            {t('home.budget')}
          </dt>

          <dd className="font-semibold">
            {campaign.budget.toLocaleString()} {campaign.currency}
          </dd>
        </div>

        <div>
          <dt className="text-tg-hint">
            {t('home.deadline')}
          </dt>

          <dd className="font-semibold">
            {new Date(campaign.deadline).toLocaleDateString()}
          </dd>
        </div>

        <div>
          <dt className="text-tg-hint">
            Hamkorlik modeli
          </dt>

          <dd className="font-semibold">
            {campaign.collaborationModel}
          </dd>
        </div>

        <div>
          <dt className="text-tg-hint">
            Kontent turi
          </dt>

          <dd className="font-semibold">
            {campaign.contentType}
          </dd>
        </div>
      </dl>

      {isOwner ? (
        <Link
          to={`/campaigns/${id}/applicants`}
          className="mt-6 block w-full rounded-lg bg-tg-button py-3 text-center font-semibold text-tg-buttonText"
        >
          {t('applicants.viewApplicants')}
        </Link>
      ) : canApply ? (
        <div className="mt-6">
          <textarea
            className="w-full rounded-lg border border-tg-secondaryBg p-3 text-sm"
            rows={3}
            placeholder="Qisqa xabar (ixtiyoriy)"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />

          <button
            type="button"
            onClick={submitApplication}
            disabled={submitting}
            className="mt-3 w-full rounded-lg bg-tg-button py-3 font-semibold text-tg-buttonText disabled:opacity-50"
          >
            {submitting ? t('common.loading') : t('home.apply')}
          </button>
        </div>
      ) : applied ? (
        <p className="mt-6 text-center font-semibold text-green-600">
          Zayavka yuborildi ✓
        </p>
      ) : (
        <p className="mt-6 text-center text-sm text-tg-hint">
          Bu kampaniyaga faqat kreator profilidan zayavka yuborish mumkin.
        </p>
      )}
    </div>
  );
}